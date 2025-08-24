const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	enabled: true,
	data: new SlashCommandBuilder()
		.setName('settings')
		.setDefaultMemberPermissions(0)
		.setDescription('Bot ping measurements')
        .addStringOption(option => 
            option
                .setName('shift-pings')
                .setDescription('Get a ping when a shift of yours starts')
                .setChoices([
                    { name: 'On', value: 'on' },
                    { name: 'Off', value: 'off' },
                ])
        ),
	async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const { db } = require('../../index.js');
        const shiftPings = interaction.options.getString('shift-pings');
        if (shiftPings) {
            const enabled = shiftPings === "on";
            const existing = await db.settings.findOne({
                where: {
                    user: interaction.user.id
                }
            })
            if (existing) {
                existing.shiftPings = enabled;
                await existing.save();
            } else {
                await db.settings.create({
                    user: interaction.user.id,
                    shiftPings: enabled
                });
            }
        }
        await interaction.editReply(`:white_check_mark: Updated!`);

	},
};