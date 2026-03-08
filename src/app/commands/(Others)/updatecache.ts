import type { ChatInputCommand, CommandData } from "commandkit";
import { commandGuilds } from "@/util/commandGuilds";
import { guildId, staffGuildId, enableSeparateStaffServer } from "@/config";

export const metadata = commandGuilds();

export const command: CommandData = {
    name: "updatecache",
    description: "Update the bot's cache",
    default_member_permissions: "0", // admin only
};

export const chatInput: ChatInputCommand = async ({ interaction }) => {
    await interaction.deferReply({ ephemeral: true });

    await interaction.editReply("Updating guilds cache...");
    const guild = await interaction.client.guilds.fetch(guildId);
    const staffGuild =
        enableSeparateStaffServer && staffGuildId
            ? await interaction.client.guilds.fetch(staffGuildId)
            : null;

    await interaction.editReply("Updating channels cache...");
    await guild.channels.fetch();
    if (staffGuild) {
        await staffGuild.channels.fetch();
    }

    await interaction.editReply("Updating members cache...");
    await guild.members.fetch();
    if (staffGuild) {
        await staffGuild.members.fetch();
    }

    await interaction.editReply("Updating roles cache...");
    await guild.roles.fetch();
    if (staffGuild) {
        await staffGuild.roles.fetch();
    }

    await interaction.editReply(":white_check_mark: Cache updated successfully!");
};
