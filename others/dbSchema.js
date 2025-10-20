const Sequelize = require('sequelize');
module.exports = {
	createDbSchema(sequelize) {
		const db = {};
		
		db.dailyStats = sequelize.define('dailyStats', {
			date: Sequelize.DATEONLY,
			nbMembersJoined: { type: Sequelize.NUMBER, defaultValue: 0 },
			nbMembersLeft: { type: Sequelize.NUMBER, defaultValue: 0 },
		});

		db.embeds = sequelize.define('embeds', {
			name: Sequelize.STRING,
			guild: Sequelize.STRING,
			channel: Sequelize.STRING,
			discordid: Sequelize.STRING,
			title: Sequelize.STRING,
			description: Sequelize.STRING,
			color: Sequelize.STRING,
			image: Sequelize.STRING,
			sent: Sequelize.BOOLEAN,
		});

		db.messages = sequelize.define('messages', {
			name: Sequelize.STRING,
			guild: Sequelize.STRING,
			channel: Sequelize.STRING,
			discordid: Sequelize.STRING,
			content: Sequelize.STRING,
			sent: Sequelize.BOOLEAN,
		});
		
		db.settings = sequelize.define("settings", {
			user: Sequelize.STRING,
			shiftPings: { type: Sequelize.BOOLEAN, defaultValue: true },
		}),
		db.sentUcReminders = sequelize.define("sentUcReminders", {
			id: {
				type: Sequelize.STRING,
				primaryKey: true,
			},
		}),

		db.shiftNotifs = sequelize.define("shiftReminders", {
			id: {
				type: Sequelize.STRING,
				primaryKey: true,
			},
			user_id: Sequelize.STRING,
			start_at: Sequelize.DATE,
			end_at: Sequelize.DATE,
			target_count: Sequelize.INTEGER
		});

		db.info_messages = sequelize.define('info_messages', {
			name: Sequelize.STRING,
			guild: Sequelize.STRING,
			channel: Sequelize.STRING,
			discordid: Sequelize.STRING,
		});

		return db;
	},
};