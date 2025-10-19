const { SlashCommandBuilder, TextDisplayBuilder, MessageFlags, ContainerBuilder, SeparatorSpacingSize } = require('discord.js');
const { api } = require("../../api.js");
const {
    pointsRoleIDs,
    packRoleIDs,
    topLevelRoleIDs,
    extremeGrinderRoleID,
    opinionPermsRoleID,
    creatorRoleID,
    verifierRoleID
} = require('../../config.json');
const logger = require("log4js").getLogger()

module.exports = {
	enabled: true,
	data: new SlashCommandBuilder()
		.setName('syncroles')
		.setDescription('Sync all roles from your profile to your account'),
	async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const member = interaction.member;

        // placeholder, sphericle's user id on the dev api
        const userId = "71dcba84-55e6-48cf-a826-08ad1bf15abd";
        const profileReq = await api.send(`/aredl/profile/${userId}`);
        if (profileReq.error) {
            logger.error("Sync roles - Error fetching profile:", profileReq.data.message);
            return interaction.editReply(`Error: ${profileReq.data.message}`);
        }
        const profile = profileReq.data;

        const addedRoles = []

        const beforeRoles = await member.roles.cache.map((role) => role.id);
        const serverRoles = interaction.guild.roles.cache;

        const addRole = (roleId) => {
            if (!serverRoles.hasAny(roleId)) {
                logger.warn(`Role sync - Role ${roleId} not found in server`)
                return
            }
            // avoid adding a role the user already has
            if (!beforeRoles.includes(roleId)) {
                member.roles.add(roleId);
                addedRoles.push(`- <@&${roleId}>`);
            }
        }
        
        // Points roles
        Object.entries(pointsRoleIDs).forEach(([points, roleId]) => {
            if (profile.rank.total_points >= parseInt(points)) {
                addRole(roleId)
            }
        })
        // Pack roles
        Object.entries(packRoleIDs).forEach(([packCount, roleId]) => {
            if (profile.packs.length >= parseInt(packCount)) {
                addRole(roleId)
            }
        })
        // Top level roles
        const records = [...profile.records, ...profile.verified];
        Object.entries(topLevelRoleIDs).forEach(([rank, roleId]) => {
            if (records.some(record => record.level.position <= parseInt(rank))) {
                addRole(roleId)
            }
        })
        // Opinion perms
        if (profile.rank.extremes >= 10) {
            addRole(roleId)
        }
        // Creator role
        if (profile.created.length > 0) {
            addRole(roleId)
        }
        // Verifier role
        if (profile.verified.length > 0) {
            addRole(roleId)
        }
        // Extreme Grinder role
        if (profile.rank.extremes >= 50) {
            addRole(roleId)
        }

        const container = new ContainerBuilder().setAccentColor(0x00ff00);
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### :white_check_mark: Roles synced!`)
        );
        container.addSeparatorComponents((separator) =>
            separator.setSpacing(SeparatorSpacingSize.Small)
        );
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**Added roles:**`),
            new TextDisplayBuilder().setContent(addedRoles.length === 0 ? 'No new roles!' : addedRoles.join('\n'))
        )
        return await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
        });
	},
};
