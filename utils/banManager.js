const fs = require('fs');
const path = require('path');
const { MessageFlags } = require('discord.js');

const banListPath = path.join(__dirname, '..', 'data', 'banList.json');

/**
 * Load ban list from file
 * @returns {Object} - Ban list object { odUserId: { reason, bannedAt, bannedBy } }
 */
function loadBanList() {
    try {
        if (fs.existsSync(banListPath)) {
            const content = fs.readFileSync(banListPath, 'utf-8');
            if (content.trim()) {
                return JSON.parse(content);
            }
        }
        return {};
    } catch (error) {
        console.error('Error loading ban list:', error);
        return {};
    }
}

/**
 * Save ban list to file
 * @param {Object} banList - Ban list object
 */
function saveBanList(banList) {
    try {
        fs.writeFileSync(banListPath, JSON.stringify(banList, null, 4), 'utf-8');
    } catch (error) {
        console.error('Error saving ban list:', error);
    }
}

/**
 * Check if a user is banned
 * @param {string} userId - Discord user ID
 * @returns {Object|null} - Ban info if banned, null if not banned
 */
function isUserBanned(userId) {
    const banList = loadBanList();
    return banList[userId] || null;
}

/**
 * Ban a user from using the bot
 * @param {string} userId - Discord user ID to ban
 * @param {string} reason - Reason for ban
 * @param {string} bannedBy - Admin user ID who banned
 * @returns {boolean} - True if successful
 */
function banUser(userId, reason = 'No reason provided', bannedBy = 'System') {
    try {
        const banList = loadBanList();
        banList[userId] = {
            reason,
            bannedAt: new Date().toISOString(),
            bannedBy
        };
        saveBanList(banList);
        return true;
    } catch (error) {
        console.error('Error banning user:', error);
        return false;
    }
}

/**
 * Unban a user
 * @param {string} userId - Discord user ID to unban
 * @returns {boolean} - True if user was banned and is now unbanned
 */
function unbanUser(userId) {
    try {
        const banList = loadBanList();
        if (banList[userId]) {
            delete banList[userId];
            saveBanList(banList);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error unbanning user:', error);
        return false;
    }
}

/**
 * Get all banned users
 * @returns {Object} - Ban list object
 */
function getBanList() {
    return loadBanList();
}

/**
 * Middleware to check if user is banned before executing command
 * @param {Interaction} interaction - Discord interaction
 * @returns {boolean} - True if user can proceed, false if banned
 */
async function checkBanMiddleware(interaction) {
    const banInfo = isUserBanned(interaction.user.id);
    
    if (banInfo) {
        await interaction.reply({
            content: `🚫 **You are banned from using this bot.**\n\n**Reason:** ${banInfo.reason}\n**Banned at:** ${new Date(banInfo.bannedAt).toLocaleString()}`,
            flags: MessageFlags.Ephemeral
        });
        return false;
    }
    
    return true;
}

module.exports = {
    isUserBanned,
    banUser,
    unbanUser,
    getBanList,
    checkBanMiddleware
};

