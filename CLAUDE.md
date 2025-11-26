# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Discord bot built with discord.js v14, supporting both prefix commands and slash (application) commands. The bot uses ES modules (type: "module" in package.json).

## Environment Setup

The bot requires a `.env` file with the following variables:
- `DISCORD_TOKEN` - Discord bot token for authentication
- `CLIENT_ID` - Discord application client ID (required for slash commands)
- `GUILD_ID` - Discord guild/server ID (for guild-specific slash commands)

## Common Commands

### Running the Bot
```bash
npm start
# or
node index.js
```

### Deploying Slash Commands
```bash
node deploy-command.js
```
This registers slash commands with Discord's API. Must be run whenever slash commands are added or modified in `deploy-command.js`.

### Installing Dependencies
```bash
npm install
```

## Architecture

### Bot Structure
- **index.js** - Main bot entry point. Contains:
  - Discord client initialization with required intents (Guilds, GuildMessages, MessageContent)
  - Event handlers for `ready`, `messageCreate` (prefix commands), and `interactionCreate` (slash commands)
  - Guild join/leave event handlers with logging
  - Comprehensive error handling with try-catch blocks
  - Bot login logic

- **deploy-command.js** - Slash command registration script. Contains:
  - Command definitions array (name, description, options)
  - Discord REST API client for registering commands to a specific guild or globally
  - Environment variable validation
  - Logging for deployment success/failure

- **config.js** - Centralized configuration system. Contains:
  - Default prefix for commands
  - Slash command settings (enabled, guild-only vs global)
  - Bot behavior settings (status, activity)
  - Error message templates
  - Logging configuration

- **serverSettings.js** - Per-server configuration management. Contains:
  - JSON file-based storage for guild-specific settings
  - Methods to get/set/update/reset server settings
  - Automatic initialization for new servers
  - Customizable prefix per server

- **logger.js** - Logging system. Provides:
  - Console and optional file logging
  - Log levels (debug, info, warn, error)
  - Structured logging with timestamps and metadata
  - Specialized methods for tracking joins, leaves, command execution, and errors
  - Logs stored in `logs/bot.log`

### Command Types

**Prefix Commands**: Traditional text-based commands (e.g., `!ping`) handled in the `messageCreate` event. 
- Must check `message.author.bot` to prevent bot responses to other bots
- Supports per-server custom prefixes via `serverSettings`
- Wrapped in try-catch blocks with error logging
- Example commands: `!ping`, `!setprefix <new_prefix>`

**Slash Commands**: Application commands (e.g., `/hello`) handled in the `interactionCreate` event. 
- Must check `interaction.isChatInputCommand()` to filter interaction types
- Wrapped in try-catch blocks with proper error responses
- Handles both deferred and non-deferred replies

### Error Handling

All commands and interactions are wrapped in try-catch blocks that:
- Log errors with full context (user, guild, command name, stack trace)
- Send user-friendly error messages from config
- Handle edge cases like failed replies
- Prevent bot crashes from unhandled errors

Global error handlers catch:
- Unhandled promise rejections
- Uncaught exceptions

### Required Gateway Intents

The bot requires these intents:
- `GatewayIntentBits.Guilds` - Access to guild information
- `GatewayIntentBits.GuildMessages` - Access to message events
- `GatewayIntentBits.MessageContent` - Required to read message content for prefix commands (privileged intent)

## Development Workflow

1. **Adding a Prefix Command**: 
   - Add handler in `messageCreate` event in `index.js`
   - Wrap in try-catch block
   - Use `config.prefix` or server-specific prefix via `serverSettings.get(guildId).prefix`
   - Log execution with `logger.commandExecuted()`
   
2. **Adding a Slash Command**:
   - Define command object in `deploy-command.js`
   - Run `node deploy-command.js` to register
   - Add handler in `interactionCreate` event in `index.js`
   - Wrap in try-catch block with proper reply handling
   - Log execution with `logger.commandExecuted()`
   
3. **Configuring Bot Settings**:
   - Edit `config.js` for global settings (prefix, error messages, logging)
   - Server-specific settings managed via `serverSettings` API
   
4. **Testing**: Start bot with `npm start` and test in connected Discord server

## Configuration

### Global Config (`config.js`)
- `prefix`: Default command prefix (default: `!`)
- `slashCommands.enabled`: Enable/disable slash commands
- `slashCommands.guildOnly`: Deploy to specific guild vs globally
- `bot.status`: Bot online status
- `bot.activity`: Bot activity display
- `errorMessages`: Customizable error message templates
- `logging.console`: Enable console logging
- `logging.file`: Enable file logging to `logs/bot.log`
- `logging.logLevel`: Minimum log level (debug, info, warn, error)

### Per-Server Settings (`serverSettings`)
Stored in `server-settings.json`. Each guild can have:
- `prefix`: Custom command prefix for that server
- `welcomeChannel`: Channel ID for welcome messages
- `logChannel`: Channel ID for server logs
- `autoRole`: Role ID to auto-assign to new members

Access via:
```javascript
const settings = serverSettings.get(guildId);
await serverSettings.set(guildId, 'prefix', '?');
```

### Logging
Logs are written to:
- **Console**: Real-time output during development
- **File**: `logs/bot.log` for persistent records

Log events include:
- Bot ready/login
- Guild joins/leaves
- Command executions
- Errors (with stack traces)
- Unhandled rejections/exceptions
