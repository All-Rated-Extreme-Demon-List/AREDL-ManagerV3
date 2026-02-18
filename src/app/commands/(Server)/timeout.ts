import {
    ApplicationCommandOptionType,
    GuildMemberRoleManager,
} from "discord.js";
import { timeoutLogsChannelID } from "@/../config.json";
import { ChatInputCommand, CommandData, Logger } from "commandkit";
import { commandGuilds } from "@/util/commandGuilds";

export const metadata = commandGuilds();

export const command: CommandData = {
    name: "timeout",
    description: "Timeout a user for a specific duration",
    options: [
        {
            name: "user",
            description: "The user to timeout",
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: "days",
            description: "Amount of days to timeout this user for",
            type: ApplicationCommandOptionType.Integer,
            min_value: 0,
        },
        {
            name: "hours",
            description: "Amount of hours to timeout this user for",
            type: ApplicationCommandOptionType.Integer,
            min_value: 0,
            max_value: 23,
        },
        {
            name: "minutes",
            description: "Amount of minutes to timeout this user for",
            type: ApplicationCommandOptionType.Integer,
            min_value: 0,
            max_value: 59,
        },
        {
            name: "reason",
            description: "Reason for the timeout",
            type: ApplicationCommandOptionType.String,
        },
    ],
};

export const chatInput: ChatInputCommand = async ({ interaction }) => {
    await interaction.deferReply();
    const user = interaction.options.getUser("user", true);
    const member = interaction.guild?.members.cache.get(user.id);
    if (!member) {
        return interaction.editReply(":x: User not found in this server.");
    }

    if (!(interaction.member?.roles instanceof GuildMemberRoleManager)) {
        return interaction.editReply(
            ":x: Error timing this user out: could not fetch your roles."
        );
    }

    // - bot permission checks
    // check if the bot has permissions to timeout the target user
    if (!member.manageable || !member.moderatable) {
        return interaction.editReply(
            ":x: I do not have permission to time this user out."
        );
    }
    // check if this user is already timed out
    if (member.isCommunicationDisabled()) {
        return interaction.editReply(":x: This user is already timed out.");
    }

    // - moderator permission checks
    // check if the moderator has permission to timeout members
    if (!interaction.memberPermissions?.has("ModerateMembers")) {
        return interaction.editReply(
            ":x: You do not have permission to timeout members."
        );
    }
    // check role hierarchy
    if (
        (interaction.member?.roles as GuildMemberRoleManager).highest
            ?.position <= member.roles.highest?.position
    ) {
        return interaction.editReply(
            ":x: You cannot timeout a user with an equal or higher role than you."
        );
    }

    // duration calculations
    const days = interaction.options.getInteger("days") || 0;
    const hours = interaction.options.getInteger("hours") || 0;
    const minutes = interaction.options.getInteger("minutes") || 0;
    if (days === 0 && hours === 0 && minutes === 0) {
        return interaction.editReply(
            ":x: Please specify a duration for the timeout (days, hours, minutes)."
        );
    }
    const duration =
        days * 24 * 60 * 60 * 1000 +
        hours * 60 * 60 * 1000 +
        minutes * 60 * 1000;
    const durationStr = `\`${days}d ${hours}h ${minutes}m\``;

    const reason =
        interaction.options.getString("reason") || "No reason provided";
    const logStr = `${member.user.tag} (\`${member.id}\`) was timed out by ${
        interaction.user.tag
    } (\`${interaction.user.id}\`) for ${durationStr}.\nReason: \`${reason}\``;

    const timeout = await member.timeout(duration, logStr).catch(() => null);
    if (!timeout) {
        return interaction.editReply(
            ":x: Failed to timeout the user. Please check my permissions and try again."
        );
    }

    // log timeout
    const logChannel =
        interaction.guild?.channels.cache.get(timeoutLogsChannelID);
    if (logChannel && logChannel.isTextBased()) {
        logChannel
            .send(logStr)
            .catch((e) =>
                Logger.error(
                    `/timeout - Failed to send timeout log message: ${e}`
                )
            );
    } else {
        Logger.warn(
            `Timeout log channel with ID ${timeoutLogsChannelID} not found or is not text-based.`
        );
    }

    // send DM
    const userMsg = `You have been timed out in **${interaction.guild?.name}** for ${durationStr}.\nReason: \`${reason}\``;
    const sent = await user.send(userMsg).catch((e) => {
        Logger.error(`/timeout - Failed to send timeout DM to user: ${e}`);
        return null;
    });

    return await interaction.editReply(
        `:white_check_mark: ${member.user.username} has been timed out for ${durationStr} (until <t:${Math.round(
            (timeout.communicationDisabledUntil?.getTime() ?? 67000) / 1000
        )}:f>).\nReason: \`${reason}\`${sent ? "" : `\n\n:warning: I was unable to send this DM to the user:\n${userMsg}`}`
    );
};
