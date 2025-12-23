const {
    SlashCommandBuilder,
    ContainerBuilder,
    MessageFlags,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    ChatInputCommandInteraction,
} = require('discord.js');

const { guildId, noPingListRoleID } = require('../../config.json');

const mapToStr = (data) => {
    if (data.length === 0) {
        return '*None!*';
    } else {
        return data
            .map(
                (entry) =>
                    `- <@${entry.userId}>${entry.notes ? ` (${entry.notes})` : ''}`
            )
            .join('\n');
    }
};

module.exports = {
    enabled: true,
    data: new SlashCommandBuilder()
        .setName('nopinglist')
        .setDescription('No Ping List management')
        .addSubcommand((subcommand) =>
            subcommand
                .setName('view')
                .setDescription('Retrieve the No Ping List')
                .addStringOption((option) =>
                    option
                        .setName('filter')
                        .setDescription(
                            'Filter by only No Ping List or opinion banned users'
                        )
                        .addChoices([
                            { name: 'No Ping List', value: 'npl' },
                            { name: 'Banned', value: 'banned' },
                        ])
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('add')
                .setDescription('Add a user to the No Ping List')
                .addUserOption((option) =>
                    option
                        .setName('user')
                        .setDescription('The user to add')
                        .setRequired(true)
                )
                .addNumberOption((option) =>
                    option
                        .setName('banned')
                        .setDescription(
                            'Whether this user should be opinion banned'
                        )
                        .addChoices([
                            { name: 'Yes', value: 1 },
                            { name: 'No', value: 0 },
                        ])
                )
                .addStringOption((option) =>
                    option
                        .setName('notes')
                        .setDescription('Extra info about this user')
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('remove')
                .setDescription('Remove a user from the No Ping List')
                .addUserOption((option) =>
                    option
                        .setName('user')
                        .setDescription('The user to remove')
                        .setRequired(true)
                )
        ),
    /**
     * @param {ChatInputCommandInteraction} interaction The interaction object
     */
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const subcommand = interaction.options.getSubcommand();
        const { db } = require('../../index.js');
        if (subcommand === 'view') {
            const allUsers = await db.noPingList.findAll();
            const banned = [];
            const noPingList = [];
            for (const user of allUsers) {
                if (user.banned) banned.push(user);
                else noPingList.push(user);
            }
            const container = new ContainerBuilder()
                .setAccentColor(0xff0000)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## No Ping List`),
                    new TextDisplayBuilder().setContent(
                        `There are ${allUsers.length} players in the No Ping List.`
                    )
                )
                .addSeparatorComponents((separator) =>
                    separator.setSpacing(SeparatorSpacingSize.Small)
                )

                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        '**__Opinion Banned__**'
                    ),
                    new TextDisplayBuilder().setContent(mapToStr(banned)),
                    new TextDisplayBuilder().setContent('**__No Ping List__**'),
                    new TextDisplayBuilder().setContent(mapToStr(noPingList))
                );
            return await interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [container],
            });
        } else if (subcommand === 'add') {
            const user = interaction.options.getUser('user', true);
            const banned = interaction.options.getNumber('banned') === 1;
            const notes = interaction.options.getString('notes');

            const [entry, created] = await db.noPingList.findOrCreate({
                where: { userId: user.id },
                defaults: {
                    banned: banned,
                    notes: notes,
                },
            });

            if (!created) {
                entry.banned = banned;
                entry.notes = notes;
                entry.save();
            }

            await interaction.guild.members.cache
                .get(user.id)
                .roles.add(noPingListRoleID);

            await interaction.editReply(
                `:white_check_mark: ${user} has been ${banned ? 'opinion banned' : 'added to the No Ping List'}!`
            );
        } else if (subcommand === 'remove') {
            const user = interaction.options.getUser('user', true);

            const entry = await db.noPingList.findOne({
                where: { userId: user.id },
            });
            if (!entry) {
                return await interaction.editReply(
                    `:x: ${user} is not on the No Ping List.`
                );
            }

            await entry.destroy();
            await interaction.guild.members.cache
                .get(user.id)
                .roles.remove(noPingListRoleID);

            await interaction.editReply(
                `:white_check_mark: ${user} has been removed from the No Ping List!`
            );
        }
    },
};
