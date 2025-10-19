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
		.setDescription('Sync all roles from your profile to your account')
        .addNumberOption(option => 
            option.setName('stack')
                .setDescription('For points, pack, and top level roles, ')
                .setChoices([
                    { name: 'On', value: 1 },
                    { name: 'Off', value: 0 },
                ])
        ),
	async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        // do not stack if stack is explicitly set to "off", otherwise stack
        const shouldStack = interaction.options.getNumber('stack') !== 0;

        // placeholder, sphericle's user id on the dev api
        const userId = "71dcba84-55e6-48cf-a826-08ad1bf15abd";
        const profileReq = await api.send(`/aredl/profile/${userId}`);
        if (profileReq.error) {
            logger.error("Sync roles - Error fetching profile:", profileReq.data.message);
            return interaction.editReply(`Error fetching profile: ${profileReq.data.message}`);
        }
        const profile = profileReq.data;
        const addedRoles = []

        // remove all roles to account for different stacking preferences
        // otherwise stacked roles will never be removed automatically
        // if the user later decides to resync without stacking
        const rolesToRemove = [
            ...Object.values(pointsRoleIDs),
            ...Object.values(packRoleIDs),
            ...Object.values(topLevelRoleIDs),
            extremeGrinderRoleID,
            opinionPermsRoleID,
            creatorRoleID,
            verifierRoleID
        ]
        await interaction.member.roles.remove(rolesToRemove);

        const addRoles = (roleIds) => {
            for (const roleId of roleIds) {
                if (!interaction.guild.roles.cache.hasAny(roleId)) {
                    logger.warn(`Role sync - Role ${roleId} not found in server`)
                    return
                }
                interaction.member.roles.add(roleId);
                addedRoles.push(`- <@&${roleId}>`);
            }
        }

        const processRoleType = (roleData, requirement) => {
            const rolesToAdd = [];
            Object.entries(roleData).forEach(([k, v]) => {
                // if the key is not a number, assume it's a string
                if (requirement(!isNaN(Number(k)) ? parseInt(k) : k)) rolesToAdd.push(v);
            })
            if (rolesToAdd.length === 0) return;
            if (shouldStack) {
                addRoles(rolesToAdd);
            } else {
                // only add the last role in the array
                addRoles([rolesToAdd[rolesToAdd.length - 1]]);
            }
        }
        
        // Points roles
        processRoleType(pointsRoleIDs, (req) => profile.rank.total_points >= req);
        // Pack roles
        processRoleType(packRoleIDs, (req) => profile.packs.length >= req);
        // Top level roles
        const records = [...profile.records, ...profile.verified];
        processRoleType(topLevelRoleIDs, (req) => records.some(record => record.level.position <= req));
        // Opinion perms
        if (profile.rank.extremes >= 10) {
            addRoles([opinionPermsRoleID])
        }
        // Creator role
        if (profile.created.length > 0) {
            addRoles([creatorRoleID])
        }
        // Verifier role
        if (profile.verified.length > 0) {
            addRoles([verifierRoleID])
        }
        // Extreme Grinder role
        if (profile.rank.extremes >= 50) {
            addRoles([extremeGrinderRoleID])
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
