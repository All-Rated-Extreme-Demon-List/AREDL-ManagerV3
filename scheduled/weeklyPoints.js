const { api } = require('../api.js');
const { apiToken, pointsWeeklyCompleted, pointsBiweeklyMissed, sendWeeklyUpdates, guildId, weeklyUpdatesChannelId, enableSeparateStaffServer, staffGuildId } = require('../config.json');
const logger = require("log4js").getLogger();
const { EmbedBuilder } = require("discord.js")

const getShifts = async (cutoff) => {
    const shifts = [];
    let page = 1;
    const maxPage = 15


    while (true) {
        const shiftsReq = await api.send(
            "/shifts",
            "GET",
            { page },
            undefined,
            apiToken
        )
        if (shiftsReq.error) {
            logger.error(`Error getting shifts (page ${page}): status ${shiftsReq.status}\n${shiftsReq.data.message}`);
            return;
        }
        shifts.push(...shiftsReq.data.data);
        if (new Date(shifts[shifts.length - 1].end_at) >= cutoff && page < maxPage && shiftsReq.data.data.length > 0) {
            page++;
        } else {
            return shifts.filter((shift) => new Date(shift.end_at) >= cutoff && shift.status !== "Running");
        }
    }
}

module.exports = {
    name: 'weeklyPointsGain',
    cron: "0 0 * * 1", // weekly
    enabled: false,
    async execute() {
        logger.log('Scheduled - Calculating weekly points');

        const { db, client } = require('../index.js');
        
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        let allShifts = await getShifts(oneWeekAgo);
        allShifts = allShifts
            .reduce((obj, shift) => {
                obj[shift.user.discord_id] = [
                    ...(obj[shift.user.discord_id] || []),
                    shift,
                ];
                return obj;
            }, {});

        const isOddWeek = await db.weekly_missed_shifts.count() === 0;

        const changes = [];

        for (const [staffId, shifts] of Object.entries(allShifts)) {
            const allCompleted = shifts.every((shift) => shift.status === "Completed");
            const allMissed = shifts.every((shift) => shift.status === "Expired");

            const [user, _] = await db.staff_points.findOrCreate({
                where: {
                    user: staffId,
                },
            });


            // track whether this staff member has missed all shifts for next week
            if (isOddWeek) {
                await db.weekly_missed_shifts.create({
                    user: staffId,
                    missed_all: allMissed
                })
            }

            if (allCompleted) {
                user.points = Math.min(user.points + pointsWeeklyCompleted, 30); 
                changes.push({
                    user: staffId,
                    completed: true,
                    diff: pointsWeeklyCompleted
                })
            } else {
                if (!isOddWeek) {
                    const missedLastShift = await db.weekly_missed_shifts.findOne({
                        where: { user: staffId }
                    })
                    
                    if (
                        missedLastShift && missedLastShift.missed_all && // if last week's shifts were missed
                        allMissed // and this week's shifts were missed
                    ) {
                        user.points = Math.max(user.points - pointsBiweeklyMissed, 0);
                        changes.push({
                            user: staffId,
                            completed: false,
                            diff: -pointsBiweeklyMissed
                        })
                    }
                }
            }
            user.save();
        }

        // reset missed shifts for next week
        if (!isOddWeek) {
            await db.weekly_missed_shifts.truncate();
        }

        if (sendWeeklyUpdates) {
            const embeds = changes.sort((a, b) => b.diff - a.diff).map((change) => {
                return new EmbedBuilder()
                    .setTitle(change.completed ? "Weekly points added" : "Weekly points removed")
                    .setDescription(`<@${change.user}>`)
                    .setColor(change.completed ? 0x8fce00 : 0xcc0000)
                    .addFields([
                        {
                            name: "Status",
                            value: `${change.completed ? "Completed" : "Missed"}`,
                            inline: true
                        },
                        {
                            name: "Points",
                            value: `${change.diff}`,
                            inline: true
                        }
                    ])
            })
            const guild = client.guilds.cache.get(guildId);
            const staffGuild = enableSeparateStaffServer
                ? client.guilds.cache.get(staffGuildId)
                : guild;
            if (embeds.length > 0) {
                for (let i = 0; i < embeds.length; i += 10) {
                    const embedBatch = embeds.slice(i, i + 10);
                    staffGuild.channels.cache
                        .get(weeklyUpdatesChannelId)
                        .send({ embeds: embedBatch });
                }
            }
        }

        return;
        
    },
};
