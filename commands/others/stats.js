const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Sequelize = require('sequelize');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const path = require('path');
const ExcelJS = require('exceljs');
const fs = require('fs');
const logger = require('log4js').getLogger();

module.exports = {
	cooldown: 5,
	enabled: true,
	data: new SlashCommandBuilder()
		.setName('stats')
		.setDescription('Statistics about the server')
		.setDefaultMemberPermissions(0)
		.addSubcommand(subcommand =>
			subcommand
				.setName('servertraffic')
				.setDescription('Shows info about server members traffic')),

	async execute(interaction) {
		if (interaction.options.getSubcommand() === 'servertraffic') {

			const { db } = require('../../index.js');
			const minDate = new Date(new Date() - (30 * 24 * 60 * 60 * 1000));

			const statsData = await db.dailyStats.findAll({ where: { date: { [Sequelize.Op.gte]: minDate } }, order:[['date', 'ASC']] });

			const labels = [];
			const datasJoined = [];
			const datasLeft = [];

			for (let i = 0; i < Math.min(30, statsData.length); i++) {
				labels.push(statsData[i].date);
				datasJoined.push(statsData[i].nbMembersJoined);
				datasLeft.push(-statsData[i].nbMembersLeft);
			}

			const membersRenderer = new ChartJSNodeCanvas({ width: 1600, height: 600, backgroundColour: 'white' });
			const membersImage = await membersRenderer.renderToBuffer({
				// Build your graph passing option you want
				type: 'bar',
				data: {
					labels: labels,
					datasets: [
						{ label: 'Members arrivals', backgroundColor: 'blue', data: datasJoined },
						{ label: 'Members leaves', backgroundColor: 'gray', data: datasLeft },
					],
				},
				options: { responsive: true, plugins: {
					legend: { position: 'top' },
					title: { display: true, text: 'Members traffic over time' } },
				},
			});

			const membersAttachment = await new AttachmentBuilder(membersImage, { name: 'membersgraph.png' });

			const totalJoined = datasJoined.reduce((a, b) => a + b, 0);
			const totalLeft = -datasLeft.reduce((a, b) => a + b, 0);

			const membersStatsEmbed = new EmbedBuilder()
				.setColor(0xFFBF00)
				.setTitle('Members traffic')
				.addFields(
					{ name: 'Past 30 days :', value: ' ' },
					{ name: 'Total arrivals:', value: `${totalJoined}`, inline: true },
					{ name: 'Total leaves:', value: `${totalLeft}`, inline: true },
				)
				.setImage('attachment://membersgraph.png');

			return await interaction.editReply({ embeds: [membersStatsEmbed], files: [membersAttachment] });


		}
	},
};
