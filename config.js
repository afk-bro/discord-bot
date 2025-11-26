// Centralized configuration for the Discord bot
export default {
  // Prefix command settings
  prefix: '!',
  
  // Slash command settings
  slashCommands: {
    enabled: true,
    guildOnly: true, // Set to false to deploy globally
  },
  
  // Bot behavior settings
  bot: {
    // Ignore messages from other bots
    ignoreBots: true,
    // Default status message
    status: 'online',
    activity: {
      type: 'PLAYING', // PLAYING, STREAMING, LISTENING, WATCHING, COMPETING
      name: 'with commands',
    },
  },
  
  // Error handling
  errorMessages: {
    generic: '❌ An error occurred while executing that command.',
    permissionDenied: '⛔ You don\'t have permission to use this command.',
    cooldown: '⏱️ Please wait before using this command again.',
    notFound: '❓ Command not found.',
  },
  
  // Logging settings
  logging: {
    console: true,
    file: true, // Set to false to disable file logging
    logLevel: 'info', // 'debug', 'info', 'warn', 'error'
  },
};
