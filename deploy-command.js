import 'dotenv/config';
import { REST, Routes } from '@discordjs/rest';
import Logger from './logger.js';
import config from './config.js';

// Initialize logger
const logger = new Logger(config.logging);

const commands = [
  {
    name: 'hello',
    description: 'Replies with a friendly greeting',
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

async function main() {
  try {
    // Validate environment variables
    if (!process.env.DISCORD_TOKEN) {
      throw new Error('DISCORD_TOKEN is not set in environment variables');
    }
    if (!CLIENT_ID) {
      throw new Error('CLIENT_ID is not set in environment variables');
    }
    
    await logger.info('Starting slash command deployment...');
    console.log('Refreshing application (/) commands...');
    
    // Deploy to guild or globally based on config
    let route;
    let scope;
    
    if (config.slashCommands.guildOnly) {
      if (!GUILD_ID) {
        throw new Error('GUILD_ID is not set but guildOnly is enabled in config');
      }
      route = Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID);
      scope = `guild ${GUILD_ID}`;
    } else {
      route = Routes.applicationCommands(CLIENT_ID);
      scope = 'globally';
    }
    
    await rest.put(route, { body: commands });
    
    const message = `Successfully deployed ${commands.length} command(s) ${scope}`;
    console.log(message);
    await logger.info(message, {
      commandCount: commands.length,
      commandNames: commands.map(c => c.name),
      scope,
    });
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    await logger.error('Slash command deployment failed', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

main();
