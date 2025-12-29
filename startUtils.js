const fs = require('node:fs');
const path = require('node:path');
const { Collection } = require('discord.js');
const cron = require('node-cron');
const {
    websocketURL,
    shiftsStartedID,
    guildId,
    enableSeparateStaffServer,
    staffGuildId,
} = require('./config.json');
const logger = require('log4js').getLogger();
const errorLogger = require('log4js').getLogger('error');
const WebSocket = require('ws');
const { sendShiftNotif } = require('./others/shiftNotifs');

module.exports = {
    async clientInit(client) {
        logger.info('Initializing client...');
        // Commands
        client.commands = new Collection();
        client.cooldowns = new Collection();
        logger.info('  Loading commands');
        const parentCommandPath = path.join(__dirname, 'commands');

        if (fs.existsSync(parentCommandPath)) {
            const commandFolders = fs.readdirSync(parentCommandPath);
            for (const folder of commandFolders) {
                const commandsPath = path.join(parentCommandPath, folder);
                const commandFiles = fs
                    .readdirSync(commandsPath)
                    .filter((file) => file.endsWith('.js'));
                for (const file of commandFiles) {
                    const filePath = path.join(commandsPath, file);
                    const command = require(filePath);
                    // Set a new item in the Collection with the key as the command name and the value as the exported module
                    if (
                        'data' in command &&
                        'execute' in command &&
                        'enabled' in command
                    ) {
                        if (command.enabled) {
                            client.commands.set(command.data.name, command);
                            logger.info(
                                `    Loaded ${command.data.name} from ${filePath}`,
                            );
                        } else {
                            logger.info(
                                `    Ignored disabled command ${filePath}`,
                            );
                        }
                    } else {
                        logger.info(
                            `  [WARNING] The command at ${filePath} is missing a required "data", "execute" or "enabled" property.`,
                        );
                    }
                }
            }
        }

        // Buttons
        logger.info('  Loading buttons');
        client.buttons = new Collection();
        const buttonsPath = path.join(__dirname, 'buttons');

        if (fs.existsSync(buttonsPath)) {
            const buttonsFiles = fs
                .readdirSync(buttonsPath)
                .filter((file) => file.endsWith('.js'));
            for (const file of buttonsFiles) {
                const filePath = path.join(buttonsPath, file);
                const button = require(filePath);
                client.buttons.set(button.customId, button);
                logger.info(`    Loaded ${button.customId} from ${filePath}`);
            }
        }

        // Select Menus
        logger.info('  Loading menus');
        client.menus = new Collection();
        const menusPath = path.join(__dirname, 'menus');

        if (fs.existsSync(menusPath)) {
            const menusFiles = fs
                .readdirSync(menusPath)
                .filter((file) => file.endsWith('.js'));
            for (const file of menusFiles) {
                const filePath = path.join(menusPath, file);
                const menu = require(filePath);
                client.menus.set(menu.customId, menu);
                logger.info(`    Loaded ${menu.customId} from ${filePath}`);
            }
        }

        // Modals
        logger.info('  Loading modals');
        client.modals = new Collection();
        const modalsPath = path.join(__dirname, 'modals');
        if (fs.existsSync(modalsPath)) {
            const modalsFiles = fs
                .readdirSync(modalsPath)
                .filter((file) => file.endsWith('.js'));
            for (const file of modalsFiles) {
                const filePath = path.join(modalsPath, file);
                const modal = require(filePath);
                client.modals.set(modal.customId, modal);
                logger.info(`    Loaded ${modal.customId} from ${filePath}`);
            }
        }

        // Events
        logger.info('  Loading events');
        const eventsPath = path.join(__dirname, 'events');

        if (fs.existsSync(eventsPath)) {
            const eventFiles = fs
                .readdirSync(eventsPath)
                .filter((file) => file.endsWith('.js'));
            for (const file of eventFiles) {
                const filePath = path.join(eventsPath, file);
                const event = require(filePath);
                if (event.once) {
                    client.once(event.name, (...args) =>
                        event.execute(...args),
                    );
                } else {
                    client.on(event.name, (...args) => event.execute(...args));
                }
                logger.info(`    Loaded ${event.name} from ${filePath}`);
            }
        }

        // Websocket handlers
        logger.info('  Loading websocket handlers');
        client.websockets = new Collection();
        const websocketsPath = path.join(__dirname, 'websocket');
        if (fs.existsSync(websocketsPath)) {
            const websocketsFiles = fs
                .readdirSync(websocketsPath)
                .filter((file) => file.endsWith('.js'));
            for (const file of websocketsFiles) {
                const filePath = path.join(websocketsPath, file);
                const websocketHandler = require(filePath);
                client.websockets.set(
                    websocketHandler.notification_type,
                    websocketHandler,
                );
                logger.info(
                    `    Loaded ${websocketHandler.notification_type} from ${filePath}`,
                );
            }
        }

        logger.info('Client initialization done');
    },

    // Sequelize sync init
    async sequelizeInit(db) {
        logger.info('Syncing database data...');
        for (const table of Object.keys(db))
            await db[table].sync({ alter: true });
        logger.info('Database sync done');
    },

    // Scheduled cron tasks
    async scheduledTasksInit() {
        logger.info('Setting up scheduled tasks');
        const scheduledPath = path.join(__dirname, 'scheduled');
        const scheduledFiles = fs
            .readdirSync(scheduledPath)
            .filter((file) => file.endsWith('.js'));

        for (const file of scheduledFiles) {
            const filePath = path.join(scheduledPath, file);
            const task = require(filePath);

            if (task.enabled) {
                cron.schedule(task.cron, task.execute);
                logger.info(
                    `  Started ${task.name}(${task.cron}) from ${filePath}`,
                );
            } else {
                logger.info(
                    `  Ignored disabled ${task.name}(${task.cron}) from ${filePath}`,
                );
            }
        }
        logger.info('Scheduled tasks setup done');
    },

    async initAPIWebsocket(client, apiToken) {
        logger.info('Initializing API WebSocket connection...');
        const ws = new WebSocket(websocketURL, {
            headers: { Authorization: `Bearer ${apiToken}` },
        });

        await new Promise((resolve, reject) => {
            ws.once('open', () => {
                logger.info('Connected to notifications WebSocket');
                resolve();
            });

            ws.once('error', (err) => {
                errorLogger.error('WebSocket connection error:', err);
                reject(err);
            });
        });

        ws.on('message', (data) => {
            try {
                const parsed_data = JSON.parse(data);
                client.websockets.forEach((handler, type) => {
                    if (parsed_data.notification_type === type) {
                        handler.handle(client, parsed_data.data);
                    }
                });
            } catch (err) {
                errorLogger.error('Failed to parse websocket message:', err);
            }
        });

        ws.on('close', (code, reason) => {
            logger.warn(
                `Websocket closed (${code}): ${reason}. Reconnecting in 5s…`,
            );
            setTimeout(
                () => module.exports.initAPIWebsocket(client, apiToken),
                5000,
            );
        });
    },
    /// Called on bot startup
    async resumeShiftTimers(client, db) {
        if (!shiftsStartedID) {
            logger.warn('Shifts started channel not configured. Skipping...');
            return 0;
        }
        const guild = await client.guilds.fetch(guildId);
        const staffGuild = enableSeparateStaffServer
            ? await client.guilds.fetch(staffGuildId)
            : guild;
        const channel = await staffGuild.channels.fetch(shiftsStartedID);
        const shifts = await db.shiftNotifs.findAll();
        const currentTime = new Date().getTime();
        let resumedCount = 0;
        for (const dbShift of shifts) {
            const startTime = new Date(dbShift.start_at).getTime();
            const timeDiff = startTime - currentTime;

            if (timeDiff < -600000) {
                logger.warn(`Removing stale shift notification (ID: ${dbShift.id}) from database`);
                await db.shiftNotifs.destroy({ where: { id: dbShift.id } }).catch(err => {
                    logger.error(`Failed to delete stale shift notification (ID: ${dbShift.id}):`, err);
                });
                continue;
            }
            
            const shift = {
                user_id: dbShift.user_id,
                start_at: dbShift.start_at,
                end_at: dbShift.end_at,
                target_count: dbShift.target_count,
            };
            setTimeout(async () => {
                await sendShiftNotif(channel, shift, db, dbShift.id).catch(err => {
                    logger.error('Failed to send resumed shift notification:', err);
                });
            }, Math.max(timeDiff, 0));
            resumedCount++;
        }
        logger.info(`Resumed ${resumedCount} shift notification timers`);
        return resumedCount;
    },
};
