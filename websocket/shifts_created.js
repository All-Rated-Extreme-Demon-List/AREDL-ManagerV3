const logger = require('log4js').getLogger();
const { guildId, staffGuildId, shiftsStartedID, enableSeparateStaffServer } = require('../config.json');
const { api } = require('../api');
const { EmbedBuilder } = require('discord.js');

module.exports = {
	notification_type: "SHIFTS_CREATED",
	async handle(client, data) {
		logger.log("Received shift created notification:", data);
		const { db } = require('../index.js');

		const guild = await client.guilds.fetch(guildId);
		const staffGuild = (enableSeparateStaffServer ? await client.guilds.fetch(staffGuildId) : guild);
		const channel = staffGuild.channels.cache.get(shiftsStartedID);

		for (const shift of data) {
			const reviewerResponse = await api.send(`/users/${shift.user_id}`, 'GET')
			if (reviewerResponse.error) {
				logger.error(`Error fetching reviewer data: ${reviewerResponse.data.message}`);
				continue;
			}
			let pingStr = undefined;
			if (reviewerResponse.data.discord_id) {
				const settings = await db.settings.findOne({
					where: {
						user: reviewerResponse.data.discord_id
					}
				});
				if (!settings || settings.shiftPings === true) {
					pingStr = [
						`<@${reviewerResponse.data.discord_id}>`,
						"-# You can disable being pinged for these reminders with \`/settings\`"
					].join("\n").trim();
				};
			}
			// Get unix timestamps for the Discord embed
			const startDate = Math.floor(new Date(shift.start_at).getTime() / 1000);
			const endDate = Math.floor(new Date(shift.end_at).getTime() / 1000);

			const archiveEmbed = new EmbedBuilder()
				.setColor(0x8fce00)
				.setTitle(`:white_check_mark: Shift started!`)
				.setDescription(`${reviewerResponse.data.discord_id ? `<@${reviewerResponse.data.discord_id}>` : reviewerResponse.data.global_name}`)
				.addFields(
					[
						{ name: 'Count', value: `${shift.target_count} records` },
						{ name: 'Starts at', value: `<t:${startDate}>` },
						{ name: "Ends at", value: `<t:${endDate}>, <t:${endDate}:R>`}
					]
				)
				.setTimestamp();

			channel.send({ content: pingStr, embeds: [archiveEmbed] });
		}
	}
}
