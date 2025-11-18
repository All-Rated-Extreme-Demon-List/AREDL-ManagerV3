const { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } = require('discord.js');

module.exports = {
    enabled: true,
    data: new SlashCommandBuilder()
        .setName('points')
        .setDescription('View your total Pukeko Points.'),
    /** 
     * @param {ChatInputCommandInteraction} interaction
    */
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const { db } = require('../../index.js');
        const [user, _] = await db.staff_points.findOrCreate({ 
            where: { user: interaction.user.id }
        });
        return await interaction.editReply(`You have **${Math.round(user.points * 100) / 100}** Pukeko Points.`);
    },
};