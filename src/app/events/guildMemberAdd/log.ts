import { EventHandler } from "commandkit";
import { guildId } from "@/../config.json";
import { db } from "@/app";
import { dailyStatsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

const handler: EventHandler<"guildMemberAdd"> = async (member) => {
    if (member.guild.id != guildId) return;

    const stat = await db
        .insert(dailyStatsTable)
        .values({
            date: new Date(),
        })
        .onConflictDoNothing()
        .returning()
        .get();

    await db
        .update(dailyStatsTable)
        .set({ nbMembersJoined: stat.nbMembersJoined + 1 })
        .where(eq(dailyStatsTable.date, stat.date));
};

export default handler;
