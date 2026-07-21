import type { ConfigCommands } from "../../types/structure/commands";
import { Database } from "../../libs/database/prisma";
import { configService } from "../../core/config/config.service";
import { logger } from "../../core/logger";
import * as fs from "fs";
import * as path from "path";
import { randomSevereRoast } from "../../utils/roasts";

// Loaded once at startup and cached for the process lifetime.
let questionCache: { text: string; gender_target: string; explanation?: string }[] | null = null;

const loadQuestions = () => {
    if (questionCache) return questionCache;
    const qPath = path.join(process.cwd(), "public", "questions.json");
    questionCache = fs.existsSync(qPath)
        ? JSON.parse(fs.readFileSync(qPath, "utf8"))
        : [{ text: "What is your biggest secret?", gender_target: "neutral" }];
    return questionCache!;
};

export const getQuestionByText = (text: string) => {
    const all = loadQuestions();
    return all.find((q) => q.text === text);
};

/**
 * Picks a question for the target player that:
 * 1. Matches their gender (male / female / neutral)
 * 2. Has NOT been shown yet this game session
 * 3. Resets the used-list and starts fresh if every suitable question has been shown
 */
const pickQuestion = (gender: string, room: any) => {
    const all = loadQuestions();

    // Build gender-appropriate pool
    const genderUpper = gender.toUpperCase();
    const genderPool = all.filter(q =>
        q.gender_target === "neutral" ||
        q.gender_target?.toUpperCase().startsWith(genderUpper)
    );
    const pool = genderPool.length > 0 ? genderPool : all;

    const used: number[] = Array.isArray(room.usedQuestionIds) ? room.usedQuestionIds : [];

    // Filter out already-used questions
    let fresh = pool.filter(q => !used.includes(q.id));

    // If we've exhausted the pool, reset
    if (fresh.length === 0) {
        fresh = pool;
    }

    return fresh[Math.floor(Math.random() * fresh.length)];
};

const NAG_TIMEOUT_MS = 30 * 1000; // nag after 30 seconds

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
    const question = pickQuestion(target.gender, room);

    await Chisato.sendText(groupId, "🍾 Spinning... 🔄");

    // Wait slightly so the animation text shows before announcing the result.
    setTimeout(async () => {
        try {
            // Track this question as used, reset if all exhausted
            const currentUsed: number[] = Array.isArray(room.usedQuestionIds) ? room.usedQuestionIds : [];
            const nowUsed = currentUsed.includes(question.id) ? [] : [...currentUsed, question.id];

            await Database.gameRoom.update({
                where: { id: room.id },
                data: {
                    status: "waiting_for_reply",
                    currentPlayerId: target.userId,
                    currentQuestion: question.text,
                    usedQuestionIds: nowUsed
                }
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

            // ── Nag timer: wait 30s, if no answer, send severe roast and wait ──────────
            const nagTimer = setTimeout(async () => {
                try {
                    const current = await Database.gameRoom.findUnique({ where: { id: room.id } });
                    // Stop nagging if the room no longer exists or they already answered/skipped
                    if (!current || current.status !== "waiting_for_reply" || current.currentPlayerId !== target.userId) {
                        return;
                    }
                    const roast = randomSevereRoast();
                    await Chisato.sendText(
                        groupId,
                        `@${target.userId.split("@")[0]} ${roast}`,
                        undefined,
                        { mentions: [target.userId] } as any
                    );
                } catch (err) {
                    logger.error(`nag timer: ${err instanceof Error ? err.message : String(err)}`);
                }
            }, NAG_TIMEOUT_MS);

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
