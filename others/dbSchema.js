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

		return db;
	},
};