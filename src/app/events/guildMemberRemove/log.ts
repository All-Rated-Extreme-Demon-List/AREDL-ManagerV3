import { guildId } from "@/config";
import { EventHandler } from "commandkit";
import { db } from "@/db/prisma";

const handler: EventHandler<"guildMemberRemove"> = async (member) => {
    if (member.guild.id != guildId) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await db.dailystats.upsert({
        create: {
            date: today,
            nbMembersJoined: 0,
            nbMembersLeft: 1,
        },
        update: { nbMembersLeft: { increment: 1 } },
        where: { date: today },
    });
};

export default handler;
