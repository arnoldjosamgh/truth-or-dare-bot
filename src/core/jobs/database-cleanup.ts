import { Cron } from "croner";
import { Database } from "../../libs/database/prisma";
import { logger } from "../logger";

const RETENTION_DAYS = 30;

export const startDatabaseCleanupJob = () => {
    // Fires at midnight on the 1st of every month.
    Cron("0 0 1 * *", async () => {
        try {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

            const staleRooms = await Database.gameRoom.findMany({
                where: { createdAt: { lt: cutoff } },
                select: { id: true }
            });

            if (staleRooms.length === 0) {
                logger.info("Monthly cleanup: no stale game rooms found.");
                return;
            }

            const roomIds = staleRooms.map(r => r.id);

            const [players, rooms] = await Promise.all([
                Database.gamePlayer.deleteMany({ where: { roomId: { in: roomIds } } }),
                Database.gameRoom.deleteMany({ where: { id: { in: roomIds } } })
            ]);

            logger.info(`Monthly cleanup: removed ${rooms.count} rooms and ${players.count} players older than ${RETENTION_DAYS} days.`);
        } catch (error) {
            logger.error(`Monthly cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    });

    logger.connect("Monthly database cleanup job scheduled (runs on the 1st of each month).");
};
