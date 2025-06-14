# AREDL Manager V2](https://github.com/TheShittyList/GDListTemplate)

## Setup

This bot does not provide any hosting, meaning that you will need to find a way to host it yourself. This bot was made with [discord.js](https://discord.js.org/): You will need to have [NodeJS](https://nodejs.org/en) installed (v16.11.0 or higher) to run it. After node has been installed, to install the dependencies, run `npm i` in the bot's root directory
You will then need to create a config file (an example file is provided in `example_config.json`) and name it `config.json` in the root directory. It should contain the following:

> - `token`: The discord bot private token. If you do not know what a token is or how to set up a discord bot, refer to [this discord.js guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html)
> - `apiToken`: The AREDL API token that will allow the bot to retrieve sensitive information from the list, e.g. denied submissions. This account should have a role with a permission level above or equal to 95. See the [API Docs](https://api.aredl.net/v2/docs#post-/api/auth/api-key) or [AREDL Settings Page](https://aredl.net/settings) to create a token.
> - `websocketURL`: The URL where websocket notifications (such as the ones sent when records are checked or when shifts are completed) are being sent from. The default value from the example will likely be correct.
> - `baseURL`: The URL used in all requests to the API (besides websocket subscriptions).
> - `enableSeparateStaffServer`: Enable this if there is a staff discord server for handling records that is not the public discord server. Will be used to fetch the following channels: `classicArchiveRecordsID`,`platArchiveRecordsID`, `completedShiftsID`, `missedShiftsID`
> - `enableWelcomeMessage`: Whether the bot should send a message welcoming new server members.
> - `clientID`: The discord bot's user ID.
> - `guildID`: The ID of your server.
> - `classicArchiveRecordsID`: (Staff) The channel where a submission's details are sent, when a classic submission is accepted or denied
> - `platArchiveRecordsID`: (Staff) The channel where a submission's details are sent, when a platformer submission is accepted or denied
> - `classicRecordsID`: The channel where new classic records are posted, which pings the submitter of the record.
> - `platRecordsID`: The channel where new platformer records are posted, which pings the submitter of the record.
> - `guildMemberAddID`: The channel where the bot will welcome new server members, if the above `enableWelcomeMessage` flag is enabled.
> - `completedShiftsID`: The channel where completed shifts are logged
> - `missedShiftsID`: The channel where missed shifts are logged
> - `enableShiftReminders`: If this is enabled, the bot will DM list moderators if their shift is ending in `shiftReminderExpireThreshold` hours
> - `sendShiftRemindersSchedule`: The interval at which the bot will check for shifts that are ending soon. The default is set to run every hour.
> - `shiftReminderExpireThreshold`: The amount of hours before a shift's end, for the bot to send a reminder to the moderator.

After you have created this config file, you can run `node ./deploy-commands.js` in the root directory, to register the bot's commands with discord. They will then appear in both the public and (if enabled) staff server.

### Be sure to properly set the command permissions in your discord server settings ("Integrations" tab), so that only staff/admins can use their respective commands. The list of all commands is detailed later on.

You can then run the bot using `node ./index.js`. It will create a SQLite database to store records data (among other things) in a `data/` subfolder
