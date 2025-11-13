module.exports = {
    name: 'weeklyPointsGain',
    cron: "0 0 * * 1", // weekly
    enabled: false,
    async execute() {
        return;
    },
};
