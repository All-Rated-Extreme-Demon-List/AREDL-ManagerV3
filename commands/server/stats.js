// commands/stats.js
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Sequelize = require('sequelize');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const infoMessageUpdate = require('../../scheduled/infoMessageUpdate.js');

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
        .setDescription('Shows info about server members traffic'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('send-list-stats-message')
        .setDescription('Send the initial stats info message (placeholder)')),
  async execute(interaction) {
	await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();

    if (sub === 'servertraffic') {
      const { db } = require('../../index.js');
      const minDate = new Date(new Date() - (30 * 24 * 60 * 60 * 1000));

      const statsData = await db.dailyStats.findAll({
        where: { date: { [Sequelize.Op.gte]: minDate } },
        order: [['date', 'ASC']],
      });

      const labels = [];
      const datasJoined = [];
      const datasLeft = [];

      for (let i = 0; i < Math.min(30, statsData.length); i++) {
        labels.push(statsData[i].date);
        datasJoined.push(statsData[i].nbMembersJoined);
        datasLeft.push(-statsData[i].nbMembersLeft);
      }

      const membersRenderer = new ChartJSNodeCanvas({ width: 1600, height: 600, backgroundColour: 'white'});
      const membersImage = await membersRenderer.renderToBuffer({
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            { label: 'Members arrivals', backgroundColor: 'blue', data: datasJoined },
            { label: 'Members leaves', backgroundColor: 'gray', data: datasLeft },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Members traffic over time' },
          },
        },
      });

      const membersAttachment = new AttachmentBuilder(membersImage, { name: 'membersgraph.png' });

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

    if (sub === 'send-list-stats-message') {
      const { db } = require('../../index.js');

      const existing = await db.info_messages.findOne({ where: { name: "list_stats" } });
      if (existing) {
        return interaction.editReply(`A \`list_stats\` message already exists. Delete it from the DB if you want to create a new one.`);
      }

      const msg = await interaction.channel.send({
        content: `List stats panel will appear here soon…`,
      });

      await db.info_messages.create({
        name: "list_stats",
        guild: interaction.guild.id,
        channel: interaction.channel.id,
        discordid: msg.id,
      });

	  infoMessageUpdate.execute();

      return interaction.editReply(`\`list_stats\` message sent and stored in the database.`);
    }
  },
};
