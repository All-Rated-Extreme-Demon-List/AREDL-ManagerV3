import { ChatInputCommand, CommandData } from "commandkit";
import { MessageFlags } from "discord.js";
import { db } from "@/db/prisma";
import { commandGuilds } from "@/util/commandGuilds";

export const command: CommandData = {
    name: "points",
    description: "View your total Pukeko Points",
};

export const metadata = commandGuilds();

export const chatInput: ChatInputCommand = async ({ interaction }) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const user = await db.staff_points.upsert({
        create: {
            user: interaction.user.id
        },
        where: {
            user: interaction.user.id
        },
        update: {}
    })

    return await interaction.editReply(
        `You have **${Math.round(user.points * 100) / 100}** Pukeko Points.`
    );
};
