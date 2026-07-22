import type { ConfigCommands } from "../../types/structure/commands";
import { configService } from "../../core/config/config.service";

export default {
    name: "changemode",
    alias: ["mode", "botmode"],
    category: "owner",
    description: "Change bot operation mode (public/self)",
    usage: "[mode]",
    example: `*「 BOT MODE STATUS 」*

Change bot operation mode

*Available Modes:*
• *PUBLIC* - Bot responds to all users
• *SELF* - Bot only responds to owner

*Example:*
{prefix}{command.name}
{prefix}{command.name} public
{prefix}{command.name} self`,
    isOwner: true,
    async run({ Chisato, message, args, from, prefix, command }) {
        const config = configService.getConfig();

        if (args.length === 0) {
            const mode = config.settings.selfbot ? "SELF" : "PUBLIC";
            const emoji = config.settings.selfbot ? "" : "";
            
            let text = `*「 BOT MODE STATUS 」*\n\n`;
            text += `${emoji} Current Mode: *${mode}*\n\n`;
            text += `*Description:*\n`;
            text += config.settings.selfbot
                ? `In SELF mode, bot only responds to messages from the bot owner's number.`
                : `In PUBLIC mode, bot responds to all users who send commands.`;
            text += `\n\n`;
            text += `*Available Modes:*\n`;
            text += `• *PUBLIC* - Bot responds to all users\n`;
            text += `• *SELF* - Bot only responds to owner\n\n`;
            text += `*Example:*\n`;
            text += `${prefix}${command.name}\n`;
            text += `${prefix}${command.name} public\n`;
            text += `${prefix}${command.name} self`;

            return Chisato.sendText(from, text, message);
        }

        const mode = args[0].toLowerCase();

        switch (mode) {
            case "public":
            case "publik":
                if (!config.settings.selfbot) {
                    return Chisato.sendText(
                        from,
                        "Bot is already in *PUBLIC* mode!",
                        message
                    );
                }

                configService.updateSettings({ selfbot: false });

                let publicText = `*「 MODE CHANGED: PUBLIC 」*\n\n`;
                publicText += `Bot mode has been changed to *PUBLIC*!\n\n`;
                publicText += `Bot will now respond to all users who send commands.\n\n`;
                publicText += `*Active:* All users can use the bot.`;

                return Chisato.sendText(from, publicText, message);

            case "self":
            case "private":
            case "selfbot":
                if (config.settings.selfbot) {
                    return Chisato.sendText(
                        from,
                        "Bot is already in *SELF* mode!",
                        message
                    );
                }

                configService.updateSettings({ selfbot: true });

                let selfText = `*「 MODE CHANGED: SELF 」*\n\n`;
                selfText += `Bot mode has been changed to *SELF*!\n\n`;
                selfText += `Bot will now only respond to messages from owner.\n\n`;
                selfText += `*Active:* Only owner can use the bot.`;

                return Chisato.sendText(from, selfText, message);

            default:
                let errorText = `*「 INVALID MODE 」*\n\n`;
                errorText += `Invalid mode: *${mode}*\n\n`;
                errorText += `*Available Modes:*\n`;
                errorText += `• ${config.prefix}mode public\n`;
                errorText += `• ${config.prefix}mode self`;

                return Chisato.sendText(from, errorText, message);
        }
    },
} satisfies ConfigCommands;
