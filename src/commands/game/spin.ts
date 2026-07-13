import type { ConfigCommands } from "../../types/structure/commands";
import { Database } from "../../libs/database/prisma";
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
        await Chisato.sendText(groupId, "❌ No players in the lobby! Have people join with `!join <Name> <M/F/O>`.");
        return;
    }

    const target = players[Math.floor(Math.random() * players.length)];
    const question = pickQuestion(target.gender);

    // Send the spinning animation (MP4 as GIF), or a text fallback.
    const videoPath = path.join(process.cwd(), "public", "bottle-spin.mp4");
    if (fs.existsSync(videoPath)) {
        await Chisato.sendVideo(groupId, fs.readFileSync(videoPath), true, "🍾 Spinning...");
    } else {
        await Chisato.sendText(groupId, "🍾 Spinning... 🔄");
    }

    // Wait 2 s so the animation plays before announcing the result.
    setTimeout(async () => {
        try {
            await Database.gameRoom.update({
                where: { id: room.id },
                data: { status: "waiting_for_reply", currentPlayerId: target.userId, currentQuestion: question.text }
            });

            await Chisato.sendTextWithMentions(
                groupId,
                `👉 @${target.userId.split("@")[0]} (*${target.name}*), the bottle landed on you!\n\n` +
                `*Question:*\n${question.text}\n\n` +
                `Reply in the chat to continue!`,
                [target.userId]
            );
        } catch (error) {
            logger.error(`performSpin (inner): ${error instanceof Error ? error.message : String(error)}`);
        }
    }, 2000);
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
