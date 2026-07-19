/**
 * game-registration-handler.ts
 *
 * Handles the conversational @bot mention → name → gender registration flow.
 *
 * Flow:
 *   1. Someone @mentions the bot in a group  → bot asks for their name
 *   2. That person sends any text            → bot saves it as their name, asks for gender
 *   3. That person sends M / F / O           → bot confirms registration
 *   4. Host sends "spin"                     → game runs with registered players only
 *
 * State is kept in-memory (Map) and automatically expires after 5 minutes of
 * inactivity so stale sessions don't accumulate.
 */

import { Client } from "../../../libs/client/client";
import { MessageSerialize } from "../../../types/structure/serialize";
import { Database } from "../../../libs/database/prisma";
import { logger } from "../../../core/logger";
import crypto from "crypto";

const VALID_GENDERS = ["M", "F", "O"] as const;
const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

type RegistrationStep = "waiting_name" | "waiting_gender";

interface RegSession {
    step: RegistrationStep;
    name?: string;
    groupId: string;
    expiresAt: number;
}

const sessions = new Map<string, RegSession>();

/** Sweep expired sessions periodically */
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of sessions) {
        if (now >= v.expiresAt) sessions.delete(k);
    }
}, 60_000);

function refreshSession(sender: string, patch: Partial<RegSession>): void {
    const existing = sessions.get(sender);
    if (existing) {
        Object.assign(existing, patch, { expiresAt: Date.now() + SESSION_TTL_MS });
    }
}

/** Send a text message that @mentions the given JIDs. */
async function sendMention(
    Chisato: Client,
    groupId: string,
    text: string,
    mentions: string[]
): Promise<void> {
    // sendText accepts an options object as the 4th arg; pass mentions there.
    await Chisato.sendText(groupId, text, undefined, { mentions } as any);
}

export class GameRegistrationHandler {
    /**
     * Call this on every group message BEFORE the normal command router.
     * Returns true if the message was consumed (caller should stop processing).
     */
    static async handle(
        Chisato: Client,
        message: MessageSerialize,
        context: any
    ): Promise<boolean> {
        if (!context.isGroup) return false;

        const sender: string = context.sender;
        const groupId: string = context.from;
        const body: string = (message.body ?? "").trim();
        const botJid: string = context.botNumber;

        // ── 1. @mention → start registration ────────────────────────────────
        const botMentioned =
            Array.isArray(message.mentions) &&
            message.mentions.some(
                (m: string) =>
                    m === botJid ||
                    m.split("@")[0] === botJid.split("@")[0]
            );

        if (botMentioned && !context.cmd) {
            const room = await GameRegistrationHandler.getOrCreateRoom(groupId);
            const alreadyIn = await Database.gamePlayer.findFirst({
                where: { roomId: room.id, userId: sender },
            });

            if (alreadyIn) {
                await sendMention(
                    Chisato, groupId,
                    `✅ *${alreadyIn.name}*, you're already in the game lobby!\n` +
                    `The host can type *spin* to start.`,
                    [sender]
                );
                return true;
            }

            sessions.set(sender, {
                step: "waiting_name",
                groupId,
                expiresAt: Date.now() + SESSION_TTL_MS,
            });

            await sendMention(
                Chisato, groupId,
                `🎮 Hey @${sender.split("@")[0]}! Let's get you into the game.\n\n` +
                `What's your *name*? (just type it)`,
                [sender]
            );
            return true;
        }

        // ── 2. Active registration session ──────────────────────────────────
        const session = sessions.get(sender);
        if (!session || session.groupId !== groupId) return false;

        if (context.cmd) return false;

        // Step: waiting for name
        if (session.step === "waiting_name") {
            if (!body || body.length < 1) return false;

            const name = body.slice(0, 32);
            refreshSession(sender, { step: "waiting_gender", name });

            await sendMention(
                Chisato, groupId,
                `Nice to meet you, *${name}*! 👋\n\n` +
                `@${sender.split("@")[0]}, what's your gender?\n` +
                `Reply with:\n` +
                `• *M* — Male\n` +
                `• *F* — Female\n` +
                `• *O* — Other / Non-binary`,
                [sender]
            );
            return true;
        }

        // Step: waiting for gender
        if (session.step === "waiting_gender") {
            const gender = body.toUpperCase();

            if (!VALID_GENDERS.includes(gender as any)) {
                await sendMention(
                    Chisato, groupId,
                    `@${sender.split("@")[0]} Please reply with *M*, *F*, or *O*.`,
                    [sender]
                );
                return true;
            }

            const name = session.name!;
            sessions.delete(sender);

            try {
                const room = await GameRegistrationHandler.getOrCreateRoom(groupId);

                const existing = await Database.gamePlayer.findFirst({
                    where: { roomId: room.id, userId: sender },
                });

                if (existing) {
                    await sendMention(
                        Chisato, groupId,
                        `@${sender.split("@")[0]} You're already registered as *${existing.name}*! 🎮`,
                        [sender]
                    );
                    return true;
                }

                await Database.gamePlayer.create({
                    data: { userId: sender, roomId: room.id, name, gender },
                });

                const count = await Database.gamePlayer.count({ where: { roomId: room.id } });
                const genderLabel = gender === "M" ? "Male" : gender === "F" ? "Female" : "Other";

                await sendMention(
                    Chisato, groupId,
                    `🎉 @${sender.split("@")[0]} (*${name}* · ${genderLabel}) has joined the game!\n\n` +
                    `👥 *${count} player${count === 1 ? "" : "s"}* in the lobby.\n\n` +
                    (count >= 2
                        ? `The host can now type *spin* to start! 🍾`
                        : `Waiting for more players to @mention me and join!`),
                    [sender]
                );
            } catch (err) {
                logger.error(`GameRegistration: ${err instanceof Error ? err.message : String(err)}`);
                await Chisato.sendText(groupId, "❌ Failed to register. Please try again.", message);
            }
            return true;
        }

        return false;
    }

    /** Get the active lobby room for a group, or create a new one. */
    static async getOrCreateRoom(groupId: string) {
        return (
            (await Database.gameRoom.findFirst({
                where: { groupId, status: { in: ["lobby", "playing", "waiting_for_reply"] } },
            })) ??
            (await Database.gameRoom.create({
                data: {
                    roomId: crypto.randomBytes(4).toString("hex"),
                    groupId,
                    status: "lobby",
                },
            }))
        );
    }
}
