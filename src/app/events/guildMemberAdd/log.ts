import { EventHandler } from "commandkit";
import { guildId } from "@/../config.json";
import { db } from "@/db/prisma";

const handler: EventHandler<"guildMemberAdd"> = async (member) => {
    if (member.guild.id != guildId) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await db.dailystats.upsert({
        create: {
            date: today,
            nbMembersJoined: 1,
            nbMembersLeft: 0,
        },
        update: { nbMembersJoined: { increment: 1 } },
        where: { date: today },
    });
};

export default handler;
