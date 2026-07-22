import type { ConfigCommands } from "../../types/structure/commands";

export default {
    name: "addmode",
    alias: ["addmember", "memberadd"],
    category: "group setting",
    description: "Control who can add members to group",
    usage: "[on/off]",
    example: `*「 ADD MEMBER MODE 」*

Control who can add members

*Description:*
• ON - All members can add people
• OFF - Only admins can add people

*Usage:*
{prefix}{command.name} on
{prefix}{command.name} off
{prefix}{command.name}

*Note:* Bot must be admin to change this setting.`,
    isGroup: true,
    isGroupAdmin: true,
    isBotAdmin: true,
    async run({ Chisato, from, args, message, Database, prefix }) {
        const groupSetting = await Database.Group.get(from);

        const action = args[0].toLowerCase();

        if (action === "on" || action === "enable" || action === "true" || action === "1" || action === "all") {
            if (groupSetting?.memberAddMode) {
                return Chisato.sendText(
                    from,
                    "Add member mode is already set to *All Members*!",
                    message
                );
            }

            await Chisato.groupMemberAddMode(from, "all_member_add");
            await Database.Group.update(from, { memberAddMode: true });

            let text = `*「 ADD MEMBER MODE: ALL 」*\n\n`;
            text += `Add member mode has been set to *All Members*!\n\n`;
            text += `All members can now add people to this group.`;

            return Chisato.sendText(from, text, message);
        } else if (action === "off" || action === "disable" || action === "false" || action === "0" || action === "admin") {
            if (!groupSetting?.memberAddMode) {
                return Chisato.sendText(
                    from,
                    "Add member mode is already set to *Admins Only*!",
                    message
                );
            }

            await Chisato.groupMemberAddMode(from, "admin_add");
            await Database.Group.update(from, { memberAddMode: false });

            let text = `*「 ADD MEMBER MODE: ADMIN 」*\n\n`;
            text += `Add member mode has been set to *Admins Only*!\n\n`;
            text += `Only admins can now add people to this group.`;

            return Chisato.sendText(from, text, message);
        } else {
            let text = `*「 INVALID ARGUMENT 」*\n\n`;
            text += `Please use *on* or *off* as argument.\n\n`;
            text += `*Usage:*\n`;
            text += `• ${prefix}addmode on (all members)\n`;
            text += `• ${prefix}addmode off (admins only)`;

            return Chisato.sendText(from, text, message);
        }
    },
} satisfies ConfigCommands;
