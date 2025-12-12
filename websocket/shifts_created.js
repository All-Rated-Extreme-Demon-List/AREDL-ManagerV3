const logger = require('log4js').getLogger();
const { Client } = require('discord.js');
const {
    guildId,
    staffGuildId,
    shiftsStartedID,
    enableSeparateStaffServer,
} = require('../config.json');
const { sendShiftNotif } = require('../others/shiftNotifs.js');

module.exports = {
    notification_type: 'SHIFTS_CREATED',
    /**
     * @param {Client<true>} client 
     */
    async handle(client, data) {
        logger.log("-".repeat(25))
        logger.log('Received shift created notification:', data);
        if (!shiftsStartedID) return;
        logger.log(`Shifts started ID is defined: ${shiftsStartedID}`)
        const { db } = require('../index.js');
        logger.log("Db has been imported")
        

        const guild = client.guilds.cache.get(guildId);
        logger.log(`Guild found: ${guild.id} ${guild.name}`)
        const staffGuild = enableSeparateStaffServer
            ? await client.guilds.fetch(staffGuildId)
            : guild;
        logger.log(`Staff guild found: ${staffGuild.id} ${staffGuild.name}`)
        const channel = staffGuild.channels.cache.get(shiftsStartedID);
        logger.log(`Shifts channel found: ${channel.id} ${channel.name}`)

        for (const shift of data) {
            logger.log(`Processing shift from moderator ${shift.user_id} ${shift.start_at} - ${shift.end_at}`)
            const dbShift = await db.shiftNotifs.create({
                user_id: shift.user_id,
                start_at: shift.start_at,
                end_at: shift.end_at,
                target_count: shift.target_count,
            });
            logger.log(`Created shift in db`)
            logger.log(JSON.stringify(dbShift))
            const currentTime = new Date().getTime();
            logger.log(`Current time: ${currentTime}`)
            const startAt = new Date(shift.start_at);
            logger.log(`startAt: ${startAt.toISOString()}`)

            logger.log(`Shift sending in ${Math.max(startAt.getTime() - currentTime, 0)} ms`)
        
            const timeout = setTimeout(() => {
                sendShiftNotif(channel, shift, db, dbShift.id);
                logger.log("Timeout callback completed")
            }, Math.max(startAt.getTime() - currentTime, 0));

            logger.log(`Timeout created: ${timeout}`)
        }
    },
};
