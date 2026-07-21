import type { ConfigCommands } from "../../types/structure/commands";
import { Database } from "../../libs/database/prisma";
import { logger } from "../../core/logger";

export default {
    name: "confess",
    alias: ["confession"],
    category: "game",
    description: "Send an anonymous confession to the group. You can use this in a private message to the bot.",
    async run({ Chisato, from, message, args, sender, isGroup }) {
        const text = args.join(" ").trim();
        if (!text) {
            await Chisato.sendText(from, "❌ You need to provide a confession message!\nExample: `!confess I have a crush on John`", message);
            return;
        }

        let targetGroupId: string | null = null;

        if (isGroup) {
            targetGroupId = from;
            // Attempt to delete their message for anonymity
            try {
                if (Chisato.sendMessage) {
                    await Chisato.sendMessage(from, { delete: message.key });
                }
            } catch (err) {
                logger.error(`confess: failed to delete original message: ${err instanceof Error ? err.message : String(err)}`);
            }
        } else {
            // In DM, find their active game room
            try {
                const player = await Database.gamePlayer.findFirst({
                    where: { userId: sender },
                    include: { room: true }
                });

                if (!player || !player.room) {
                    await Chisato.sendText(from, "❌ I couldn't find an active game for you. Please join a game first or use this command directly in the group.", message);
                    return;
                }
                targetGroupId = player.room.groupId;
            } catch (err) {
                logger.error(`confess DM lookup: ${err instanceof Error ? err.message : String(err)}`);
                await Chisato.sendText(from, "❌ An error occurred while looking for your game group.", message);
                return;
            }
        }

        if (targetGroupId) {
            try {
                const confessionMessage = `🕵️‍♂️ *Anonymous Confession:*\n\n"${text}"`;
                await Chisato.sendText(targetGroupId, confessionMessage);

                if (!isGroup) {
                    await Chisato.sendText(from, "✅ Your confession has been sent anonymously to the group!", message);
                }
            } catch (err) {
                logger.error(`confess send: ${err instanceof Error ? err.message : String(err)}`);
                if (!isGroup) {
                    await Chisato.sendText(from, "❌ Failed to send your confession to the group.", message);
                }
            }
        }
    },
} satisfies ConfigCommands;
