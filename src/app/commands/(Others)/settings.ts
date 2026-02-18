import { settingsTable } from "@/db/schema";
import { ChatInputCommand, CommandData } from "commandkit";
import { ApplicationCommandOptionType } from "discord.js";
import { db } from "@/app";
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
    const shiftPings = interaction.options.getString("shift-pings");

    await db
        .insert(settingsTable)
        .values({
            user: interaction.user.id,
            shiftPings: shiftPings === "on" ? true : false,
        })
        .onConflictDoUpdate({
            target: settingsTable.user,
            set: {
                shiftPings: shiftPings === "on" ? true : false,
            },
        });

    await interaction.editReply(`:white_check_mark: Updated!`);
};
