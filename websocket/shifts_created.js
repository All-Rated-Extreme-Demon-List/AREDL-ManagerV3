const logger = require('log4js').getLogger();
const { guildId, staffGuildId, shiftsStartedID, enableSeparateStaffServer } = require('../config.json');
const { api } = require('../api');
const { EmbedBuilder } = require('discord.js');

module.exports = {
	notification_type: "SHIFTS_CREATED",
	async handle(client, data) {
		logger.log("Received shift created notification:", data);

		const guild = await client.guilds.fetch(guildId);
		const staffGuild = (enableSeparateStaffServer ? await client.guilds.fetch(staffGuildId) : guild);
		const channel = staffGuild.channels.cache.get(shiftsStartedID);

		for (const shift of data) {
			const reviewerResponse = await api.send(`/users/${shift.user_id}`, 'GET')
			if (reviewerResponse.error) {
				logger.error(`Error fetching reviewer data: ${reviewerResponse.data.message}`);
				continue;
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

			channel.send({ content: reviewerResponse.data.discord_id ? `<@${reviewerResponse.data.discord_id}>` : undefined, embeds: [archiveEmbed] });
		}
	}
}
