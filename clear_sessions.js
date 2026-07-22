import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Connecting to database...");
    const result = await prisma.session.deleteMany({});
    console.log(`Successfully deleted ${result.count} session records.`);
}

main()
    .catch(e => {
        console.error("Error clearing sessions:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
