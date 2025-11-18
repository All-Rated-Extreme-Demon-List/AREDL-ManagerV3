const { SlashCommandBuilder, ChatInputCommandInteraction, ContainerBuilder, SeparatorSpacingSize, TextDisplayBuilder, MessageFlags } = require('discord.js');

module.exports = {
    enabled: true,
    data: new SlashCommandBuilder()
        .setName('pointsadmin')
        .setDefaultMemberPermissions(0)
        .setDescription('Commands for admins to manage the staff points system')
        .addSubcommand((subcommand) =>
            subcommand
                .setName("all")
                .setDescription("View all staff members' points values"))
        .addSubcommand((subcommand) =>
            subcommand
                .setName("set")
                .setDescription("Set the point values of a staff member")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("The user to set the points value for")
                        .setRequired(true)
                )
                .addNumberOption((option) =>
                    option
                        .setName("points")
                        .setDescription("The points value to set")
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(30)
                )
        ).addSubcommand((subcommand) =>
            subcommand
                .setName("transfer")
                .setDescription("Transfer a staff member's points a different staff member")
                .addUserOption((option) =>
                    option
                        .setName("transfer-from")
                        .setDescription("The user whose points will be transfered")
                        .setRequired(true)
                )
                .addUserOption((option) =>
                    option
                        .setName("transfer-to")
                        .setDescription("The user to transfer the points to")
                        .setRequired(true)
                )
                .addIntegerOption((option) =>
                    option
                        .setName("overwrite")
                        .setDescription("Whether to overwrite the recipient's points instead of adding to them")
                        .addChoices(
                            { name: "No", value: 0 },
                            { name: "Yes", value: 1 }
                        )
                        .setRequired(true)
                )
        ).addSubcommand((subcommand) => 
            subcommand
                .setName("clear")
                .setDescription("Clear a staff member's points")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("The user to clear the points for")
                        .setRequired(true)
                )
        ).addSubcommand((subcommand) =>
            subcommand
                .setName("find")
                .setDescription("Find a staff member's points")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("The user to find the points for")
                        .setRequired(true)
                )
        ),
    /** 
     * @param {ChatInputCommandInteraction} interaction
    */
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const { db } = require('../../index.js');
        if (subcommand === "all") {
            const allStats = await db.staff_points.findAll({
                order: [["points", "DESC"]],
            });
            const container = new ContainerBuilder()
                .setAccentColor(0x75c8ff)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("## Staff Points"),
                )
                .addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small))
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(
                            allStats.length == 0 ? "No data." : allStats.map((stat) => `<@${stat.user}> - _\`${Math.round(stat.points * 100) / 100}\` points_`).join("\n")
                        )
                );

            return await interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        } else if (subcommand === "find") {
            const user = interaction.options.getUser("user");
            const [points, _] = await db.staff_points.findOrCreate({ where: { user: user.id } });
            return await interaction.editReply(
                `<@${user.id}> has ${Math.round(points.points * 100) / 100} points.`
            )
        } else if (subcommand === "set") {
            const user = interaction.options.getUser("user");
            const points = interaction.options.getNumber("points");
            const [entry, created] = await db.staff_points.findOrCreate({
                where: {
                    user: user.id,
                },
                defaults: {
                    points: points,
                },
            });

            if (!created) {
                entry.points = points;
                entry.save();
            }
            return await interaction.editReply(
                `:white_check_mark: Set points for <@${user.id}> to ${Math.round(points * 100) / 100}.`
            )

        } else if (subcommand === "transfer") {
            const transferFrom = interaction.options.getUser("transfer-from");
            const transferTo = interaction.options.getUser("transfer-to");
            const overwrite = interaction.options.getInteger("overwrite") === 1;
            const transferFromPoints = await db.staff_points.findOne({ where: { user: transferFrom.id } });
            if (!transferFromPoints) {
                return await interaction.editReply(
                    `:x: <@${transferFrom.id}> does not have any points.`
                )
            }
            const [transferToPoints, _] = await db.staff_points.findOrCreate({
                where: { user: transferTo.id },
                defaults: { points: 0 }
            });
            
            transferToPoints.points = overwrite 
                ? transferFromPoints.points 
                : Math.min(transferToPoints.points + transferFromPoints.points, 30);
            
            transferToPoints.save();
            transferFromPoints.destroy();
            return await interaction.editReply(
                `:white_check_mark: Transferred points from <@${transferFrom.id}> to <@${transferTo.id}>. <@${transferTo.id}> now has ${Math.round(transferToPoints.points * 100) / 100} points.`
            )
        } else if (subcommand === "clear") {
            const user = interaction.options.getUser("user");
            const points = await db.staff_points.findOne({ where: { user: user.id } });
            if (!points) {
                return await interaction.editReply(
                    `:x: <@${user.id}> does not have any points.`
                )
            }
            points.destroy();
            return await interaction.editReply(
                `:white_check_mark: Cleared points for <@${user.id}>.`
            )
        }
        
    },
};
