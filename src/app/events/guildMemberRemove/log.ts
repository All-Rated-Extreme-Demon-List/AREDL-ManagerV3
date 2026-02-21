import { guildId } from "@/../config.json";
import { EventHandler } from "commandkit";
import { db } from "@/db/prisma";

const handler: EventHandler<"guildMemberRemove"> = async (member) => {
    if (member.guild.id != guildId) return;

    const todayMs = new Date().setHours(0, 0, 0, 0);
    await db.dailyStats.upsert({
        create: {
            id: todayMs,
            date: todayMs,
            nbMembersJoined: 0,
            nbMembersLeft: 1,
        },
        update: { nbMembersLeft: { increment: 1 }},
        where: { id: todayMs }
    })
};

export default handler;
