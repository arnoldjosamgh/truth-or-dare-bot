import { MessageSerialize } from "../../../types/structure/serialize";
import { Client } from "../../../libs/client/client";
import { BotConfig, configService } from "../../../core/config/config.service";
import { logger } from "../../../core/logger/logger.service";
import { MessageContextBuilder } from "./message-context.builder";
import { MessageLogger } from "./message-logger";
import { CommandValidator } from "./command-validator";
import { AfkHandler } from "./afk-handler";
import { EvalExecHandler } from "./eval-exec-handler";
import { SessionHandler } from "./session-handler";
import { GameListener } from "./game-listener";
import { GameRegistrationHandler } from "./game-registration-handler";
import { commands, aliasIndex, cooldowns } from "../../../libs";
import { calculateXPReward, getRankInfo } from "../../../utils/leveling";
import {
    Group as GroupDatabase,
    User as UserDatabase,
} from "../../../libs/database";
import { AntiLinkHandler, AntiBotMessageHandler } from "../settings";
import { StringUtils } from "../../../utils/core/string-utils";
import { formatExample } from "../../../utils";
import { tryConsumeLoginOtp } from "../../../dashboard/routes/group-auth";
import { resolveToPnJid } from "../../../utils/jid-resolver";

// Tracks users who sent a confession text but need to pick a group: sender → confessionText
const pendingConfessionText = new Map<string, string>();

export class MessageHandler {
    private Database = {
        Group: new GroupDatabase(),
        User: new UserDatabase(),
    };
    private antiLinkHandler = new AntiLinkHandler();
    private antiBotMessageHandler = new AntiBotMessageHandler();

    async handle(Chisato: Client, message: MessageSerialize): Promise<void> {
        try {
            const config = configService.getConfig() as BotConfig;

            // Auto-read status
            if (
                config.settings.autoReadStatus &&
                message.key.remoteJid === "status@broadcast" &&
                Chisato.readMessages
            ) {
                await Chisato.readMessages([message.key]);
            }

            // Ignore status broadcasts and protocol messages
            if (message.key.remoteJid === "status@broadcast") return;
            if (!message.type || message.type === "protocolMessage") return;
            

            if (!message.fromMe && config.settings.selfbot) return;

            // Auto-read messages
            if (config.settings.autoReadMessage && Chisato.readMessages) {
                await Chisato.readMessages([message.key]);
            }

            // Build message context
            const context = await MessageContextBuilder.build(
                Chisato,
                message,
                config,
                this.Database
            );

            // Get command if exists 
            if (!context) return;

            if (
                !message.fromMe &&
                !context.isGroup &&
                message.body &&
                /^\s*\d{4,8}\s*$/.test(message.body)
            ) {
                const candidates = new Set<string>();
                for (const j of [context.sender, message.sender, message.from]) {
                    if (j) candidates.add(String(j));
                }
                try {
                    const [pnSender, pnFrom] = await Promise.all([
                        resolveToPnJid(Chisato, message.sender),
                        resolveToPnJid(Chisato, message.from),
                    ]);
                    if (pnSender) candidates.add(pnSender);
                    if (pnFrom) candidates.add(pnFrom);
                } catch {}
                const otp = tryConsumeLoginOtp([...candidates], message.body);
                if (otp.matched) {
                    await Chisato.sendText(
                        context.from,
                        "✅ *Login verified!*\n\nYou can return to the dashboard — it will continue automatically.",
                        message
                    ).catch(() => {});
                    return;
                }
            }

            // ── Auto-confession: any plain DM (not a command, not fromMe) is treated as an anonymous confession ──
            if (
                !message.fromMe &&
                !context.isGroup &&
                message.body &&
                !context.cmd
            ) {
                const confessText = message.body.trim();
                const { Database } = await import("../../../libs/database/prisma");

                // Check if they are replying with a number for a previous confession
                const pendingText = pendingConfessionText.get(context.sender);
                const isPickingGroup = pendingText && /^\d+$/.test(confessText);
                
                const actualConfession = isPickingGroup ? pendingText : confessText;

                // Extract the phone number part from the sender JID
                const senderPhone = context.sender?.split("@")[0] ?? "";

                let groups: { groupId: string; subject: string }[] = [];
                try {
                    if (senderPhone) {
                        const allGroups = await Database.group.findMany({
                            select: { groupId: true, subject: true, participants: true }
                        });
                        groups = allGroups.filter(g =>
                            g.participants?.some((p: any) =>
                                (p.id && p.id.includes(senderPhone)) ||
                                (p.phoneNumber && p.phoneNumber.includes(senderPhone))
                            )
                        ).map(g => ({ groupId: g.groupId, subject: g.subject }));
                    }
                } catch (err) {
                    logger.error(`confession lookup: ${err instanceof Error ? err.message : String(err)}`);
                }

                if (groups.length === 0) {
                    // User not in any shared group — silently ignore
                    return;
                }

                if (groups.length === 1) {
                    // Exactly one shared group — post anonymously
                    const confessionMsg = `🕵️‍♂️ *Anonymous Confession:*\n\n"${actualConfession}"`;
                    await Chisato.sendText(groups[0].groupId, confessionMsg);
                    await Chisato.sendText(context.from, "✅ Your confession has been sent anonymously to the group!", message);
                    if (isPickingGroup) pendingConfessionText.delete(context.sender);
                    return;
                }

                // Multiple groups
                if (isPickingGroup) {
                    const groupIndex = parseInt(confessText, 10);
                    if (groupIndex >= 1 && groupIndex <= groups.length) {
                        pendingConfessionText.delete(context.sender);
                        const confessionMsg = `🕵️‍♂️ *Anonymous Confession:*\n\n"${actualConfession}"`;
                        await Chisato.sendText(groups[groupIndex - 1].groupId, confessionMsg);
                        await Chisato.sendText(context.from, `✅ Your confession has been sent anonymously to *${groups[groupIndex - 1].subject}*!`, message);
                        return;
                    }
                    // Invalid number - ask again
                    const groupList = groups.map((g, i) => `${i + 1}. ${g.subject}`).join("\n");
                    await Chisato.sendText(
                        context.from,
                        `❌ Invalid number. Which group do you want to send this to? Reply with the group number:\n\n${groupList}`,
                        message
                    );
                    return;
                }

                // New confession for multiple groups
                // Check if they used the inline format "1 I have a crush"
                const firstWord = confessText.split(" ")[0];
                const groupIndex = parseInt(firstWord, 10);
                if (!isNaN(groupIndex) && groupIndex >= 1 && groupIndex <= groups.length) {
                    const actualText = confessText.slice(firstWord.length).trim();
                    if (actualText) {
                        const confessionMsg = `🕵️‍♂️ *Anonymous Confession:*\n\n"${actualText}"`;
                        await Chisato.sendText(groups[groupIndex - 1].groupId, confessionMsg);
                        await Chisato.sendText(context.from, `✅ Your confession has been sent anonymously to *${groups[groupIndex - 1].subject}*!`, message);
                        return;
                    }
                }

                // Store text and ask to pick group
                pendingConfessionText.set(context.sender, confessText);
                const groupList = groups.map((g, i) => `${i + 1}. ${g.subject}`).join("\n");
                await Chisato.sendText(
                    context.from,
                    `🕵️‍♂️ You are in multiple groups! Which group do you want to send this to? Reply with the group number:\n\n${groupList}`,
                    message
                );
                return;
            }
            // ── End auto-confession ──


            const command = context.cmd
                ? (commands.get(context.cmd) ?? aliasIndex.get(context.cmd) ?? null)
                : null;

            // Skip own messages in selfbot mode (team/owner always bypasses)
            if (
                !message.fromMe &&
                !context.isTeam &&
                config.settings.selfbot &&
                message.body &&
                !message.body.startsWith(config.prefix + "mode")
            ) {
                // In selfbot mode, only process own messages or mode command
                await AfkHandler.handle(
                    Chisato,
                    context,
                    message,
                    this.Database
                );
            } else {
                // Check premium expiry
                await this.checkPremiumExpiry(Chisato, context, message);

                // Handle eval/exec commands
                if (await EvalExecHandler.handle(Chisato, context, message)) {
                    return;
                }

                // Check if user has active adminpanel session
                if (await SessionHandler.handle(Chisato, message, context)) {
                    return; // Session handled, skip normal command processing
                }

                // Handle @bot mention registration flow (name → gender)
                try {
                    if (await GameRegistrationHandler.handle(Chisato, message, context)) {
                        return;
                    }
                } catch (regErr) {
                    logger.error(`GameRegistrationHandler: ${regErr instanceof Error ? regErr.message : String(regErr)}`);
                }

                // Handle "stop" to mute the bot completely
                const bodyTrimmed = (message.body ?? "").trim().toLowerCase();

                // Pin specific words if found
                if (context.isGroup && /(gay|bisexual|homosexual|transexual|transsexual)/i.test(bodyTrimmed)) {
                    try {
                        await Chisato.sendMessage!(
                            context.from,
                            { 
                                pin: message.key, 
                                type: 1, // PIN_FOR_ALL
                                time: 2592000 // 30 days
                            }
                        );
                    } catch (pinErr) {
                        logger.error(`Failed to pin message: ${pinErr instanceof Error ? pinErr.message : String(pinErr)}`);
                    }
                }

                // Handle plain "stop" word (no prefix needed)
                if (context.isGroup && !context.cmd && bodyTrimmed === "stop") {
                    const stopCmd = commands.get("stop");
                    if (stopCmd) {
                        context.args = [];
                        await this.handleCommand(Chisato, message, context, stopCmd);
                        return;
                    }
                }

                // Handle plain "spin" or "skip" words (no prefix needed)
                if (context.isGroup && !context.cmd && (bodyTrimmed === "spin" || bodyTrimmed === "skip")) {
                    const { performSpin } = await import("../../../commands/game/spin");
                    const { Database } = await import("../../../libs/database/prisma");
                    const room = await Database.gameRoom.findFirst({
                        where: { groupId: context.from, status: { in: ["lobby", "playing", "waiting_for_reply"] } },
                    });
                    if (room) {
                        if (bodyTrimmed === "skip") {
                            if (room.status !== "waiting_for_reply") {
                                await Chisato.sendText(context.from, "⚠️ Nothing to skip — no one is being asked a question right now.");
                                return;
                            }
                            // Only registered players can skip
                            const isRegistered = await Database.gamePlayer.findFirst({
                                where: { roomId: room.id, userId: context.sender }
                            });
                            if (!isRegistered) {
                                await Chisato.sendText(context.from, "❌ Only registered players can skip. @mention me to join!");
                                return;
                            }
                            // Skip: mark as playing and spin again immediately
                            await Database.gameRoom.update({
                                where: { id: room.id },
                                data: { status: "playing", currentPlayerId: null, currentQuestion: null }
                            });
                            await Chisato.sendText(context.from, `⏭️ *${context.pushName ?? "Someone"}* skipped! Spinning again... 🍾`);
                            await performSpin(Chisato, context.from, { ...room, status: "playing" });
                        } else {
                            // spin
                            if (room.status === "waiting_for_reply") {
                                await Chisato.sendText(context.from, "⏳ Waiting for the current player to answer! Type *skip* if they're not responding.");
                            } else {
                                await Database.gameRoom.update({ where: { id: room.id }, data: { status: "playing" } });
                                await performSpin(Chisato, context.from, { ...room, status: "playing" });
                            }
                        }
                        return;
                    }
                }


                // Check if it's an answer to the game
                if (!command && await GameListener.handle(Chisato, message, context)) {
                    return;
                }

                // Log message/command
                if (command) {
                    MessageLogger.logCommand(context, command.name);
                } else if (!message.fromMe) {
                    MessageLogger.logChat(context);
                }

                // Handle commands
                if (command) {
                    await this.handleCommand(
                        Chisato,
                        message,
                        context,
                        command
                    );
                } else if (context.cmd && config.settings.autoCorrect) {
                    // Auto-correct: suggest similar commands
                    await this.suggestSimilarCommands(
                        Chisato,
                        message,
                        context
                    );
                }

                // Run AFK handler and group settings concurrently — they are independent
                await Promise.all([
                    AfkHandler.handle(Chisato, context, message, this.Database),
                    this.handleGroupSettings(Chisato, message, context),
                ]);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            // Skip logging rate-overlimit errors to prevent spam
            if (errorMessage.includes('rate-overlimit')) {
                return;
            }
            
            logger.error(
                `Message handler error: ${errorMessage}`
            );
        }
    }

    private async checkPremiumExpiry(
        Chisato: Client,
        context: any,
        message: MessageSerialize
    ): Promise<void> {
        if (
            context.userMetadata.role === "premium" &&
            context.userMetadata.expired < Date.now()
        ) {
            await Chisato.sendText(
                context.sender,
                "Your premium has expired!",
                message
            );
            await this.Database.User.update(context.sender, {
                role: "free",
                expired: 0,
            });
        }
    }

    private async handleCommand(
        Chisato: Client,
        message: MessageSerialize,
        context: any,
        command: any
    ): Promise<void> {
        const config = configService.getConfig();

        // Check if should skip
        if (CommandValidator.shouldSkipExecution(context, command)) {
            return;
        }

        // Handle helper flag
        if (/^-[Hh](elp)?$/.test(context.args[0])) {
            await this.sendCommandHelp(Chisato, context, command, message);
            return;
        }

        // Handle maintenance flag (owner only)
        if (/^-[Mm](aintenance)?$/.test(context.args[0]) && context.isOwner) {
            await this.toggleMaintenance(Chisato, context, command, message);
            return;
        }

        // Validate command
        const validation = await CommandValidator.validateCommand(
            Chisato,
            message,
            context,
            command
        );
        if (!validation.valid) {
            return;
        }

        // Check cooldown
        if (this.checkCooldown(Chisato, context, command, message)) {
            return;
        }

        // Execute command
        if (typeof command.run === "function") {
            await command.run({
                Chisato,
                prefix: context.prefix,
                command,
                arg: context.arg,
                args: context.args,
                query: context.query,
                body: context.body,
                from: context.from,
                sender: context.sender,
                message,
                blockList: context.blockList,
                botNumber: context.botNumber,
                botName: context.botName,
                isOwner: context.isOwner,
                isGroup: context.isGroup,
                isGroupAdmin: context.isGroupAdmin,
                isGroupOwner: context.isGroupOwner,
                isBotAdmin: context.isBotAdmin,
                Database: this.Database,
                groupName: context.groupName,
                groupDescription: context.groupDescription,
                groupParticipants: context.groupParticipants,
                groupAdmins: context.groupAdmins,
                groupMetadata: context.groupMetadata,
                groupSettingData: context.groupSettingData,
                userMetadata: context.userMetadata,
            });

            // Track adminpanel command calls for session handling
            if (command.name === "adminpanel") {
                SessionHandler.trackAdminPanelCall(context.sender);
            }

            // Add XP for command usage (leveling system)
            try {
                if (message.fromMe) return;
                const xpReward = calculateXPReward(
                    command.category,
                    context.isPremium
                );
                
                const result = await this.Database.User.addXP(
                    context.sender,
                    xpReward,
                    command.name
                );

                // Notify user if they leveled up
                if (result.leveledUp && result.newLevel) {
                    const rankInfo = getRankInfo(result.newLevel);
                    
                    await Chisato.sendText(
                        context.from,
                        `🎉 *LEVEL UP!*\n\n` +
                        `${rankInfo.emoji} Congratulations! You've reached Level ${result.newLevel}\n` +
                        `Rank: ${rankInfo.rank}\n\n` +
                        `Keep using commands to level up more!`,
                        message
                    );
                }
            } catch (error) {
                // Don't block command execution if XP tracking fails
                logger.error(`XP tracking error: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        // Update limit
        if (
            context.userMetadata.role !== "premium" &&
            !context.isTeam &&
            config.settings.useLimit &&
            command.limit
        ) {
            await this.Database.User.update(context.sender, {
                limit: context.userMetadata.limit - 1,
            });
        }

        // Set cooldown
        if (
            config.settings.useCooldown &&
            command.cooldown &&
            !context.isPremium &&
            !context.isOwner
        ) {
            cooldowns.set(context.sender + command.name, Date.now());
            setTimeout(
                () => cooldowns.delete(context.sender + command.name),
                command.cooldown * 1000
            );
        }
    }

    private checkCooldown(
        Chisato: Client,
        context: any,
        command: any,
        message: MessageSerialize
    ): boolean {
        const config = configService.getConfig();

        if (!config.settings.useCooldown || !command.cooldown) {
            return false;
        }

        // List-selection responses (query contains '|') bypass cooldown
        if (command.interactiveSelection && context.query?.includes("|")) {
            return false;
        }

        if (cooldowns.has(context.sender + command.name)) {
            const remaining =
                (Date.now() - cooldowns.get(context.sender + command.name)!) /
                1000;
            Chisato.sendText(
                context.from,
                `Sorry, please wait ${remaining.toFixed(
                    1
                )} seconds to use this command again`,
                message
            );
            return true;
        }

        return false;
    }

    private async sendCommandHelp(
        Chisato: Client,
        context: any,
        command: any,
        message: MessageSerialize
    ): Promise<void> {
        const config = configService.getConfig();
        let str =
            `*「 HELPER 」*\n\n` +
            `• Name : ${command.name}\n` +
            `• Alias : ${command.alias
                .map((e: string) => e.toString())
                .join(", ")}\n` +
            `• Category : ${command.category}\n` +
            `• Description : ${command.description}\n`;

        if (configService.isMaintenance(command.name)) {
            str += `• Maintenance : true\n`;
        }

        if (command.usage) {
            str += `• Usage : ${command.usage}\n`;
        }

        if (command.example) {
            const formattedExample = formatExample(command.example, {
                prefix: context.prefix,
                command: { name: command.name, alias: command.alias },
                botName: context.botName,
                pushName: context.pushName,
                context: context
            });
            
            str += `• Example : \n${formattedExample}`;
        }

        await Chisato.sendText(context.from, str, message);
    }

    private async toggleMaintenance(
        Chisato: Client,
        context: any,
        command: any,
        message: MessageSerialize
    ): Promise<void> {
        if (configService.isMaintenance(command.name)) {
            configService.removeMaintenance(command.name);
            await Chisato.sendText(
                context.from,
                `*「 MAINTENANCE 」*\n\n${command.name} is now Online!`,
                message
            );
        } else {
            configService.addMaintenance(command.name);
            await Chisato.sendText(
                context.from,
                `*「 MAINTENANCE 」*\n\n${command.name} is now Maintenance!`,
                message
            );
        }
    }

    private async suggestSimilarCommands(
        Chisato: Client,
        message: MessageSerialize,
        context: any
    ): Promise<void> {
        // Get all command names and aliases
        const allCommands: string[] = [];
        commands.forEach((cmd) => {
            allCommands.push(cmd.name);
            if (cmd.alias && cmd.alias.length > 0) {
                allCommands.push(...cmd.alias);
            }
        });

        // Find similar commands (threshold 60%, max 3 results)
        const similar = StringUtils.findSimilar(
            context.cmd.toLowerCase(),
            allCommands,
            60,
            3
        );

        // If found similar commands, send suggestion
        if (similar.length > 0) {
            let suggestionText = `*「 AUTO CORRECT 」*\n\n` 
            suggestionText += `• Command *${context.cmd}* not found.\n`;
            suggestionText += `└ *Did you mean:*\n`;

            similar.forEach((item, index) => {
                suggestionText += `${index + 1}. ${context.prefix}${
                    item.text
                } (${item.similarity.toFixed(0)}% match)\n`;
            });

            suggestionText += `\n💡 Type ${context.prefix}menu to see all commands`;

            await Chisato.sendText(context.from, suggestionText, message);
        }
    }

    private async handleGroupSettings(
        Chisato: Client,
        message: MessageSerialize,
        context: any
    ): Promise<void> {
        if (!context.isGroup || !context.isBotAdmin) return;

        // Handle anti-link
        await this.antiLinkHandler.handle(
            Chisato,
            message,
            context.isOwner,
            context.isGroupAdmin
        );

        // Handle anti-bot (message-based detection)
        await this.antiBotMessageHandler.handle(
            Chisato,
            message,
            context.isOwner,
            context.isGroupAdmin
        );
    }
}
