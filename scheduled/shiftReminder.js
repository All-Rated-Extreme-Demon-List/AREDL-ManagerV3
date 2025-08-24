const { enableShiftReminders, shiftReminderExpireThreshold, sendShiftRemindersSchedule, apiToken } = require('../config.json');
const logger = require('log4js').getLogger();
const { api } = require("../api.js");
const { EmbedBuilder } = require('discord.js'); 

module.exports = {
	name: 'sendShiftReminders',
	cron: sendShiftRemindersSchedule,
	enabled: enableShiftReminders,
	async execute() {
        const { client } = require('../index.js');
        logger.log("Scheduled - Sending shift reminders")
        let shiftsResponse = await api.send(
            "/shifts", 
            "GET", 
            { per_page: 999, status: "Running" },
            undefined,
            apiToken
        )

        if (shiftsResponse.error) {
            logger.error(`Scheduled - Error getting shifts: status ${shiftsResponse.status}\n${shiftsResponse.data.message}`)
        }


        const shifts = shiftsResponse.data;
        let now = new Date()

        for (const shift of shifts) {
            let endDate = new Date(shift.end_at)
            let timeUntilEnd = endDate - now
            let hours = shiftReminderExpireThreshold * 60 * 60 * 1000
            if (timeUntilEnd <= hours && timeUntilEnd > 0) {
                const userResponse = await api.send(`/users/${shift.user.id}`, 'GET')
                if (userResponse.error) {
                    logger.error(`Error fetching user data: ${userResponse.data.message}`);
                    return;
                }
                const settings = await db.settings.findOne({
                    where: {
                        user: userResponse.data.discord_id
                    }
                })
                if (settings && settings.shiftPings === false) {
                    continue
                }
                // unix epochs
			    let endSeconds = Math.floor(endDate / 1000)

                let embed = new EmbedBuilder()
                    .setColor(0xf59842)
                    .setTitle(":warning: Shift Reminder")
                    .setDescription(`Your shift will expire <t:${endSeconds}:R>!`)
                    .setTimestamp()

                client.users.cache.get(userResponse.data.discord_id).send({ embeds: [embed] })
            }
        }
    }
}
