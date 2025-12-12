const { api } = require('../api.js');
const logger = require('log4js').getLogger();
const { EmbedBuilder } = require('discord.js');

module.exports = {
    /**
     * 
     * @param {import('discord.js').GuildBasedChannel} channel 
     */
    sendShiftNotif: async (channel, shift, db, shiftID) => {
        logger.log("Shift notif sending")
        logger.log(`Shift:`)
        logger.log(shift)
        logger.log(`Channel: ${channel.id} ${channel.name}`)
        logger.log(`shiftID: ${shiftID}`)

        try {
            logger.log(`Fetching reviewer from ${shift.user_id}`)
            const reviewerResponse = await api.send(
                `/users/${shift.user_id}`,
                'GET',
            );
            logger.log(`Response: `)
            logger.log(reviewerResponse)
            if (reviewerResponse.error) {
                logger.error(
                    `Shift Notification - Error fetching reviewer ${shift.user_id}: ${reviewerResponse.data.message}`,
                );
                await db.shiftNotifs.destroy({ where: { id: shiftID } });
                logger.log("Destroyed shift notif")
                return 1;
            }
            logger.log("Declaring pingStr");
            let pingStr;
            logger.log(`pingStr: ${pingStr}`)
            if (reviewerResponse.data.discord_id) {
                logger.log(`Discord ID found: ${reviewerResponse.data.discord_id}`)
                const settings = await db.settings.findOne({
                    where: {
                        user: reviewerResponse.data.discord_id,
                    },
                });
                logger.log("Settings fetched")
                if (!settings || settings.shiftPings === true) {
                    logger.log("user wants to be pinged")
                    pingStr = `<@${reviewerResponse.data.discord_id}>`;
                    logger.log(`New ping str: ${pingStr}`)
                }
            } else {
                logger.log("Discord ID not found")
            }
            // Get unix timestamps for the Discord embed
            const startDate = Math.floor(new Date(shift.start_at).getTime() / 1000);
            const endDate = Math.floor(new Date(shift.end_at).getTime() / 1000);

            logger.log(`Start date: ${startDate}`)
            logger.log(`End date: ${endDate}`)

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

            logger.log(`Created embed:`)
            logger.log(archiveEmbed.data)
            if (!channel.isSendable()) {
                logger.error("Channel is not sendable, cancelling...")
                return 1
            }
            const message = await channel.send({ content: pingStr, embeds: [archiveEmbed] });
            logger.log(`Sent message: ${message.id} ${message.guild.id}`)
            await db.shiftNotifs.destroy({ where: { id: shiftID } });
            logger.log("Destroyed shift notifs entry")
            return 0;
        } catch (e) {
            logger.error(`Shift Notification - Error sending shift notification: ${e}`);
            logger.error(shift);
            await db.shiftNotifs.destroy({ where: { id: shiftID } });
            logger.log("Destroyed shift notifs entry")
            return 1;
        }
    },
};
