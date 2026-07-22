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

const VALID_GENDERS = ["M", "F"] as const;
const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

type RegistrationStep = "waiting_game_choice" | "waiting_name" | "waiting_gender";

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
        if (message.fromMe) return false;

        const sender: string = context.sender;
        const groupId: string = context.from;
        const body: string = (message.body ?? "").trim();
        const botJid: string = context.botNumber;

        // ── 1. @mention detection ────────────────────────────────────────────
        const botPhone = botJid.split("@")[0];
        const mentionsArray = Array.isArray(message.mentions) ? message.mentions : [];
        const botMentioned =
            mentionsArray.some(
                (m: string) => m === botJid || m.split("@")[0] === botPhone
            ) ||
            body.includes(`@${botPhone}`) ||
            body.toLowerCase().includes("@bot");

        if (botMentioned && !context.cmd) {
            // ── 1a. "tell" pattern: @bot tell @target <insult> ───────────────
            // Detects: "@bot tell Jordan his dumb" OR "@bot tell @jordan his dumb"
            // Bot strips "tell [target]" and fires back the insult AT the target
            const tellMatch = body.match(
                /(?:@\S+\s+)?tell\s+@?(\S+)\s+(.+)/i
            );
            if (tellMatch) {
                const targetName = tellMatch[1].replace(/[^a-zA-Z0-9_]/g, ""); // cleaned name/number
                const insult = tellMatch[2].trim();

                // Flip pronouns: his→you, he→you, her→you, she→you, they→you etc.
                const flipped = insult
                    .replace(/\bhis\b/gi, "your")
                    .replace(/\bher\b/gi, "your")
                    .replace(/\bhe's\b/gi, "you're")
                    .replace(/\bshe's\b/gi, "you're")
                    .replace(/\bhe\b/gi, "you")
                    .replace(/\bshe\b/gi, "you")
                    .replace(/\bthey're\b/gi, "you're")
                    .replace(/\bthey\b/gi, "you")
                    .replace(/\bhim\b/gi, "you")
                    .replace(/\bis\b/gi, "are");

                // Resolve target JID from mentions or just use the name text
                const targetJid = mentionsArray.find(
                    (m: string) => m.split("@")[0].includes(targetName) && m !== botJid
                ) || null;

                const mentionList = targetJid ? [targetJid] : [];
                const targetTag = targetJid
                    ? `@${targetJid.split("@")[0]}`
                    : `@${targetName}`;

                await sendMention(
                    Chisato, groupId,
                    `${targetTag} ${flipped} `,
                    mentionList
                );

                // Immediately mute bot and wait for next @bot call
                const { Group: GroupDatabase } = await import("../../../libs/database");
                const groupDb = new GroupDatabase();
                await groupDb.updateSettings(groupId, { mute: true });
                return true;
            }

            // ── 1a-2. Insult directed at the bot ─────────────────────────────
            const isInsult = /fuck you|shut up|mother fucker|bitch|stupid|idiot|dumbass|suck/i.test(body);
            if (isInsult) {
                const { getRandomMixedRoast } = await import("../../../utils/roasts");
                const genderRecord = await Database.gamePlayer.findFirst({
                    where: { userId: sender },
                    select: { gender: true },
                    orderBy: { id: "desc" }
                });
                await sendMention(
                    Chisato, groupId,
                    `@${sender.split("@")[0]} ${getRandomMixedRoast(genderRecord?.gender)}`,
                    [sender]
                );
                return true;
            }

            // ── 1b. Plain @bot → unmute + start game registration ────────────
            const { Group: GroupDatabase } = await import("../../../libs/database");
            const groupDb = new GroupDatabase();
            await groupDb.updateSettings(groupId, { mute: false });

            const room = await GameRegistrationHandler.getOrCreateRoom(groupId, sender);
            const alreadyIn = await Database.gamePlayer.findFirst({
                where: { roomId: room.id, userId: sender },
            });

            if (alreadyIn) {
                await sendMention(
                    Chisato, groupId,
                    `*${alreadyIn.name}*, you're already in the game lobby!\n\n` +
                    `*Game Instructions:*\n` +
                    `• *spin* — Starts the next round\n` +
                    `• *stop* — Ends the game and mutes the bot\n` +
                    `• *skip* — Skips the current player if they don't reply\n`,
                    [sender]
                );
                return true;
            }

            sessions.set(sender, {
                step: "waiting_game_choice",
                groupId,
                expiresAt: Date.now() + SESSION_TTL_MS,
            });

            await sendMention(
                Chisato, groupId,
                `Hey @${sender.split("@")[0]}! What game do you want to play?\n\n` +
                `Reply with:\n` +
                `• *1* for Truth or Dare \n` +
                `• *2* for Anonymous Confessions ️‍️`,
                [sender]
            );
            return true;
        }

        // ── 2. Active registration session ──────────────────────────────────
        const session = sessions.get(sender);
        if (!session || session.groupId !== groupId) return false;

        if (context.cmd) return false;

        // Step: waiting for game choice
        if (session.step === "waiting_game_choice") {
            const choice = body.trim();
            if (choice === "2" || choice.toLowerCase() === "confession" || choice.toLowerCase() === "confessions") {
                sessions.delete(sender);
                await sendMention(
                    Chisato, groupId,
                    `️‍️ @${sender.split("@")[0]}, to send an anonymous confession, just *send me a private message (DM)*! I'll keep your secret safe and post it here anonymously.`,
                    [sender]
                );
                return true;
            } else if (choice === "1" || choice.toLowerCase().includes("truth") || choice.toLowerCase().includes("dare")) {
                refreshSession(sender, { step: "waiting_name" });
                await sendMention(
                    Chisato, groupId,
                    `Truth or Dare it is!\n\n` +
                    `*Game Instructions:*\n` +
                    `• *spin* — Starts the next round\n` +
                    `• *stop* — Ends the game and mutes the bot\n` +
                    `• *skip* — Skips the current player if they don't reply\n\n` +
                    `What's your *name*? (just type it)`,
                    [sender]
                );
                return true;
            } else {
                await sendMention(
                    Chisato, groupId,
                    `@${sender.split("@")[0]} Please reply with *1* (Truth or Dare) or *2* (Confessions).`,
                    [sender]
                );
                return true;
            }
        }

        // Step: waiting for name
        if (session.step === "waiting_name") {
            if (!body || body.length < 1) return false;

            const name = body.slice(0, 32);
            refreshSession(sender, { step: "waiting_gender", name });

            await sendMention(
                Chisato, groupId,
                `Nice to meet you, *${name}*! \n\n` +
                `@${sender.split("@")[0]}, what's your gender?\n` +
                `Reply with:\n` +
                `• *M* — Male\n` +
                `• *F* — Female`,
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
                    `@${sender.split("@")[0]} Please reply with *M* or *F*.`,
                    [sender]
                );
                return true;
            }

            const name = session.name!;
            sessions.delete(sender);

            try {
                const room = await GameRegistrationHandler.getOrCreateRoom(groupId, sender);

                const existing = await Database.gamePlayer.findFirst({
                    where: { roomId: room.id, userId: sender },
                });

                if (existing) {
                    await sendMention(
                        Chisato, groupId,
                        `@${sender.split("@")[0]} You're already registered as *${existing.name}*! `,
                        [sender]
                    );
                    return true;
                }

                await Database.gamePlayer.create({
                    data: { userId: sender, roomId: room.id, name, gender },
                });

                const count = await Database.gamePlayer.count({ where: { roomId: room.id } });
                const genderLabel = gender === "M" ? "Male" : "Female";

                await sendMention(
                    Chisato, groupId,
                    `@${sender.split("@")[0]} (*${name}* · ${genderLabel}) has joined the game!\n\n` +
                    `*${count} player${count === 1 ? "" : "s"}* in the lobby.\n\n` +
                    (count >= 2
                        ? `The host can now type *spin* to start! `
                        : `Waiting for more players to @mention me and join!`),
                    [sender]
                );
            } catch (err) {
                logger.error(`GameRegistration: ${err instanceof Error ? err.message : String(err)}`);
                await Chisato.sendText(groupId, "Failed to register. Please try again.", message);
            }
            return true;
        }

        return false;
    }

    /** Get the active lobby room for a group, or create a new one. Assigns the sender as host if none exists. */
    static async getOrCreateRoom(groupId: string, sender?: string) {
        let room = await Database.gameRoom.findFirst({
            where: { groupId, status: { in: ["lobby", "playing", "waiting_for_reply"] } },
        });

        if (!room) {
            room = await Database.gameRoom.create({
                data: {
                    roomId: crypto.randomBytes(4).toString("hex"),
                    groupId,
                    status: "lobby",
                    hostId: sender,
                },
            });
        } else if (!room.hostId && sender) {
            room = await Database.gameRoom.update({
                where: { id: room.id },
                data: { hostId: sender }
            });
        }
        return room;
    }
}
