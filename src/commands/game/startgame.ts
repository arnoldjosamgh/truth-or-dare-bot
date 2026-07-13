import type { ConfigCommands } from "../../types/structure/commands";
import { Database } from "../../libs/database/prisma";
import { logger } from "../../core/logger";
import crypto from "crypto";

// Hosted URL of the Svelte web app (set GAME_URL in your .env)
const GAME_BASE_URL = process.env.GAME_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export default {
    name: "startgame",
    alias: ["bottle"],
    category: "game",
    description: "Start a bottle spinning game lobby in this group.",
    async run({ Chisato, from, message }) {
        try {
            // Reuse an existing lobby or create a fresh one
            const room = await Database.gameRoom.findFirst({ where: { groupId: from, status: "lobby" } })
                ?? await Database.gameRoom.create({
                    data: { roomId: crypto.randomBytes(4).toString("hex"), groupId: from, status: "lobby" }
                });

            const gameUrl = `${GAME_BASE_URL}/#/game/${room.roomId}`;

            await Chisato.sendText(
                from,
                `🍾 *BOTTLE SPINNING GAME* 🍾\n\n` +
                `A game lobby is open! Everyone click the link below to join 👇\n\n` +
                `🔗 *${gameUrl}*\n\n` +
                `The link will ask for your name and gender.\n` +
                `You can also join here in chat:\n` +
                `➕ \`!join <Name> <M/F/O>\`  e.g. \`!join John M\`\n\n` +
                `🔑 Room Code: *${room.roomId}*\n` +
                `▶️ Host spins with: \`!spin\``,
                message
            );
        } catch (error) {
            logger.error(`startgame: ${error instanceof Error ? error.message : String(error)}`);
            await Chisato.sendText(from, "❌ Could not create a game room. Please check the database connection.", message);
        }
    },
} satisfies ConfigCommands;

