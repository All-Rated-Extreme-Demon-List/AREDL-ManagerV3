const { api } = require('../api.js');
const logger = require('log4js').getLogger();
const { EmbedBuilder } = require('discord.js');
const { shiftsStartedID } = require("../config.json")

module.exports = {
    sendShiftNotif: async (channel, shift, db, shiftID) => {
        if (!shiftsStartedID) return 0;
        try {
            const reviewerResponse = await api.send(
                `/users/${shift.user_id}`,
                'GET',
            );
            if (reviewerResponse.error) {
                logger.error(
                    `Shift Notification - Error fetching reviewer ${shift.user_id}: ${reviewerResponse.data.message}`,
                );
                await db.shiftNotifs.destroy({ where: { id: shiftID } });
                return 1;
            }
            let pingStr;
            if (reviewerResponse.data.discord_id) {
                const settings = await db.settings.findOne({
                    where: {
                        user: reviewerResponse.data.discord_id,
                    },
                });
                if (!settings || settings.shiftPings === true) {
                    pingStr = `<@${reviewerResponse.data.discord_id}>`;
                }
            }
            // Get unix timestamps for the Discord embed
            const startDate = Math.floor(new Date(shift.start_at).getTime() / 1000);
            const endDate = Math.floor(new Date(shift.end_at).getTime() / 1000);

            const archiveEmbed = new EmbedBuilder()
                .setColor(0x8fce00)
                .setTitle(`:white_check_mark: Shift started!`)
                .setDescription(
                    `${reviewerResponse.data.discord_id ? `<@${reviewerResponse.data.discord_id}>` : reviewerResponse.data.global_name}`,
                )
                .addFields([
                    { name: 'Count', value: `${shift.target_count} records` },
                    { name: 'Starts at', value: `<t:${startDate}>` },
                    { name: 'Ends at', value: `<t:${endDate}>, <t:${endDate}:R>` },
                ])
                .setTimestamp();

            await channel.send({ content: pingStr, embeds: [archiveEmbed] });
            await db.shiftNotifs.destroy({ where: { id: shiftID } });
            logger.info(`Successfully sent and deleted shift notification (ID: ${shiftID})`);
            return 0;
        } catch (e) {
            logger.error(`Shift Notification - Error sending shift notification: ${e}`);
            logger.error(shift);
            try {
                await db.shiftNotifs.destroy({ where: { id: shiftID } });
                logger.info(`Deleted shift notification after error (ID: ${shiftID})`);
            } catch (deleteErr) {
                logger.error(`Failed to delete shift notification (ID: ${shiftID}) after error:`, deleteErr);
            }
            return 1;
        }
    },
};
