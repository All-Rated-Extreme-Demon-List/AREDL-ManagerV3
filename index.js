const { token, apiToken } = require('./config.json');
const log4js = require('log4js');
const Sequelize = require('sequelize');
const { Client, GatewayIntentBits } = require('discord.js');
const { createDbSchema } =  require('./others/dbSchema.js');
const { clientInit, sequelizeInit, initAPIWebsocket, resumeShiftTimers } = require('./startUtils.js');

// Logger
log4js.configure('./log4js.json');
const logger = log4js.getLogger();
const sqlLogger = log4js.getLogger('sql');
const errorLogger = log4js.getLogger('error');

// Error logging
process.on('uncaughtException', (err) => {
	errorLogger.error('Uncaught Exception:', err);
});
  
process.on('unhandledRejection', (reason, promise) => {
	errorLogger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildPresences] });

// Establish DB connection
const sequelize = new Sequelize({
	dialect: 'sqlite',
	logging: (msg) => sqlLogger.debug(msg),
	storage: './data/database.sqlite',
});

// Create tables models
const db = createDbSchema(sequelize);

module.exports = { db, client, sequelize };

async function start() {
	logger.info('-'.repeat(40));
	logger.info('AREDL Manager starting...');
	logger.info('-'.repeat(40));
	try {
		await sequelizeInit(db);
	} catch (error) {
		logger.error('Unable to sync database data: \n', error);
		process.exit(1);
	}
	try {
		await clientInit(client);
	} catch (error) {
		logger.error('Unable to initialize client: \n', error);
		process.exit(1);
	}
	try {
		await initAPIWebsocket(client, apiToken);
	} catch (error) {
		logger.error('Unable to initialize websocket connection: \n', error);
		process.exit(1);
	}
	try {
		logger.info('Logging in client with discord...');
		await client.login(token);
		logger.info(`Client logged in as ${client.user.tag}`);
	} catch (error) {
		logger.error('Unable to login client: \n', error);
		process.exit(1);
	}

	try {
		logger.info("Resuming pending shift notifications...")
		const count = await resumeShiftTimers(client, db);
		if (count > 0) logger.info(`Resumed ${count} pending shift notifications.`);
		else logger.info('No pending shift notifications to resume.');
	} catch (error) {
		logger.error('Unable to resume pending shift notifications: \n', error);
	}
}

start();
