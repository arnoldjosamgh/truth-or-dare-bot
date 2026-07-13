import { FastifyInstance } from "fastify";
import { Database } from "../../libs/database/prisma";
import { logger } from "../../core/logger";

const VALID_GENDERS = ["M", "F", "O"] as const;

export async function gameRoutes(fastify: FastifyInstance) {
    // GET /api/game/:roomId — fetch room info + players
    fastify.get<{ Params: { roomId: string } }>("/:roomId", async (request, reply) => {
        const { roomId } = request.params;
        try {
            const room = await Database.gameRoom.findUnique({
                where: { roomId },
                include: { players: true }
            });
            if (!room) return reply.status(404).send({ error: "Room not found." });
            return reply.send({ room });
        } catch (error) {
            logger.error(`GET /api/game/${roomId}: ${error instanceof Error ? error.message : String(error)}`);
            return reply.status(500).send({ error: "Internal server error." });
        }
    });

    // POST /api/game/:roomId/join — register a player from the web form
    fastify.post<{
        Params: { roomId: string };
        Body: { name: string; gender: string };
    }>("/:roomId/join", async (request, reply) => {
        const { roomId } = request.params;
        const { name, gender } = request.body ?? {};

        if (!name || typeof name !== "string" || name.trim().length === 0) {
            return reply.status(400).send({ error: "Name is required." });
        }
        if (!gender || !VALID_GENDERS.includes(gender.toUpperCase() as any)) {
            return reply.status(400).send({ error: "Gender must be M, F, or O." });
        }

        const cleanName = name.trim().slice(0, 32);
        const cleanGender = gender.toUpperCase();

        try {
            const room = await Database.gameRoom.findUnique({
                where: { roomId },
                include: { players: true }
            });
            if (!room) return reply.status(404).send({ error: "Room not found." });
            if (room.status !== "lobby") return reply.status(400).send({ error: "This game has already started." });

            // Use name as a unique key for web-joined players (no WhatsApp userId)
            const webUserId = `web:${cleanName.toLowerCase().replace(/\s+/g, "_")}`;
            const existing = room.players.find(p => p.userId === webUserId);
            if (existing) return reply.status(409).send({ error: `${cleanName} is already in the lobby.` });

            const player = await Database.gamePlayer.create({
                data: { userId: webUserId, roomId: room.id, name: cleanName, gender: cleanGender }
            });

            return reply.status(201).send({ player, playerCount: room.players.length + 1 });
        } catch (error) {
            logger.error(`POST /api/game/${roomId}/join: ${error instanceof Error ? error.message : String(error)}`);
            return reply.status(500).send({ error: "Internal server error." });
        }
    });
}
