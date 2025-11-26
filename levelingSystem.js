import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEVELS_FILE = path.join(__dirname, 'user-levels.json');

const LEVEL_CONFIG = {
  xpPerMessage: 20, xpRandomBonus: 15, cooldown: 60000, xpMultiplier: 150,
  bonusMediaUpload: 25, bonusLongMessage: 15, bonusVoicePerMinute: 10,
  dailyLoginBonus: 100, dailyLoginWindow: 86400000, defaultBoosterDuration: 3600000,
  levelUpMessage: true, prestigeLevel: 50, prestigeXpRetention: 0.1,
};

const LEVEL_TITLES = {
  1: { title: 'Civilian', emoji: '👤' }, 2: { title: 'Martial Arts Student', emoji: '🥋' },
  3: { title: 'Ki Novice', emoji: '✨' }, 4: { title: 'Ki Apprentice', emoji: '⚡' },
  5: { title: 'Battle Trainee', emoji: '⚔️' }, 6: { title: 'Rising Fighter', emoji: '🔥' },
  7: { title: 'Z-Warrior in Training', emoji: '💪' }, 8: { title: 'Earth Defender', emoji: '🌍' },
  9: { title: 'Ki Adept', emoji: '💫' }, 10: { title: 'Battle Disciple', emoji: '🛡️' },
  11: { title: 'Serious Combatant', emoji: '⚡' }, 12: { title: 'Elite Recruit', emoji: '🎖️' },
  13: { title: 'Ki Specialist', emoji: '✴️' }, 14: { title: 'Spirit Warrior', emoji: '👊' },
  15: { title: 'Saiyan-Blooded', emoji: '💥' }, 16: { title: 'Saiyan Fighter', emoji: '🔴' },
  17: { title: 'Saiyan Elite', emoji: '🟠' }, 18: { title: 'Saiyan Vanguard', emoji: '🟡' },
  19: { title: 'Saiyan Commander', emoji: '⭐' }, 20: { title: 'Saiyan Champion', emoji: '🏆' },
  21: { title: 'Awakened Saiyan', emoji: '💛' }, 22: { title: 'Ascended Saiyan', emoji: '⚡' },
  23: { title: 'Radiant Saiyan', emoji: '✨' }, 24: { title: 'Empowered Saiyan', emoji: '💪' },
  25: { title: 'Ultra Saiyan', emoji: '🌟' }, 26: { title: 'Limit-Break Saiyan', emoji: '💥' },
  27: { title: 'Primal Saiyan', emoji: '🦍' }, 28: { title: 'Unleashed Saiyan', emoji: '⚡' },
  29: { title: 'Blazing Saiyan', emoji: '🔥' }, 30: { title: 'Golden Aura Warrior', emoji: '🟡' },
  31: { title: 'Apex Saiyan', emoji: '🔺' }, 32: { title: 'Transcendent Warrior', emoji: '🌠' },
  33: { title: 'Hyper-Ki Ascendant', emoji: '⚡' }, 34: { title: 'Celestial Saiyan', emoji: '☄️' },
  35: { title: 'Ultra Instinct Initiate', emoji: '🤍' }, 36: { title: 'Ultra Instinct Adept', emoji: '💠' },
  37: { title: 'Ultra Instinct Warrior', emoji: '💎' }, 38: { title: 'Ultra Instinct Master', emoji: '🔷' },
  39: { title: 'Ultra Instinct Ascendant', emoji: '🔮' }, 40: { title: 'Ultra Instinct Supreme', emoji: '👁️' },
  41: { title: 'Divine Aura Warrior', emoji: '🌌' }, 42: { title: 'Spirit-God Disciple', emoji: '🙏' },
  43: { title: 'Ki-Deity', emoji: '⚜️' }, 44: { title: 'God Ki Initiate', emoji: '🔵' },
  45: { title: 'God Ki Practitioner', emoji: '💙' }, 46: { title: 'God Ki Warrior', emoji: '🌀' },
  47: { title: 'God Ki Master', emoji: '💫' }, 48: { title: 'Cosmic Saiyan', emoji: '🌌' },
  49: { title: 'Universal Champion', emoji: '🌟' }, 50: { title: 'Legendary Ascendant', emoji: '👑' },
};

const PRESTIGE_TITLES = {
  1: { title: 'Eternal Saiyan', emoji: '♾️' }, 2: { title: 'Infinite Aura Warrior', emoji: '��' },
  3: { title: 'Timeless Instinct Master', emoji: '⏳' }, 4: { title: 'Cosmic Vanguard', emoji: '🪐' },
  5: { title: 'Omni-Saiyan', emoji: '🌠' },
};

const ROLE_MILESTONES = [5, 10, 15, 20, 30, 50];
class LevelingSystem {
  constructor() {
    this.users = new Map();
    this.cooldowns = new Map();
    this.voiceTracking = new Map();
    this.weeklyLeaderboard = new Map();
    this.loaded = false;
  }

  async load() {
    try {
      const data = await fs.readFile(LEVELS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      for (const [key, userData] of Object.entries(parsed)) {
        this.users.set(key, userData);
      }
      this.loaded = true;
      this.resetWeeklyLeaderboardIfNeeded();
    } catch (error) {
      if (error.code === 'ENOENT') {
        await this.save();
        this.loaded = true;
      } else {
        throw error;
      }
    }
  }

  async save() {
    try {
      const obj = Object.fromEntries(this.users);
      await fs.writeFile(LEVELS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save user levels:', error);
      throw error;
    }
  }

  getKey(userId, guildId) {
    return `${guildId}-${userId}`;
  }

  getUser(userId, guildId) {
    const key = this.getKey(userId, guildId);
    if (!this.users.has(key)) {
      this.users.set(key, {
        userId, guildId, xp: 0, level: 0, totalXp: 0, messages: 0,
        lastXpGain: 0, lastDailyLogin: 0, weeklyXp: 0, prestige: 0,
        activeBoosters: [], voiceMinutes: 0,
      });
    }
    return this.users.get(key);
  }

  getXpForLevel(level) {
    return Math.floor(level * LEVEL_CONFIG.xpMultiplier * (1 + level * 0.1));
  }

  getLevelFromXp(totalXp) {
    let level = 0, xp = totalXp;
    while (xp >= this.getXpForLevel(level + 1)) {
      xp -= this.getXpForLevel(level + 1);
      level++;
    }
    return { level, xp };
  }

  isOnCooldown(userId, guildId) {
    const key = this.getKey(userId, guildId);
    const lastGain = this.cooldowns.get(key) || 0;
    return Date.now() - lastGain < LEVEL_CONFIG.cooldown;
  }

  getActiveMultiplier(userId, guildId) {
    const user = this.getUser(userId, guildId);
    let multiplier = 1.0;
    const now = Date.now();
    user.activeBoosters = user.activeBoosters.filter(b => b.expiresAt > now);
    user.activeBoosters.forEach(b => multiplier += b.multiplier);
    return multiplier;
  }

  async addBooster(userId, guildId, multiplier, duration = LEVEL_CONFIG.defaultBoosterDuration) {
    const user = this.getUser(userId, guildId);
    const booster = { multiplier, expiresAt: Date.now() + duration, addedAt: Date.now() };
    user.activeBoosters.push(booster);
    await this.save();
    return booster;
  }

  async addXp(userId, guildId, options = {}) {
    if (this.isOnCooldown(userId, guildId)) return null;
    const user = this.getUser(userId, guildId);
    const key = this.getKey(userId, guildId);
    this.cooldowns.set(key, Date.now());
    
    let xpGain = LEVEL_CONFIG.xpPerMessage + Math.floor(Math.random() * LEVEL_CONFIG.xpRandomBonus);
    if (options.hasMedia) xpGain += LEVEL_CONFIG.bonusMediaUpload;
    if (options.isLongMessage) xpGain += LEVEL_CONFIG.bonusLongMessage;
    if (options.voiceMinutes) {
      xpGain += options.voiceMinutes * LEVEL_CONFIG.bonusVoicePerMinute;
      user.voiceMinutes += options.voiceMinutes;
    }
    
    const multiplier = this.getActiveMultiplier(userId, guildId);
    xpGain = Math.floor(xpGain * multiplier);
    
    const oldLevel = user.level;
    user.totalXp += xpGain;
    user.messages += 1;
    user.lastXpGain = Date.now();
    user.weeklyXp += xpGain;
    
    const { level, xp } = this.getLevelFromXp(user.totalXp);
    user.level = level;
    user.xp = xp;
    await this.save();
    
    if (level > oldLevel) {
      return { userId, guildId, oldLevel, newLevel: level, totalXp: user.totalXp,
               xpGained: xpGain, multiplier, canPrestige: level >= LEVEL_CONFIG.prestigeLevel };
    }
    return { xpGained: xpGain, multiplier };
  }

  async claimDailyBonus(userId, guildId) {
    const user = this.getUser(userId, guildId);
    const now = Date.now();
    if (now - user.lastDailyLogin < LEVEL_CONFIG.dailyLoginWindow) {
      return { claimed: false, timeLeft: LEVEL_CONFIG.dailyLoginWindow - (now - user.lastDailyLogin) };
    }
    user.lastDailyLogin = now;
    user.totalXp += LEVEL_CONFIG.dailyLoginBonus;
    user.weeklyXp += LEVEL_CONFIG.dailyLoginBonus;
    const { level, xp } = this.getLevelFromXp(user.totalXp);
    const oldLevel = user.level;
    user.level = level;
    user.xp = xp;
    await this.save();
    return { claimed: true, xpGained: LEVEL_CONFIG.dailyLoginBonus, leveledUp: level > oldLevel, newLevel: level };
  }

  async prestige(userId, guildId) {
    const user = this.getUser(userId, guildId);
    if (user.level < LEVEL_CONFIG.prestigeLevel) {
      return { success: false, reason: 'Level too low' };
    }
    const retainedXp = Math.floor(user.totalXp * LEVEL_CONFIG.prestigeXpRetention);
    const oldPrestige = user.prestige;
    user.prestige += 1;
    user.totalXp = retainedXp;
    user.weeklyXp = 0;
    const { level, xp } = this.getLevelFromXp(retainedXp);
    user.level = level;
    user.xp = xp;
    await this.save();
    return { success: true, newPrestige: user.prestige, oldPrestige, retainedXp, newLevel: level };
  }

  getUserTitle(userId, guildId) {
    const user = this.getUser(userId, guildId);
    if (user.prestige > 0) {
      const prestigeData = PRESTIGE_TITLES[user.prestige] || PRESTIGE_TITLES[5];
      const levelData = LEVEL_TITLES[user.level] || LEVEL_TITLES[50];
      return { title: `${prestigeData.emoji} ${prestigeData.title} - ${levelData.title}`,
               emoji: prestigeData.emoji, prestige: user.prestige };
    }
    const levelData = LEVEL_TITLES[user.level] || LEVEL_TITLES[1];
    return { title: `${levelData.emoji} ${levelData.title}`, emoji: levelData.emoji, prestige: 0 };
  }

  getLeaderboard(guildId, limit = 10, weekly = false) {
    const guildUsers = [];
    for (const [key, userData] of this.users.entries()) {
      if (userData.guildId === guildId) guildUsers.push(userData);
    }
    guildUsers.sort((a, b) => weekly ? b.weeklyXp - a.weeklyXp :
                    (b.prestige * 1000000 + b.totalXp) - (a.prestige * 1000000 + a.totalXp));
    return guildUsers.slice(0, limit);
  }

  resetWeeklyLeaderboardIfNeeded() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const lastReset = this.weeklyLeaderboard.get('lastReset') || 0;
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    if (dayOfWeek === 0 && Date.now() - lastReset > oneWeek) {
      for (const [key, user] of this.users.entries()) {
        user.weeklyXp = 0;
      }
      this.weeklyLeaderboard.set('lastReset', Date.now());
      this.save();
    }
  }

  getUserRank(userId, guildId, weekly = false) {
    const leaderboard = this.getLeaderboard(guildId, 999999, weekly);
    const rank = leaderboard.findIndex(u => u.userId === userId);
    return rank === -1 ? null : rank + 1;
  }

  getRoleMilestones() { return ROLE_MILESTONES; }
  getConfig() { return { ...LEVEL_CONFIG }; }
}

export default new LevelingSystem();
