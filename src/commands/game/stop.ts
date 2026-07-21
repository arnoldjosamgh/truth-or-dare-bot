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
    // Fallback if the file is missing or broken
    return ["Nice try! Only the host can stop the game 😂 The game continues!"];
};

const randomUnauthorizedRoast = (): string => {
    const roasts = loadStopRoasts();
    return roasts[Math.floor(Math.random() * roasts.length)];
};

export default {
    name: "stop",
    alias: ["stopgame", "endgame"],
    category: "game",
    description: "Stop the active bottle game. Only the host (or any player if host is offline) can do this.",
    async run({ Chisato, from, message, sender, args }) {
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

            const isHost = room.hostId === sender;

            // ── "stop now" override: any player can force-stop if host is offline ──
            // Syntax: !stop now
            const isForceStop = args[0]?.toLowerCase() === "now";

            if (!isHost && !isForceStop) {
                // Non-host tried to type !stop without "now" → roast them, then continue the game
                const roast = randomUnauthorizedRoast();
                await Chisato.sendText(
                    from,
                    `@${sender.split("@")[0]} ${roast}\n\n_Only the host can stop the game. If the host is away, type_ *!stop now* _to force-end it._`,
                    message,
                    { mentions: [sender] } as any
                );

                // Continue game to next player if we are currently in playing state
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

            // ── Authorised stop: host typed !stop, or anyone typed !stop now ──────
            await Database.gameRoom.update({
                where: { id: room.id },
                data: { status: "ended" as any }
            });

            await Database.gamePlayer.deleteMany({ where: { roomId: room.id } });

            const stoppedBy = isHost ? "The host" : "A player (host override)";
            await Chisato.sendText(
                from,
                `🛑 *Game over!* ${stoppedBy} ended the session.\n\n` +
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
