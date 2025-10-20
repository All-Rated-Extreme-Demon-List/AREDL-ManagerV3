const { Events } = require('discord.js');
const { scheduledTasksInit } = require('../startUtils.js');
const infoMessageUpdate = require('../scheduled/infoMessageUpdate.js');
const logger = require('log4js').getLogger();

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute() {
		await scheduledTasksInit();
		logger.info(`Initialization complete`);

		infoMessageUpdate.execute()
		return 1;
	},
};
