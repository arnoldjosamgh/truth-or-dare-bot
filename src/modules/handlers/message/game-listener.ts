import { Client } from "../../../libs/client/client";
import { MessageSerialize } from "../../../types/structure/serialize";
import { Database } from "../../../libs/database/prisma";
import { logger } from "../../../core/logger";
import { performSpin, getQuestionByText } from "../../../commands/game/spin";
import { getGenderedRoast } from "../../../utils/roasts";

const AUTO_SPIN_DELAY_MS = 15000;

export class GameListener {
    /** Returns true if the message was consumed by the game loop. */
    static async handle(Chisato: Client, message: MessageSerialize, context: any): Promise<boolean> {
        // Only apply in group chats, and skip command messages.
        if (!context.isGroup || context.cmd) return false;

        const room = await Database.gameRoom.findFirst({
            where: { groupId: context.from, status: "waiting_for_reply" }
        });

        // Only react if this is the currently-selected player answering.
        if (!room || room.currentPlayerId !== context.sender) return false;

        try {
            // Check if player is dodging with a vague non-answer
            const textLower = context.body?.toLowerCase().trim() || "";
            const isDodging = /^(how|what|what\?|where|when|who|with who|with whom|huh|what do you mean|explain|wdym|idk|i don'?t (know|understand)|which|say that again|repeat|come again)\??$/i.test(textLower);

            if (isDodging) {
                // Look up player gender for a targeted roast
                const player = await Database.gamePlayer.findFirst({
                    where: { roomId: room.id, userId: context.sender },
                    select: { gender: true }
                });
                const roast = getGenderedRoast(player?.gender);
                await Chisato.sendText(
                    context.from,
                    `😂 @${context.sender.split("@")[0]} — *${roast}*\n\n_The question is still yours. Answer it!_ 🎯`,
                    message,
                    { mentions: [context.sender] } as any
                );
                return true; // Don't advance game state — they still have to answer
            }

            await Database.gameRoom.update({
                where: { id: room.id },
                data: { status: "playing", currentPlayerId: null, currentQuestion: null }
            });

            await Chisato.sendText(
                context.from,
                `✅ *${context.pushName ?? "Player"}* answered! React, comment, roast...\n_Next spin in ${AUTO_SPIN_DELAY_MS / 1000}s_ 🍾`,
                message
            );

            // Auto-spin after the reaction window.
            setTimeout(async () => {
                try {
                    const current = await Database.gameRoom.findUnique({ where: { id: room.id } });
                    if (current?.status === "playing") {
                        await performSpin(Chisato, context.from, current);
                    }
                } catch (error) {
                    logger.error(`GameListener auto-spin: ${error instanceof Error ? error.message : String(error)}`);
                }
            }, AUTO_SPIN_DELAY_MS);

            return true;
        } catch (error) {
            logger.error(`GameListener: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }
}
