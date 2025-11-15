const { api } = require('../api.js');
const { apiToken, pointsWeeklyCompleted, pointsBiweeklyMissed } = require('../config.json');

const getShifts = async (cutoff) => {
    const shifts = [];
    let page = 1;

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
        if (new Date(shifts[shifts.length - 1].start_at) >= cutoff) {
            page++;
        } else {
            return shifts.filter((shift) => new Date(shift.start_at) >= cutoff && shift.status !== "Running");
        }
    }
}

module.exports = {
    name: 'weeklyPointsGain',
    cron: "0 0 * * 1", // weekly
    enabled: false,
    async execute() {
        const { db } = require('../index.js');
        
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        console.log(`Cutoff date: ${oneWeekAgo.toLocaleString()}`)

        let allShifts = await getShifts(oneWeekAgo);
        allShifts = allShifts
            .reduce((obj, shift) => {
                obj[shift.user.id] = [
                    ...(obj[shift.user.id] || []),
                    shift,
                ];
                return obj;
            }, {});

        for (const [staffId, shifts] of Object.entries(allShifts)) {
            const allCompleted = shifts.every((shift) => shift.status === "Completed");
            const allMissed = shifts.every((shift) => shift.status === "Expired");

            console.log(`User ${staffId} has ${allCompleted ? "completed" : "missed"} all shifts in the past week`);

            const [user, _] = await db.staff_points.findOrCreate({
                where: {
                    user: staffId,
                },
            });

            if (allCompleted) {
                user.points = Math.min(user.points + pointsWeeklyCompleted, 30);
            } else {
                // todo
            }
            user.save();
        }

        return;
        
    },
};
