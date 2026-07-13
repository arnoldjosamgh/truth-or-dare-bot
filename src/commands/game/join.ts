import type { ConfigCommands } from "../../types/structure/commands";
import { Database } from "../../libs/database/prisma";
import { logger } from "../../core/logger";

const VALID_GENDERS = ["M", "F", "O"] as const;

export default {
    name: "join",
    category: "game",
    description: "Join the active bottle spinning game lobby.",
    async run({ Chisato, from, message, args, sender }) {
        if (args.length < 2) {
            await Chisato.sendText(from, "❌ Usage: `!join <Name> <M/F/O>`\nExample: `!join John M`", message);
            return;
        }

        const gender = args[args.length - 1].toUpperCase();
        if (!VALID_GENDERS.includes(gender as any)) {
            await Chisato.sendText(from, "❌ Gender must be M (Male), F (Female), or O (Other).", message);
            return;
        }

        const name = args.slice(0, -1).join(" ");

        try {
            const room = await Database.gameRoom.findFirst({ where: { groupId: from, status: "lobby" } });
            if (!room) {
                await Chisato.sendText(from, "❌ No active lobby in this group. Start one with `!startgame`.", message);
                return;
            }

            const existing = await Database.gamePlayer.findFirst({ where: { roomId: room.id, userId: sender } });
            if (existing) {
                await Chisato.sendText(from, `✅ You're already in the lobby as *${existing.name}*.`, message);
                return;
            }

            await Database.gamePlayer.create({ data: { userId: sender, roomId: room.id, name, gender } });
            await Chisato.sendText(from, `🎮 *${name}* (${gender}) joined the game!`, message);
        } catch (error) {
            logger.error(`join: ${error instanceof Error ? error.message : String(error)}`);
            await Chisato.sendText(from, "❌ Failed to join. Please try again.", message);
        }
    },
} satisfies ConfigCommands;
