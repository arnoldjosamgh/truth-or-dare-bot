import type { ConfigCommands } from "../../types/structure/commands";
import { configService } from "../../core/config/config.service";

export default {
    name: "autoreadstatus",
    alias: ["autoreadsw", "arsw"],
    category: "owner",
    description: "Toggle auto-read status/story feature",
    usage: "[on/off]",
    example: `*「 AUTO-READ STATUS 」*

Toggle auto-read status/story feature

*Description:*
Auto-read status feature will automatically view all WhatsApp status/stories.

*Usage:*
{prefix}{command.name} on
{prefix}{command.name} off

*Note:* Bot will automatically view all status updates from contacts.`,
    isOwner: true,
    async run({ Chisato, message, args, from }) {
        const config = configService.getConfig();

        const action = args[0].toLowerCase();

        if (action === "on" || action === "enable" || action === "true" || action === "1") {
            if (config.settings.autoReadStatus) {
                return Chisato.sendText(
                    from,
                    "Auto-read status is already *enabled*!",
                    message
                );
            }

            configService.updateSettings({ autoReadStatus: true });

            let text = `*「 AUTO-READ STATUS ENABLED 」*\n\n`;
            text += `Auto-read status feature has been *enabled*!\n\n`;
            text += `Bot will now automatically view all WhatsApp status/stories.`;

            return Chisato.sendText(from, text, message);
        } else if (action === "off" || action === "disable" || action === "false" || action === "0") {
            if (!config.settings.autoReadStatus) {
                return Chisato.sendText(
                    from,
                    "Auto-read status is already *disabled*!",
                    message
                );
            }

            configService.updateSettings({ autoReadStatus: false });

            let text = `*「 AUTO-READ STATUS DISABLED 」*\n\n`;
            text += `Auto-read status feature has been *disabled*!\n\n`;
            text += `Bot will no longer automatically view status updates.`;

            return Chisato.sendText(from, text, message);
        } else {
            let text = `*「 INVALID ARGUMENT 」*\n\n`;
            text += `Please use *on* or *off* as argument.\n\n`;
            text += `*Usage:*\n`;
            text += `• ${config.prefix}autoreadstatus on\n`;
            text += `• ${config.prefix}autoreadstatus off`;

            return Chisato.sendText(from, text, message);
        }
    },
} satisfies ConfigCommands;
