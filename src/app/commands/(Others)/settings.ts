import { db } from "@/db/prisma";
import { ChatInputCommand, CommandData } from "commandkit";
import { ApplicationCommandOptionType } from "discord.js";
import { commandGuilds } from "@/util/commandGuilds";

export const metadata = commandGuilds();

export const command: CommandData = {
    name: "settings",
    description: "Command to configure some settings",
    options: [
        {
            name: "shift-pings",
            type: ApplicationCommandOptionType.String,
            description: "Get a ping when a shift of yours starts",
            choices: [
                { name: "On", value: "on" },
                { name: "Off", value: "off" },
            ],
            required: false,
        },
    ],
};

export const chatInput: ChatInputCommand = async ({ interaction }) => {
    await interaction.deferReply({ ephemeral: true });
    const shiftPings = interaction.options.getString("shift-pings") === "on";

    await db.settings.upsert({
        where: { user: interaction.user.id },
        create: {
            user: interaction.user.id,
            shiftPings,
        },
        update: { shiftPings },
    });

    await interaction.editReply(`:white_check_mark: Updated!`);
};
