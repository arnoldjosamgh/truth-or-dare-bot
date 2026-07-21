import type { ConfigCommands } from "../../types/structure/commands";
import { Database } from "../../libs/database/prisma";
import { logger } from "../../core/logger";

export default {
    name: "confess",
    alias: ["confession"],
    category: "game",
    description: "Send an anonymous confession to the group. You can use this in a private message to the bot.",
    async run({ Chisato, from, message, args, sender, isGroup }) {
        let text = args.join(" ").trim();

        let targetGroupId: string | null = null;

        if (isGroup) {
            if (!text) {
                await Chisato.sendText(from, "❌ You need to provide a confession message!\nExample: `!confess I have a crush on John`", message);
                return;
            }
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
            // In DM, find the groups they are in
            try {
                const groups = await Database.group.findMany({
                    where: {
                        participants: {
                            some: { id: sender }
                        }
                    },
                    select: { groupId: true, subject: true }
                });

                if (groups.length === 0) {
                    await Chisato.sendText(from, "❌ I couldn't find any groups that we share. Make sure you are in a group with me first!", message);
                    return;
                }

                if (groups.length === 1) {
                    targetGroupId = groups[0].groupId;
                } else {
                    // Multiple groups, check if they provided a number
                    if (!text) {
                        const groupList = groups.map((g, i) => `${i + 1}. ${g.subject}`).join("\n");
                        await Chisato.sendText(from, `❌ You are in multiple groups. Please specify which group by putting its number first:\n\n${groupList}\n\nExample: \`!confess 1 I have a crush\``, message);
                        return;
                    }

                    const index = parseInt(args[0], 10);
                    if (!isNaN(index) && index >= 1 && index <= groups.length) {
                        targetGroupId = groups[index - 1].groupId;
                        text = args.slice(1).join(" ").trim(); // Remove the number from the confession
                    } else {
                        const groupList = groups.map((g, i) => `${i + 1}. ${g.subject}`).join("\n");
                        await Chisato.sendText(from, `❌ You are in multiple groups. Please specify which group by putting its number first:\n\n${groupList}\n\nExample: \`!confess 1 I have a crush\``, message);
                        return;
                    }
                }

                if (!text) {
                    await Chisato.sendText(from, "❌ You need to provide a confession message!\nExample: `!confess I have a crush on John`", message);
                    return;
                }
            } catch (err) {
                logger.error(`confess DM lookup: ${err instanceof Error ? err.message : String(err)}`);
                await Chisato.sendText(from, "❌ An error occurred while looking for your groups.", message);
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
