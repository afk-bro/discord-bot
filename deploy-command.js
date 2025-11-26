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
  {
    name: '8ball',
    description: 'Ask the magic 8-ball a question',
    options: [
      {
        name: 'question',
        type: 3, // STRING type
        description: 'Your question for the 8-ball',
        required: true,
      },
    ],
  },
  {
    name: 'joke',
    description: 'Get a random programming joke',
  },
  {
    name: 'quote',
    description: 'Get an inspiring quote',
  },
  {
    name: 'coinflip',
    description: 'Flip a coin (heads or tails)',
  },
  {
    name: 'dice',
    description: 'Roll a dice',
    options: [
      {
        name: 'sides',
        type: 4, // INTEGER type
        description: 'Number of sides on the dice (default: 6, max: 100)',
        required: false,
        min_value: 2,
        max_value: 100,
      },
    ],
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
