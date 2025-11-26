import 'dotenv/config';
import { Client, GatewayIntentBits, ActivityType } from 'discord.js';
import config from './config.js';
import serverSettings from './serverSettings.js';
import Logger from './logger.js';

// Initialize logger
const logger = new Logger(config.logging);

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // needed to read message text
  ],
});

// Bot ready event
client.once('ready', async () => {
  await logger.botReady(client.user.username, client.user.tag);
  
  // Set bot activity/status
  client.user.setPresence({
    activities: [{
      name: config.bot.activity.name,
      type: ActivityType.Playing,
    }],
    status: config.bot.status,
  });
  
  // Load server settings
  try {
    await serverSettings.load();
    await logger.info('Server settings loaded successfully');
  } catch (error) {
    await logger.error('Failed to load server settings', { error: error.message });
  }
});

// Guild join event - log and initialize settings
client.on('guildCreate', async (guild) => {
  await logger.guildJoin(guild);
  // Settings will be initialized on first access via serverSettings.get()
});

// Guild leave event - log and optionally clean up settings
client.on('guildDelete', async (guild) => {
  await logger.guildLeave(guild);
  // Optionally remove settings: await serverSettings.remove(guild.id);
});

// Prefix command handler
client.on('messageCreate', async (message) => {
  // Ignore messages from bots (including itself)
  if (config.bot.ignoreBots && message.author.bot) return;
  
  // Get server-specific prefix (or use default)
  const prefix = message.guild 
    ? serverSettings.get(message.guild.id).prefix 
    : config.prefix;
  
  // Check if message starts with prefix
  if (!message.content.startsWith(prefix)) return;
  
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  
  try {
    // Example: !ping command
    if (commandName === 'ping') {
      await message.reply('Pong! 🏓');
      await logger.commandExecuted('ping', message.author, message.guild);
    }
    
    // Example: !setprefix command (server admin only)
    else if (commandName === 'setprefix') {
      if (!message.guild) {
        await message.reply('❌ This command can only be used in a server.');
        return;
      }
      
      if (!message.member.permissions.has('Administrator')) {
        await message.reply(config.errorMessages.permissionDenied);
        return;
      }
      
      const newPrefix = args[0];
      if (!newPrefix) {
        await message.reply(`Current prefix: \`${prefix}\`\nUsage: ${prefix}setprefix <new_prefix>`);
        return;
      }
      
      await serverSettings.set(message.guild.id, 'prefix', newPrefix);
      await message.reply(`✅ Prefix updated to \`${newPrefix}\``);
      await logger.commandExecuted('setprefix', message.author, message.guild);
    }
    
  } catch (error) {
    await logger.commandError(commandName, error, message.author, message.guild);
    
    try {
      await message.reply(config.errorMessages.generic);
    } catch (replyError) {
      // If we can't reply, just log it
      await logger.error('Failed to send error message', { error: replyError.message });
    }
  }
});

// Slash command handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  try {
    // Example: /hello command
    if (interaction.commandName === 'hello') {
      await interaction.reply('Hey there! 👋');
      await logger.commandExecuted('hello', interaction.user, interaction.guild);
    }
    
  } catch (error) {
    await logger.commandError(interaction.commandName, error, interaction.user, interaction.guild);
    
    try {
      const errorMsg = config.errorMessages.generic;
      
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: errorMsg, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMsg, ephemeral: true });
      }
    } catch (replyError) {
      // If we can't reply, just log it
      await logger.error('Failed to send error message', { error: replyError.message });
    }
  }
});

// Global error handlers
process.on('unhandledRejection', async (error) => {
  await logger.error('Unhandled promise rejection', {
    error: error.message,
    stack: error.stack,
  });
});

process.on('uncaughtException', async (error) => {
  await logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  // Give logger time to write before exit
  setTimeout(() => process.exit(1), 1000);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN).catch(async (error) => {
  await logger.error('Failed to login', { error: error.message });
  process.exit(1);
});
