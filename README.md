# Discord Bot - Feature Documentation

A Discord bot built with discord.js v14 featuring centralized configuration, per-server settings, comprehensive error handling, and logging.

## Features

### 🔧 Centralized Configuration System
- Global bot settings in `config.js`
- Easy customization of prefixes, error messages, and bot behavior
- Toggle slash command deployment (guild-specific or global)
- Configurable logging levels and destinations

### 🌐 Per-Server Settings Storage
- Guild-specific configurations stored in `server-settings.json`
- Customizable prefix per server
- Persistent storage with automatic initialization
- Easy-to-use API for managing settings

### ❌ Command Error Handling
- Try-catch blocks around all command handlers
- User-friendly error messages
- Detailed error logging with context
- Prevents bot crashes from unexpected errors
- Global handlers for unhandled rejections and exceptions

### 📝 Logging System
- Dual logging: console output + file storage
- Configurable log levels (debug, info, warn, error)
- Automatic tracking of:
  - Bot startup/shutdown
  - Guild joins/leaves
  - Command executions
  - Errors with stack traces
- Logs stored in `logs/bot.log` with timestamps

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file with:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=your_guild_id_here
```

### 3. Deploy Slash Commands
```bash
node deploy-command.js
```

### 4. Start Bot
```bash
npm start
```

## Configuration

### Global Settings (`config.js`)

```javascript
export default {
  prefix: '!',                    // Default prefix for commands
  
  slashCommands: {
    enabled: true,                // Enable slash commands
    guildOnly: true,              // Deploy to guild vs globally
  },
  
  bot: {
    ignoreBots: true,             // Ignore messages from bots
    status: 'online',             // Bot status
    activity: {
      type: 'PLAYING',
      name: 'with commands',
    },
  },
  
  errorMessages: {
    generic: '❌ An error occurred...',
    permissionDenied: '⛔ No permission...',
    // ... more messages
  },
  
  logging: {
    console: true,                // Log to console
    file: true,                   // Log to file
    logLevel: 'info',             // Minimum log level
  },
};
```

### Per-Server Settings

Each server can have custom settings:

```javascript
import serverSettings from './serverSettings.js';

// Get server settings
const settings = serverSettings.get(guildId);
console.log(settings.prefix); // Server's custom prefix

// Update a setting
await serverSettings.set(guildId, 'prefix', '?');

// Update multiple settings
await serverSettings.update(guildId, {
  prefix: '?',
  welcomeChannel: '123456789',
});

// Reset to defaults
await serverSettings.reset(guildId);
```

Default settings for new servers:
- `prefix`: `!`
- `welcomeChannel`: `null`
- `logChannel`: `null`
- `autoRole`: `null`

## Example Commands

### Prefix Commands

**!ping** - Test command that replies with "Pong!"
```javascript
if (commandName === 'ping') {
  await message.reply('Pong! 🏓');
}
```

**!setprefix <new_prefix>** - Change server's command prefix (Admin only)
```javascript
if (commandName === 'setprefix') {
  const newPrefix = args[0];
  await serverSettings.set(message.guild.id, 'prefix', newPrefix);
  await message.reply(`✅ Prefix updated to \`${newPrefix}\``);
}
```

### Slash Commands

**/hello** - Friendly greeting
```javascript
if (interaction.commandName === 'hello') {
  await interaction.reply('Hey there! 👋');
}
```

## Adding New Commands

### Adding a Prefix Command

1. Add handler in `index.js` under `messageCreate` event:
```javascript
else if (commandName === 'yourcommand') {
  // Your command logic here
  await message.reply('Response!');
  await logger.commandExecuted('yourcommand', message.author, message.guild);
}
```

2. Wrap in existing try-catch block (already present in template)

### Adding a Slash Command

1. Define command in `deploy-command.js`:
```javascript
const commands = [
  {
    name: 'yourcommand',
    description: 'Your command description',
  },
  // ... existing commands
];
```

2. Deploy commands:
```bash
node deploy-command.js
```

3. Add handler in `index.js` under `interactionCreate` event:
```javascript
else if (interaction.commandName === 'yourcommand') {
  await interaction.reply('Response!');
  await logger.commandExecuted('yourcommand', interaction.user, interaction.guild);
}
```

## Logging

### Log Levels
- `debug`: Detailed debugging information
- `info`: General informational messages
- `warn`: Warning messages
- `error`: Error messages with stack traces

### Log Format
```
[2025-11-26T12:00:00.000Z] [INFO] Bot logged in as BotName#1234 | {"username":"BotName"}
[2025-11-26T12:01:00.000Z] [INFO] Command executed: ping | {"userId":"123","username":"User#0001","guildId":"456","guildName":"MyServer"}
[2025-11-26T12:02:00.000Z] [ERROR] Command error: test | {"error":"Something went wrong","stack":"...","userId":"123"}
```

### Using Logger

```javascript
import Logger from './logger.js';
const logger = new Logger(config.logging);

await logger.info('Bot started');
await logger.warn('Warning message', { extra: 'data' });
await logger.error('Error occurred', { error: error.message });
await logger.debug('Debug info');

// Specialized methods
await logger.commandExecuted('ping', user, guild);
await logger.commandError('test', error, user, guild);
await logger.guildJoin(guild);
await logger.guildLeave(guild);
```

## Error Handling

All commands are wrapped in try-catch blocks:

```javascript
try {
  // Command logic
  await message.reply('Success!');
  await logger.commandExecuted(commandName, message.author, message.guild);
  
} catch (error) {
  await logger.commandError(commandName, error, message.author, message.guild);
  
  try {
    await message.reply(config.errorMessages.generic);
  } catch (replyError) {
    await logger.error('Failed to send error message', { error: replyError.message });
  }
}
```

Global handlers catch unhandled errors:
- `process.on('unhandledRejection')` - Logs promise rejections
- `process.on('uncaughtException')` - Logs uncaught exceptions and exits gracefully

## File Structure

```
gnomesaiyan/
├── config.js                 # Global configuration
├── serverSettings.js         # Per-server settings manager
├── logger.js                 # Logging system
├── index.js                  # Main bot file
├── deploy-command.js         # Slash command deployment
├── package.json              # Dependencies
├── .env                      # Environment variables (not in git)
├── .gitignore               # Git ignore rules
├── server-settings.json      # Server settings storage (auto-generated)
├── logs/                     # Log files directory (auto-generated)
│   └── bot.log              # Main log file
├── CLAUDE.md                 # Claude AI assistant guide
└── README.md                 # This file
```

## Best Practices

1. **Always use try-catch blocks** around command logic
2. **Log important events** using the logger
3. **Use config for customizable values** instead of hardcoding
4. **Test commands** in a development server before production
5. **Check permissions** before executing admin commands
6. **Handle both deferred and non-deferred interactions** for slash commands
7. **Monitor logs** for errors and unusual activity

## Troubleshooting

### Commands not working?
- Check logs in `logs/bot.log`
- Verify environment variables in `.env`
- Ensure bot has proper permissions in Discord
- For slash commands, run `node deploy-command.js` after changes

### Server settings not persisting?
- Check file permissions for `server-settings.json`
- Verify server ID is correct
- Check logs for save errors

### Logging not working?
- Check `config.js` logging settings
- Ensure `logs/` directory can be created
- Verify file system permissions

## License

ISC
