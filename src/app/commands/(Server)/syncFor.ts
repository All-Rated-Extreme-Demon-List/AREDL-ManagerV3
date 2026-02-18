import { ChatInputCommand, CommandData } from "commandkit";
import { syncRoles } from "./syncRoles";
import { MessageFlags, ApplicationCommandOptionType } from "discord.js";
import { commandGuilds } from "@/util/commandGuilds";

export const metadata = commandGuilds();

export const command: CommandData = {
    name: "syncfor",
    description: "Sync roles for another user",
    options: [
        {
            name: "user",
            description: "The user to sync the roles of",
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: "stack",
            description: "Whether to stack points, pack, and top level roles",
            type: ApplicationCommandOptionType.Number,
            required: false,
            choices: [
                { name: "On", value: 1 },
                { name: "Off", value: 0 },
            ],
        },
    ],
};

export const chatInput: ChatInputCommand = async ({ interaction }) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const guildMember = interaction.guild?.members.cache.get(
        interaction.options.getUser("user", true).id
    );
    if (!guildMember) {
        return await interaction.editReply(
            ":x: Could not fetch the specified user's member data."
        );
    }
    return await syncRoles(interaction, guildMember);
};
