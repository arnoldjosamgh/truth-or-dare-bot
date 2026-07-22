import type { ConfigCommands } from "../../types/structure/commands";

export default {
    name: "notify",
    alias: ["gnotify", "groupnotify"],
    category: "group setting",
    description: "Enable group event notifications (join/leave/promote/demote)",
    usage: "[on/off]",
    example: `*「 GROUP NOTIFICATIONS 」*

Enable group event notifications

*Description:*
Group notifications will send alerts for group events like member changes, promotions, and demotions.

*Usage:*
{prefix}{command.name} on
{prefix}{command.name} off

*Events:* Member join/leave, admin promote/demote, group changes.`,
    isGroup: true,
    isGroupAdmin: true,
    async run({ Chisato, from, args, message, Database, isBotAdmin, prefix }) {
        if (!isBotAdmin) {
            return Chisato.sendText(
                from,
                `️ Bot must be a group admin for this feature to work!\n\nPlease promote bot to admin first.`,
                message
            );
        }

        const groupSetting = await Database.Group.getSettings(from);

        const action = args[0].toLowerCase();

        if (/(on|enable|true|1|aktif)/.test(action)) {
            if (groupSetting?.notify) {
                return Chisato.sendText(
                    from,
                    "Group notifications are already *enabled*!",
                    message
                );
            }

            await Database.Group.updateSettings(from, { notify: true });

            let text = `*「 GROUP NOTIFICATIONS ENABLED 」*\n\n`;
            text += `Group notifications have been *enabled*!\n\n`;
            text += `Bot will now send notifications for group events.`;

            return Chisato.sendText(from, text, message);
        } else if (/(off|disable|false|0|nonaktif)/.test(action)) {
            if (!groupSetting?.notify) {
                return Chisato.sendText(
                    from,
                    "Group notifications are already *disabled*!",
                    message
                );
            }

            await Database.Group.updateSettings(from, { notify: false });

            let text = `*「 GROUP NOTIFICATIONS DISABLED 」*\n\n`;
            text += `Group notifications have been *disabled*!\n\n`;
            text += `Bot will no longer send group event notifications.`;

            return Chisato.sendText(from, text, message);
        } else {
            let text = `*「 INVALID ARGUMENT 」*\n\n`;
            text += `Please use *on* or *off* as argument.\n\n`;
            text += `*Usage:*\n`;
            text += `• ${prefix}notify on\n`;
            text += `• ${prefix}notify off`;

            return Chisato.sendText(from, text, message);
        }
    },
} satisfies ConfigCommands;
