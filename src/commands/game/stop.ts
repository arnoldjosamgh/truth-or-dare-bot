import type { ConfigCommands } from "../../types/structure/commands";
import { Database } from "../../libs/database/prisma";
import { logger } from "../../core/logger";
import { performSpin } from "./spin";
import * as fs from "fs";
import * as path from "path";

/** Loads stop-roast messages from public/stop-roasts.json at runtime so you can edit them without restarting the bot. */
const loadStopRoasts = (): string[] => {
    try {
        const filePath = path.join(process.cwd(), "public", "stop-roasts.json");
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
            if (Array.isArray(data.messages) && data.messages.length > 0) {
                return data.messages;
            }
        }
    } catch (err) {
        logger.error(`stop: failed to load stop-roasts.json — ${err instanceof Error ? err.message : String(err)}`);
    }
    return ["Nice try! Only the host can stop the game 😂 The game continues!"];
};

const randomUnauthorizedRoast = (): string => {
    const roasts = loadStopRoasts();
    return roasts[Math.floor(Math.random() * roasts.length)];
};

// Tracks how many times each user has tried to stop per group: "sender:groupId" → count
const stopAttempts = new Map<string, number>();

export default {
    name: "stop",
    alias: ["stopgame", "endgame"],
    category: "game",
    description: "Stop the active bottle game. Only the host can stop it.",
    async run({ Chisato, from, message, sender }) {
        try {
            const room = await Database.gameRoom.findFirst({
                where: {
                    groupId: from,
                    status: { in: ["lobby", "playing", "waiting_for_reply"] }
                }
            });

            if (!room) {
                await Chisato.sendText(from, "❌ There's no active game to stop right now.", message);
                return;
            }

            // Normalize to plain phone number (strip device suffix and domain)
            const normalize = (jid?: string | null) => jid?.split("@")[0]?.split(":")[0] ?? "";
            const isHost = !!room.hostId && normalize(room.hostId) === normalize(sender);

            if (!isHost) {
                const attemptKey = `${sender}:${from}`;
                const attempts = (stopAttempts.get(attemptKey) ?? 0) + 1;
                stopAttempts.set(attemptKey, attempts);

                if (attempts >= 3) {
                    // Third attempt — silently end the game and clear counter
                    stopAttempts.delete(attemptKey);
                    await Database.gameRoom.update({
                        where: { id: room.id },
                        data: { status: "ended" as any }
                    });
                    await Database.gamePlayer.deleteMany({ where: { roomId: room.id } });
                    return;
                }

                // 1st or 2nd attempt — roast them and keep the game going
                const roast = randomUnauthorizedRoast();
                await Chisato.sendText(
                    from,
                    `@${sender.split("@")[0]} ${roast}`,
                    message,
                    { mentions: [sender] } as any
                );

                // Continue game to next player if currently in playing state
                if (room.status === "playing") {
                    setTimeout(async () => {
                        try {
                            const current = await Database.gameRoom.findUnique({ where: { id: room.id } });
                            if (current?.status === "playing") {
                                await performSpin(Chisato, from, current);
                            }
                        } catch (err) {
                            logger.error(`stop (continue after roast): ${err instanceof Error ? err.message : String(err)}`);
                        }
                    }, 3000);
                }
                return;
            }

            // ── Host stopped the game ──
            stopAttempts.forEach((_, key) => { if (key.endsWith(`:${from}`)) stopAttempts.delete(key); });

            await Database.gameRoom.update({
                where: { id: room.id },
                data: { status: "ended" as any }
            });

            await Database.gamePlayer.deleteMany({ where: { roomId: room.id } });

            await Chisato.sendText(
                from,
                `🛑 *Game over!* The host ended the session.\n\n` +
                `Thanks for playing everyone! 🎉\n` +
                `Start a new game anytime with *!startgame*`,
                message
            );
        } catch (error) {
            logger.error(`stop: ${error instanceof Error ? error.message : String(error)}`);
            await Chisato.sendText(from, "❌ Something went wrong while stopping the game. Please try again.", message);
        }
    },
} satisfies ConfigCommands;
