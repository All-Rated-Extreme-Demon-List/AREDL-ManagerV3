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
        const currentTime = new Date().getTime();

        for (const shift of data) {
            try {
                const dbShift = await db.shiftNotifs.create({
                    user_id: shift.user_id,
                    start_at: shift.start_at,
                    end_at: shift.end_at,
                    target_count: shift.target_count,
                });
                
                const startAt = new Date(shift.start_at).getTime();
                setTimeout(async () => {
                    await sendShiftNotif(channel, shift, db, dbShift.id).catch(err => {
                        logger.error('Failed to send shift notification:', err);
                    });
                }, Math.max(startAt - currentTime, 0));
            } catch (err) {
                logger.error('Failed to create shift notification in database:', err);
            }
        }
    },
};
