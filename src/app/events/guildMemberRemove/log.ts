import { guildId } from "@/../config.json";
import { EventHandler } from "commandkit";
import { dailyStatsTable } from "@/db/schema";
import { db } from "@/app";
import { eq } from "drizzle-orm";

const handler: EventHandler<"guildMemberRemove"> = async (member) => {
    if (member.guild.id != guildId) return;

    const entry = await db
        .insert(dailyStatsTable)
        .values({
            date: new Date(),
        })
        .onConflictDoNothing()
        .returning()
        .get();

    await db
        .update(dailyStatsTable)
        .set({ nbMembersLeft: entry.nbMembersLeft + 1 })
        .where(eq(dailyStatsTable.date, entry.date));
};

export default handler;
