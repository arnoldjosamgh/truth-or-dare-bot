import type { ConfigCommands } from "../../types/structure/commands";
import { Database } from "../../libs/database/prisma";
import { configService } from "../../core/config/config.service";
import { logger } from "../../core/logger";
import * as fs from "fs";
import * as path from "path";

// Loaded once at startup and cached for the process lifetime.
let questionCache: { text: string; gender_target: string }[] | null = null;

const loadQuestions = () => {
    if (questionCache) return questionCache;
    const qPath = path.join(process.cwd(), "public", "questions.json");
    questionCache = fs.existsSync(qPath)
        ? JSON.parse(fs.readFileSync(qPath, "utf8"))
        : [{ text: "What is your biggest secret?", gender_target: "neutral" }];
    return questionCache!;
};

const pickQuestion = (gender: string) => {
    const all = loadQuestions();
    const filtered = all.filter(q =>
        q.gender_target === "neutral" || q.gender_target.toUpperCase().startsWith(gender)
    );
    const pool = filtered.length > 0 ? filtered : all;
    return pool[Math.floor(Math.random() * pool.length)];
};

/** Called both by the `!spin` command and the auto-loop in GameListener. */
export const performSpin = async (Chisato: any, groupId: string, room: any) => {
    const players = await Database.gamePlayer.findMany({ where: { roomId: room.id } });
    if (players.length === 0) {
        await Chisato.sendText(groupId, "❌ No players registered yet!\n\n@mention me to join: e.g. *@bot* then follow the prompts for your name and gender.");
        return;
    }
    if (players.length < 2) {
        await Chisato.sendText(groupId, `⚠️ Only *1 player* registered (${players[0].name}). Need at least 2 to spin!\n\nOthers can @mention me to join.`);
        return;
    }

    const target = players[Math.floor(Math.random() * players.length)];
    const question = pickQuestion(target.gender);

    await Chisato.sendText(groupId, "🍾 Spinning... 🔄");

    // Wait slightly so the animation text shows before announcing the result.
    setTimeout(async () => {
        try {
            await Database.gameRoom.update({
                where: { id: room.id },
                data: { status: "waiting_for_reply", currentPlayerId: target.userId, currentQuestion: question.text }
            });

            const sponsorText = configService.getConfig().settings?.sponsorText
                ? `\n\n_Sponsor:_ ${configService.getConfig().settings.sponsorText}`
                : "";
            
            await Chisato.sendText(
                groupId,
                `👉 @${target.userId.split("@")[0]} (*${target.name}*), the bottle landed on you!\n\n` +
                `*Question:*\n${question.text}\n\n` +
                `Reply in the chat to continue!${sponsorText}`,
                undefined,
                { mentions: [target.userId] } as any
            );
        } catch (error) {
            logger.error(`performSpin (inner): ${error instanceof Error ? error.message : String(error)}`);
        }
    }, 1000);
};



export default {
    name: "spin",
    alias: ["startgame"],
    category: "game",
    description: "Spin the bottle and pick a random player.",
    async run({ Chisato, from, message }) {
        try {
            const room = await Database.gameRoom.findFirst({
                where: { groupId: from, status: { in: ["lobby", "playing", "waiting_for_reply"] } }
            });

            if (!room) {
                await Chisato.sendText(from, "❌ No active game in this group. Start one with `!startgame`.", message);
                return;
            }

            if (room.status === "waiting_for_reply") {
                await Chisato.sendText(from, "⏳ Waiting for the current player to answer first!", message);
                return;
            }

            await Database.gameRoom.update({ where: { id: room.id }, data: { status: "playing" } });
            await performSpin(Chisato, from, room);
        } catch (error) {
            logger.error(`spin: ${error instanceof Error ? error.message : String(error)}`);
            await Chisato.sendText(from, "❌ Something went wrong. Please try again.", message);
        }
    },
} satisfies ConfigCommands;
