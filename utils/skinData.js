/**
 * Skin and Accessory Data Manager
 * Fetches and caches Valorant content data from valorant-api.com
 */

const fs = require('fs');
const path = require('path');

const SKINS_FILE = path.join(__dirname, '..', 'data', 'skins.json');
const BUDDIES_FILE = path.join(__dirname, '..', 'data', 'buddies.json');
const CARDS_FILE = path.join(__dirname, '..', 'data', 'cards.json');
const SPRAYS_FILE = path.join(__dirname, '..', 'data', 'sprays.json');
const TITLES_FILE = path.join(__dirname, '..', 'data', 'titles.json');
const CONTENT_TIERS_FILE = path.join(__dirname, '..', 'data', 'contentTiers.json');

// In-memory cache
let skinsCache = {};
let buddiesCache = {};
let cardsCache = {};
let spraysCache = {};
let titlesCache = {};
let contentTiersCache = {};

/**
 * Fetch all weapon skins from valorant-api.com
 */
async function fetchSkins() {
    try {
        console.log('📦 Fetching weapon skins data...');
        const response = await fetch('https://valorant-api.com/v1/weapons/skins');
        
        if (!response.ok) {
            throw new Error(`Failed to fetch skins: ${response.status}`);
        }

        const data = await response.json();
        const skins = {};

        // Map skins by UUID for quick lookup
        for (const skin of data.data) {
            skins[skin.uuid] = {
                uuid: skin.uuid,
                displayName: skin.displayName,
                displayIcon: skin.displayIcon,
                wallpaper: skin.wallpaper,
                contentTierUuid: skin.contentTierUuid,
                levels: skin.levels?.map(level => ({
                    uuid: level.uuid,
                    displayName: level.displayName,
                    displayIcon: level.displayIcon
                })) || [],
                chromas: skin.chromas?.map(chroma => ({
                    uuid: chroma.uuid,
                    displayName: chroma.displayName,
                    displayIcon: chroma.displayIcon
                })) || []
            };

            // Also map by level UUIDs (shop uses level UUIDs)
            if (skin.levels) {
                for (const level of skin.levels) {
                    skins[level.uuid] = skins[skin.uuid];
                }
            }
        }

        fs.writeFileSync(SKINS_FILE, JSON.stringify(skins, null, 2));
        skinsCache = skins;
        console.log(`✅ Loaded ${Object.keys(data.data).length} weapon skins`);
        return skins;
    } catch (error) {
        console.error('❌ Error fetching skins:', error);
        return loadFromFile(SKINS_FILE);
    }
}

/**
 * Fetch all gun buddies
 */
async function fetchBuddies() {
    try {
        console.log('📦 Fetching buddies data...');
        const response = await fetch('https://valorant-api.com/v1/buddies');
        
        if (!response.ok) {
            throw new Error(`Failed to fetch buddies: ${response.status}`);
        }

        const data = await response.json();
        const buddies = {};

        for (const buddy of data.data) {
            buddies[buddy.uuid] = {
                uuid: buddy.uuid,
                displayName: buddy.displayName,
                displayIcon: buddy.displayIcon,
                levels: buddy.levels?.map(level => ({
                    uuid: level.uuid,
                    displayName: level.displayName,
                    displayIcon: level.displayIcon
                })) || []
            };

            // Map by level UUIDs too
            if (buddy.levels) {
                for (const level of buddy.levels) {
                    buddies[level.uuid] = buddies[buddy.uuid];
                }
            }
        }

        fs.writeFileSync(BUDDIES_FILE, JSON.stringify(buddies, null, 2));
        buddiesCache = buddies;
        console.log(`✅ Loaded ${Object.keys(data.data).length} buddies`);
        return buddies;
    } catch (error) {
        console.error('❌ Error fetching buddies:', error);
        return loadFromFile(BUDDIES_FILE);
    }
}

/**
 * Fetch all player cards
 */
async function fetchCards() {
    try {
        console.log('📦 Fetching player cards data...');
        const response = await fetch('https://valorant-api.com/v1/playercards');
        
        if (!response.ok) {
            throw new Error(`Failed to fetch cards: ${response.status}`);
        }

        const data = await response.json();
        const cards = {};

        for (const card of data.data) {
            cards[card.uuid] = {
                uuid: card.uuid,
                displayName: card.displayName,
                displayIcon: card.displayIcon,
                smallArt: card.smallArt,
                wideArt: card.wideArt,
                largeArt: card.largeArt
            };
        }

        fs.writeFileSync(CARDS_FILE, JSON.stringify(cards, null, 2));
        cardsCache = cards;
        console.log(`✅ Loaded ${Object.keys(cards).length} player cards`);
        return cards;
    } catch (error) {
        console.error('❌ Error fetching cards:', error);
        return loadFromFile(CARDS_FILE);
    }
}

/**
 * Fetch all sprays
 */
async function fetchSprays() {
    try {
        console.log('📦 Fetching sprays data...');
        const response = await fetch('https://valorant-api.com/v1/sprays');
        
        if (!response.ok) {
            throw new Error(`Failed to fetch sprays: ${response.status}`);
        }

        const data = await response.json();
        const sprays = {};

        for (const spray of data.data) {
            sprays[spray.uuid] = {
                uuid: spray.uuid,
                displayName: spray.displayName,
                displayIcon: spray.displayIcon,
                fullIcon: spray.fullIcon,
                fullTransparentIcon: spray.fullTransparentIcon
            };
        }

        fs.writeFileSync(SPRAYS_FILE, JSON.stringify(sprays, null, 2));
        spraysCache = sprays;
        console.log(`✅ Loaded ${Object.keys(sprays).length} sprays`);
        return sprays;
    } catch (error) {
        console.error('❌ Error fetching sprays:', error);
        return loadFromFile(SPRAYS_FILE);
    }
}

/**
 * Fetch all titles
 */
async function fetchTitles() {
    try {
        console.log('📦 Fetching titles data...');
        const response = await fetch('https://valorant-api.com/v1/playertitles');
        
        if (!response.ok) {
            throw new Error(`Failed to fetch titles: ${response.status}`);
        }

        const data = await response.json();
        const titles = {};

        for (const title of data.data) {
            titles[title.uuid] = {
                uuid: title.uuid,
                displayName: title.displayName,
                titleText: title.titleText
            };
        }

        fs.writeFileSync(TITLES_FILE, JSON.stringify(titles, null, 2));
        titlesCache = titles;
        console.log(`✅ Loaded ${Object.keys(titles).length} titles`);
        return titles;
    } catch (error) {
        console.error('❌ Error fetching titles:', error);
        return loadFromFile(TITLES_FILE);
    }
}

/**
 * Fetch content tiers (skin rarity)
 */
async function fetchContentTiers() {
    try {
        console.log('📦 Fetching content tiers data...');
        const response = await fetch('https://valorant-api.com/v1/contenttiers');
        
        if (!response.ok) {
            throw new Error(`Failed to fetch content tiers: ${response.status}`);
        }

        const data = await response.json();
        const tiers = {};

        for (const tier of data.data) {
            tiers[tier.uuid] = {
                uuid: tier.uuid,
                devName: tier.devName,
                displayName: tier.displayName,
                displayIcon: tier.displayIcon,
                highlightColor: tier.highlightColor
            };
        }

        fs.writeFileSync(CONTENT_TIERS_FILE, JSON.stringify(tiers, null, 2));
        contentTiersCache = tiers;
        console.log(`✅ Loaded ${Object.keys(tiers).length} content tiers`);
        return tiers;
    } catch (error) {
        console.error('❌ Error fetching content tiers:', error);
        return loadFromFile(CONTENT_TIERS_FILE);
    }
}

/**
 * Load data from file if API fails
 */
function loadFromFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            console.log(`📂 Loaded cached data from ${path.basename(filePath)}`);
            return data;
        }
    } catch (error) {
        console.error(`Error loading ${filePath}:`, error);
    }
    return {};
}

/**
 * Initialize all data on bot startup
 */
async function initializeAllData() {
    console.log('🚀 Initializing Valorant content data...');
    
    await Promise.all([
        fetchSkins(),
        fetchBuddies(),
        fetchCards(),
        fetchSprays(),
        fetchTitles(),
        fetchContentTiers()
    ]);
    
    console.log('✅ All Valorant content data initialized!');
}

/**
 * Load cached data from files (sync, for when API already fetched)
 */
function loadCachedData() {
    skinsCache = loadFromFile(SKINS_FILE);
    buddiesCache = loadFromFile(BUDDIES_FILE);
    cardsCache = loadFromFile(CARDS_FILE);
    spraysCache = loadFromFile(SPRAYS_FILE);
    titlesCache = loadFromFile(TITLES_FILE);
    contentTiersCache = loadFromFile(CONTENT_TIERS_FILE);
}

/**
 * Get skin info by UUID
 */
function getSkinByUUID(uuid) {
    return skinsCache[uuid] || null;
}

/**
 * Get buddy info by UUID
 */
function getBuddyByUUID(uuid) {
    return buddiesCache[uuid] || null;
}

/**
 * Get card info by UUID
 */
function getCardByUUID(uuid) {
    return cardsCache[uuid] || null;
}

/**
 * Get spray info by UUID
 */
function getSprayByUUID(uuid) {
    return spraysCache[uuid] || null;
}

/**
 * Get title info by UUID
 */
function getTitleByUUID(uuid) {
    return titlesCache[uuid] || null;
}

/**
 * Get content tier info by UUID
 */
function getContentTierByUUID(uuid) {
    return contentTiersCache[uuid] || null;
}

/**
 * Get tier emoji based on tier name
 */
function getTierEmoji(tierUuid) {
    const tier = getContentTierByUUID(tierUuid);
    if (!tier) return '◇';
    
    const tierEmojis = {
        'Select': '◇',
        'Deluxe': '◈',
        'Premium': '◆',
        'Exclusive': '★',
        'Ultra': '✦'
    };
    
    return tierEmojis[tier.devName] || '◇';
}

module.exports = {
    initializeAllData,
    loadCachedData,
    getSkinByUUID,
    getBuddyByUUID,
    getCardByUUID,
    getSprayByUUID,
    getTitleByUUID,
    getContentTierByUUID,
    getTierEmoji
};
