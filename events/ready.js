const { Events } = require('discord.js');
const { db, cache } = require('../index.js');
const { guildId, enableSeparateStaffServer, staffGuildId, pendingRecordsID, priorityRecordsID, enablePriorityRole } = require('../config.json');
const { scheduledTasksInit } = require('../startUtils.js');
const logger = require('log4js').getLogger();

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute() {
		await scheduledTasksInit();
		logger.info(`Initialization complete`);
		return 1;
	},
};
