const logger = require('log4js').getLogger();
const {
    guildId,
    staffGuildId,
    shiftsStartedID,
    enableSeparateStaffServer,
} = require('../config.json');
const { sendShiftNotif } = require('../others/shiftNotifs.js');

module.exports = {
    notification_type: 'SHIFTS_CREATED',
    async handle(client, data) {
        logger.log('Received shift created notification:', data);
        if (!shiftsStartedID) return;
        const { db } = require('../index.js');

        const guild = await client.guilds.fetch(guildId);
        const staffGuild = enableSeparateStaffServer
            ? await client.guilds.fetch(staffGuildId)
            : guild;
        const channel = staffGuild.channels.cache.get(shiftsStartedID);

        for (const shift of data) {
            const dbShift = await db.shiftNotifs.create({
                user_id: shift.user_id,
                start_at: shift.start_at,
                end_at: shift.end_at,
                target_count: shift.target_count,
            });
            const currentTime = new Date().getTime();
            const startAt = new Date(shift.start_at);
        
            setTimeout(() => {
                sendShiftNotif(channel, shift, db, dbShift.id);
            }, Math.max(startAt.getTime() - currentTime, 0));
        }
    },
};
