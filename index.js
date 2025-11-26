import 'dotenv/config';
import { Client, GatewayIntentBits, ActivityType, EmbedBuilder } from 'discord.js';
import config from './config.js';
import serverSettings from './serverSettings.js';
import Logger from './logger.js';
import levelingSystem from './levelingSystem.js';

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
  
  // Load leveling system
  if (config.leveling.enabled) {
    try {
      await levelingSystem.load();
      await logger.info('Leveling system loaded successfully');
    } catch (error) {
      await logger.error('Failed to load leveling system', { error: error.message });
    }
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
  
  // Track XP for non-command messages
  if (config.leveling.enabled && message.guild && !message.content.startsWith(config.prefix)) {
    try {
      const hasMedia = message.attachments.size > 0 || message.embeds.length > 0;
      const isLongMessage = message.content.length > 200;
      
      const result = await levelingSystem.addXp(message.author.id, message.guild.id, {
        hasMedia,
        isLongMessage,
      });
      
      // Handle level up
      if (result && result.newLevel) {
        const titleData = levelingSystem.getUserTitle(message.author.id, message.guild.id);
        const xpNeeded = levelingSystem.getXpForLevel(result.newLevel + 1);
        
        const embed = new EmbedBuilder()
          .setColor('#FFD700')
          .setTitle('🎉 LEVEL UP! 🎉')
          .setDescription(`<@${message.author.id}> has reached **Level ${result.newLevel}**!`)
          .addFields(
            { name: 'New Title', value: titleData.title, inline: true },
            { name: 'Total XP', value: result.totalXp.toString(), inline: true },
            { name: 'Next Level', value: `${xpNeeded} XP needed`, inline: true }
          )
          .setThumbnail(message.author.displayAvatarURL())
          .setTimestamp();
        
        if (result.canPrestige) {
          embed.addFields({ name: '👑 Prestige Available!', value: 'You can now prestige! Use `/prestige` to reset and gain prestige rank.' });
        }
        
        await message.channel.send({ embeds: [embed] });
      }
    } catch (error) {
      await logger.error('Failed to add XP', { error: error.message });
    }
  }
  
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
    
    // Fun command: !8ball
    else if (commandName === '8ball') {
      const question = args.join(' ');
      if (!question) {
        await message.reply(`❓ Please ask a question! Usage: ${prefix}8ball <question>`);
        return;
      }
      
      const responses = [
        '🎱 It is certain.',
        '🎱 Without a doubt.',
        '🎱 Yes, definitely.',
        '🎱 You may rely on it.',
        '🎱 As I see it, yes.',
        '🎱 Most likely.',
        '🎱 Outlook good.',
        '🎱 Yes.',
        '🎱 Signs point to yes.',
        '🎱 Reply hazy, try again.',
        '🎱 Ask again later.',
        '🎱 Better not tell you now.',
        '🎱 Cannot predict now.',
        '🎱 Concentrate and ask again.',
        '🎱 Don\'t count on it.',
        '🎱 My reply is no.',
        '🎱 My sources say no.',
        '🎱 Outlook not so good.',
        '🎱 Very doubtful.',
      ];
      
      const answer = responses[Math.floor(Math.random() * responses.length)];
      await message.reply(`**Question:** ${question}\n${answer}`);
      await logger.commandExecuted('8ball', message.author, message.guild);
    }
    
    // Fun command: !joke
    else if (commandName === 'joke') {
      const jokes = [
        'Why do programmers prefer dark mode? Because light attracts bugs! 🐛',
        'Why did the developer go broke? Because he used up all his cache! 💰',
        'How many programmers does it take to change a light bulb? None, that\'s a hardware problem! 💡',
        'Why do Java developers wear glasses? Because they don\'t C#! 👓',
        'What\'s a programmer\'s favorite hangout place? Foo Bar! 🍺',
        'Why did the function break up with the variable? Because it had too many arguments! 💔',
        'What do you call a programmer from Finland? Nerdic! 🇫🇮',
        'Why did the programmer quit his job? Because he didn\'t get arrays! 📊',
      ];
      
      const joke = jokes[Math.floor(Math.random() * jokes.length)];
      await message.reply(joke);
      await logger.commandExecuted('joke', message.author, message.guild);
    }
    
    // Fun command: !quote
    else if (commandName === 'quote') {
      const quotes = [
        '"The only way to do great work is to love what you do." - Steve Jobs',
        '"Code is like humor. When you have to explain it, it\'s bad." - Cory House',
        '"First, solve the problem. Then, write the code." - John Johnson',
        '"Experience is the name everyone gives to their mistakes." - Oscar Wilde',
        '"In order to be irreplaceable, one must always be different." - Coco Chanel',
        '"Java is to JavaScript what car is to Carpet." - Chris Heilmann',
        '"Knowledge is power." - Francis Bacon',
        '"Sometimes it pays to stay in bed on Monday, rather than spending the rest of the week debugging Monday\'s code." - Dan Salomon',
        '"Perfection is achieved not when there is nothing more to add, but rather when there is nothing more to take away." - Antoine de Saint-Exupery',
        '"Talk is cheap. Show me the code." - Linus Torvalds',
      ];
      
      const quote = quotes[Math.floor(Math.random() * quotes.length)];
      await message.reply(`💭 ${quote}`);
      await logger.commandExecuted('quote', message.author, message.guild);
    }
    
    // Fun command: !coinflip
    else if (commandName === 'coinflip' || commandName === 'flip') {
      const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
      await message.reply(`🪙 The coin landed on: **${result}**!`);
      await logger.commandExecuted('coinflip', message.author, message.guild);
    }
    
    // Fun command: !dice or !roll
    else if (commandName === 'dice' || commandName === 'roll') {
      const sides = parseInt(args[0]) || 6;
      if (sides < 2 || sides > 100) {
        await message.reply('🎲 Please specify a number between 2 and 100!');
        return;
      }
      
      const result = Math.floor(Math.random() * sides) + 1;
      await message.reply(`🎲 You rolled a **${result}** (1-${sides})`);
      await logger.commandExecuted('dice', message.author, message.guild);
    }
    
    // Leveling command: !rank or !level
    else if (commandName === 'rank' || commandName === 'level') {
      if (!message.guild) {
        await message.reply('❌ This command can only be used in a server.');
        return;
      }
      
      const targetUser = message.mentions.users.first() || message.author;
      const userData = levelingSystem.getUser(targetUser.id, message.guild.id);
      const titleData = levelingSystem.getUserTitle(targetUser.id, message.guild.id);
      const xpNeeded = levelingSystem.getXpForLevel(userData.level + 1);
      const rank = levelingSystem.getUserRank(targetUser.id, message.guild.id);
      
      const embed = new EmbedBuilder()
        .setColor('#00BFFF')
        .setTitle(`${titleData.emoji} ${targetUser.username}'s Rank`)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: 'Level', value: `${userData.level}`, inline: true },
          { name: 'Rank', value: `#${rank || 'N/A'}`, inline: true },
          { name: 'Prestige', value: `${userData.prestige}`, inline: true },
          { name: 'XP Progress', value: `${userData.xp}/${xpNeeded}`, inline: true },
          { name: 'Total XP', value: `${userData.totalXp}`, inline: true },
          { name: 'Messages', value: `${userData.messages}`, inline: true },
          { name: 'Title', value: titleData.title, inline: false }
        )
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      await logger.commandExecuted('rank', message.author, message.guild);
    }
    
    // Leveling command: !leaderboard or !lb
    else if (commandName === 'leaderboard' || commandName === 'lb') {
      if (!message.guild) {
        await message.reply('❌ This command can only be used in a server.');
        return;
      }
      
      const isWeekly = args[0] === 'weekly' || args[0] === 'week';
      const leaderboard = levelingSystem.getLeaderboard(message.guild.id, 10, isWeekly);
      
      if (leaderboard.length === 0) {
        await message.reply('📊 No users ranked yet!');
        return;
      }
      
      let description = '';
      for (let i = 0; i < leaderboard.length; i++) {
        const user = leaderboard[i];
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        const titleData = levelingSystem.getUserTitle(user.userId, message.guild.id);
        const xpDisplay = isWeekly ? user.weeklyXp : user.totalXp;
        description += `${medal} <@${user.userId}> - Level ${user.level} (${xpDisplay} XP)\\n${titleData.emoji} ${titleData.title}\\n\\n`;
      }
      
      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle(`🏆 ${isWeekly ? 'Weekly' : 'All-Time'} Leaderboard`)
        .setDescription(description)
        .setFooter({ text: `${message.guild.name}` })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      await logger.commandExecuted('leaderboard', message.author, message.guild);
    }
    
    // Leveling command: !daily
    else if (commandName === 'daily') {
      if (!message.guild) {
        await message.reply('❌ This command can only be used in a server.');
        return;
      }
      
      const result = await levelingSystem.claimDailyBonus(message.author.id, message.guild.id);
      
      if (!result.claimed) {
        const hours = Math.floor(result.timeLeft / 3600000);
        const minutes = Math.floor((result.timeLeft % 3600000) / 60000);
        await message.reply(`⏱️ You've already claimed your daily bonus! Come back in ${hours}h ${minutes}m.`);
        return;
      }
      
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🎁 Daily Bonus Claimed!')
        .setDescription(`You received **${result.xpGained} XP**!`)
        .setFooter({ text: 'Come back tomorrow for another bonus!' })
        .setTimestamp();
      
      if (result.leveledUp) {
        embed.addFields({ name: '🎉 Level Up!', value: `You are now level ${result.newLevel}!` });
      }
      
      await message.reply({ embeds: [embed] });
      await logger.commandExecuted('daily', message.author, message.guild);
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
    
    // Fun command: /8ball
    else if (interaction.commandName === '8ball') {
      const question = interaction.options.getString('question');
      
      const responses = [
        '🎱 It is certain.',
        '🎱 Without a doubt.',
        '🎱 Yes, definitely.',
        '🎱 You may rely on it.',
        '🎱 As I see it, yes.',
        '🎱 Most likely.',
        '🎱 Outlook good.',
        '🎱 Yes.',
        '🎱 Signs point to yes.',
        '🎱 Reply hazy, try again.',
        '🎱 Ask again later.',
        '🎱 Better not tell you now.',
        '🎱 Cannot predict now.',
        '🎱 Concentrate and ask again.',
        '🎱 Don\'t count on it.',
        '🎱 My reply is no.',
        '🎱 My sources say no.',
        '🎱 Outlook not so good.',
        '🎱 Very doubtful.',
      ];
      
      const answer = responses[Math.floor(Math.random() * responses.length)];
      await interaction.reply(`**Question:** ${question}\n${answer}`);
      await logger.commandExecuted('8ball', interaction.user, interaction.guild);
    }
    
    // Fun command: /joke
    else if (interaction.commandName === 'joke') {
      const jokes = [
        'Why do programmers prefer dark mode? Because light attracts bugs! 🐛',
        'Why did the developer go broke? Because he used up all his cache! 💰',
        'How many programmers does it take to change a light bulb? None, that\'s a hardware problem! 💡',
        'Why do Java developers wear glasses? Because they don\'t C#! 👓',
        'What\'s a programmer\'s favorite hangout place? Foo Bar! 🍺',
        'Why did the function break up with the variable? Because it had too many arguments! 💔',
        'What do you call a programmer from Finland? Nerdic! 🇫🇮',
        'Why did the programmer quit his job? Because he didn\'t get arrays! 📊',
      ];
      
      const joke = jokes[Math.floor(Math.random() * jokes.length)];
      await interaction.reply(joke);
      await logger.commandExecuted('joke', interaction.user, interaction.guild);
    }
    
    // Fun command: /quote
    else if (interaction.commandName === 'quote') {
      const quotes = [
        '"The only way to do great work is to love what you do." - Steve Jobs',
        '"Code is like humor. When you have to explain it, it\'s bad." - Cory House',
        '"First, solve the problem. Then, write the code." - John Johnson',
        '"Experience is the name everyone gives to their mistakes." - Oscar Wilde',
        '"In order to be irreplaceable, one must always be different." - Coco Chanel',
        '"Java is to JavaScript what car is to Carpet." - Chris Heilmann',
        '"Knowledge is power." - Francis Bacon',
        '"Sometimes it pays to stay in bed on Monday, rather than spending the rest of the week debugging Monday\'s code." - Dan Salomon',
        '"Perfection is achieved not when there is nothing more to add, but rather when there is nothing more to take away." - Antoine de Saint-Exupery',
        '"Talk is cheap. Show me the code." - Linus Torvalds',
      ];
      
      const quote = quotes[Math.floor(Math.random() * quotes.length)];
      await interaction.reply(`💭 ${quote}`);
      await logger.commandExecuted('quote', interaction.user, interaction.guild);
    }
    
    // Fun command: /coinflip
    else if (interaction.commandName === 'coinflip') {
      const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
      await interaction.reply(`🪙 The coin landed on: **${result}**!`);
      await logger.commandExecuted('coinflip', interaction.user, interaction.guild);
    }
    
    // Fun command: /dice
    else if (interaction.commandName === 'dice') {
      const sides = interaction.options.getInteger('sides') || 6;
      const result = Math.floor(Math.random() * sides) + 1;
      await interaction.reply(`🎲 You rolled a **${result}** (1-${sides})`);
      await logger.commandExecuted('dice', interaction.user, interaction.guild);
    }
    
    // Leveling command: /rank
    else if (interaction.commandName === 'rank') {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const userData = levelingSystem.getUser(targetUser.id, interaction.guild.id);
      const titleData = levelingSystem.getUserTitle(targetUser.id, interaction.guild.id);
      const xpNeeded = levelingSystem.getXpForLevel(userData.level + 1);
      const rank = levelingSystem.getUserRank(targetUser.id, interaction.guild.id);
      
      const embed = new EmbedBuilder()
        .setColor('#00BFFF')
        .setTitle(`${titleData.emoji} ${targetUser.username}'s Rank`)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: 'Level', value: `${userData.level}`, inline: true },
          { name: 'Rank', value: `#${rank || 'N/A'}`, inline: true },
          { name: 'Prestige', value: `${userData.prestige}`, inline: true },
          { name: 'XP Progress', value: `${userData.xp}/${xpNeeded}`, inline: true },
          { name: 'Total XP', value: `${userData.totalXp}`, inline: true },
          { name: 'Messages', value: `${userData.messages}`, inline: true },
          { name: 'Title', value: titleData.title, inline: false }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      await logger.commandExecuted('rank', interaction.user, interaction.guild);
    }
    
    // Leveling command: /leaderboard
    else if (interaction.commandName === 'leaderboard') {
      const type = interaction.options.getString('type') || 'alltime';
      const isWeekly = type === 'weekly';
      const leaderboard = levelingSystem.getLeaderboard(interaction.guild.id, 10, isWeekly);
      
      if (leaderboard.length === 0) {
        await interaction.reply('📊 No users ranked yet!');
        return;
      }
      
      let description = '';
      for (let i = 0; i < leaderboard.length; i++) {
        const user = leaderboard[i];
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        const titleData = levelingSystem.getUserTitle(user.userId, interaction.guild.id);
        const xpDisplay = isWeekly ? user.weeklyXp : user.totalXp;
        description += `${medal} <@${user.userId}> - Level ${user.level} (${xpDisplay} XP)\\n${titleData.emoji} ${titleData.title}\\n\\n`;
      }
      
      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle(`🏆 ${isWeekly ? 'Weekly' : 'All-Time'} Leaderboard`)
        .setDescription(description)
        .setFooter({ text: `${interaction.guild.name}` })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      await logger.commandExecuted('leaderboard', interaction.user, interaction.guild);
    }
    
    // Leveling command: /daily
    else if (interaction.commandName === 'daily') {
      const result = await levelingSystem.claimDailyBonus(interaction.user.id, interaction.guild.id);
      
      if (!result.claimed) {
        const hours = Math.floor(result.timeLeft / 3600000);
        const minutes = Math.floor((result.timeLeft % 3600000) / 60000);
        await interaction.reply(`⏱️ You've already claimed your daily bonus! Come back in ${hours}h ${minutes}m.`);
        return;
      }
      
      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🎁 Daily Bonus Claimed!')
        .setDescription(`You received **${result.xpGained} XP**!`)
        .setFooter({ text: 'Come back tomorrow for another bonus!' })
        .setTimestamp();
      
      if (result.leveledUp) {
        embed.addFields({ name: '🎉 Level Up!', value: `You are now level ${result.newLevel}!` });
      }
      
      await interaction.reply({ embeds: [embed] });
      await logger.commandExecuted('daily', interaction.user, interaction.guild);
    }
    
    // Leveling command: /prestige
    else if (interaction.commandName === 'prestige') {
      const result = await levelingSystem.prestige(interaction.user.id, interaction.guild.id);
      
      if (!result.success) {
        await interaction.reply('❌ You need to be level 50 to prestige!');
        return;
      }
      
      const prestigeData = levelingSystem.getUserTitle(interaction.user.id, interaction.guild.id);
      
      const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('👑 PRESTIGE ACHIEVED! 👑')
        .setDescription(`<@${interaction.user.id}> has reached **Prestige ${result.newPrestige}**!`)
        .addFields(
          { name: 'New Title', value: prestigeData.title, inline: false },
          { name: 'Retained XP', value: `${result.retainedXp} (10%)`, inline: true },
          { name: 'New Level', value: `${result.newLevel}`, inline: true }
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      await logger.commandExecuted('prestige', interaction.user, interaction.guild);
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
