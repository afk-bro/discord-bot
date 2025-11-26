import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'bot.log');

class Logger {
  constructor(config = {}) {
    this.consoleEnabled = config.console !== false;
    this.fileEnabled = config.file !== false;
    this.logLevel = config.logLevel || 'info';
    
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    
    this.levelThreshold = this.levels[this.logLevel] || 1;
    
    // Create logs directory if file logging is enabled
    if (this.fileEnabled) {
      this.ensureLogDirectory();
    }
  }

  /**
   * Ensure logs directory exists
   */
  async ensureLogDirectory() {
    try {
      await fs.mkdir(LOG_DIR, { recursive: true });
    } catch (error) {
      console.error('Failed to create logs directory:', error);
      this.fileEnabled = false;
    }
  }

  /**
   * Format timestamp for logs
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Format log message
   */
  formatMessage(level, message, data = null) {
    const timestamp = this.getTimestamp();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
  }

  /**
   * Write log to file
   */
  async writeToFile(message) {
    if (!this.fileEnabled) return;
    
    try {
      await fs.appendFile(LOG_FILE, message + '\n', 'utf-8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Log a message at specified level
   */
  async log(level, message, data = null) {
    if (this.levels[level] < this.levelThreshold) return;
    
    const formatted = this.formatMessage(level, message, data);
    
    if (this.consoleEnabled) {
      switch (level) {
        case 'error':
          console.error(formatted);
          break;
        case 'warn':
          console.warn(formatted);
          break;
        case 'debug':
        case 'info':
        default:
          console.log(formatted);
          break;
      }
    }
    
    await this.writeToFile(formatted);
  }

  /**
   * Log debug message
   */
  async debug(message, data = null) {
    await this.log('debug', message, data);
  }

  /**
   * Log info message
   */
  async info(message, data = null) {
    await this.log('info', message, data);
  }

  /**
   * Log warning message
   */
  async warn(message, data = null) {
    await this.log('warn', message, data);
  }

  /**
   * Log error message
   */
  async error(message, data = null) {
    await this.log('error', message, data);
  }

  /**
   * Log bot ready event
   */
  async botReady(username, tag) {
    await this.info(`Bot logged in as ${tag}`, { username });
  }

  /**
   * Log guild join event
   */
  async guildJoin(guild) {
    await this.info(`Joined guild: ${guild.name}`, {
      guildId: guild.id,
      memberCount: guild.memberCount,
    });
  }

  /**
   * Log guild leave event
   */
  async guildLeave(guild) {
    await this.info(`Left guild: ${guild.name}`, {
      guildId: guild.id,
    });
  }

  /**
   * Log command execution
   */
  async commandExecuted(commandName, user, guild = null) {
    const guildInfo = guild ? { guildId: guild.id, guildName: guild.name } : { dm: true };
    await this.info(`Command executed: ${commandName}`, {
      userId: user.id,
      username: user.tag,
      ...guildInfo,
    });
  }

  /**
   * Log command error
   */
  async commandError(commandName, error, user, guild = null) {
    const guildInfo = guild ? { guildId: guild.id, guildName: guild.name } : { dm: true };
    await this.error(`Command error: ${commandName}`, {
      error: error.message,
      stack: error.stack,
      userId: user.id,
      username: user.tag,
      ...guildInfo,
    });
  }
}

export default Logger;
