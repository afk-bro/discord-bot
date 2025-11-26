import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SETTINGS_FILE = path.join(__dirname, 'server-settings.json');

// Default settings for new servers
const DEFAULT_SETTINGS = {
  prefix: '!',
  welcomeChannel: null,
  logChannel: null,
  autoRole: null,
};

class ServerSettings {
  constructor() {
    this.settings = new Map();
    this.loaded = false;
  }

  /**
   * Load server settings from file
   */
  async load() {
    try {
      const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Convert object to Map
      for (const [guildId, settings] of Object.entries(parsed)) {
        this.settings.set(guildId, settings);
      }
      
      this.loaded = true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist yet, create it
        await this.save();
        this.loaded = true;
      } else {
        throw error;
      }
    }
  }

  /**
   * Save server settings to file
   */
  async save() {
    try {
      // Convert Map to object for JSON
      const obj = Object.fromEntries(this.settings);
      await fs.writeFile(SETTINGS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save server settings:', error);
      throw error;
    }
  }

  /**
   * Get settings for a specific guild
   * @param {string} guildId - Discord guild ID
   * @returns {Object} Guild settings
   */
  get(guildId) {
    if (!this.settings.has(guildId)) {
      this.settings.set(guildId, { ...DEFAULT_SETTINGS });
    }
    return this.settings.get(guildId);
  }

  /**
   * Update a specific setting for a guild
   * @param {string} guildId - Discord guild ID
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   */
  async set(guildId, key, value) {
    const guildSettings = this.get(guildId);
    guildSettings[key] = value;
    this.settings.set(guildId, guildSettings);
    await this.save();
  }

  /**
   * Update multiple settings at once
   * @param {string} guildId - Discord guild ID
   * @param {Object} settings - Object with settings to update
   */
  async update(guildId, settings) {
    const guildSettings = this.get(guildId);
    Object.assign(guildSettings, settings);
    this.settings.set(guildId, guildSettings);
    await this.save();
  }

  /**
   * Reset settings for a guild to defaults
   * @param {string} guildId - Discord guild ID
   */
  async reset(guildId) {
    this.settings.set(guildId, { ...DEFAULT_SETTINGS });
    await this.save();
  }

  /**
   * Remove settings for a guild (e.g., when bot leaves)
   * @param {string} guildId - Discord guild ID
   */
  async remove(guildId) {
    this.settings.delete(guildId);
    await this.save();
  }
}

// Export a singleton instance
export default new ServerSettings();
