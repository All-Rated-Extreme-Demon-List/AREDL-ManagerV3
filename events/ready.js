const { Events } = require('discord.js');
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
