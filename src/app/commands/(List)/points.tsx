import { ChatInputCommand, CommandData } from "commandkit";
import { MessageFlags } from "discord.js";
import { defaultPoints } from "@/../config.json";
import { staffPointsTable } from "@/db/schema";
import { db } from "@/app";
import { commandGuilds } from "@/util/commandGuilds";

export const command: CommandData = {
    name: "points",
    description: "View your total Pukeko Points",
};

export const metadata = commandGuilds();

export const chatInput: ChatInputCommand = async ({ interaction }) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const user = await db
        .insert(staffPointsTable)
        .values({
            user: interaction.user.id,
            points: defaultPoints,
        })
        .onConflictDoNothing()
        .returning()
        .get();

    return await interaction.editReply(
        `You have **${Math.round(user.points * 100) / 100}** Pukeko Points.`
    );
};
