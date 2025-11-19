const Sequelize = require('sequelize');
const { defaultPoints } = require('../config.json');

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

        db.settings = sequelize.define('settings', {
            user: Sequelize.STRING,
            shiftPings: { type: Sequelize.BOOLEAN, defaultValue: true },
        });

        db.sentUcReminders = sequelize.define('sentUcReminders', {
            id: {
                type: Sequelize.STRING,
                primaryKey: true,
            },
        });

        db.shiftNotifs = sequelize.define('shiftReminders', {
            id: {
                type: Sequelize.STRING,
                primaryKey: true,
            },
            user_id: Sequelize.STRING,
            start_at: Sequelize.DATE,
            end_at: Sequelize.DATE,
            target_count: Sequelize.INTEGER,
        });

        db.info_messages = sequelize.define('info_messages', {
            name: Sequelize.STRING,
            guild: Sequelize.STRING,
            channel: Sequelize.STRING,
            discordid: Sequelize.STRING,
        });

        db.staff_points = sequelize.define("staff_points", {
            user: {
                type: Sequelize.STRING,
                primaryKey: true
            },
            points: {
                type: Sequelize.NUMBER,
                defaultValue: defaultPoints
            },
        });

        db.weekly_missed_shifts = sequelize.define("weekly_missed_shifts", {
            user: {
                type: Sequelize.STRING,
                primaryKey: true
            },
            missed_all: Sequelize.BOOLEAN
        })

        return db;
    },
};
