/**
 * Centralized emote configuration file
 * Add all custom Discord emotes here for easy management
 */

// Valorant Rank Emotes
const rankEmoteIds = {
    'iron1': '1464261288510226462',
    'iron2': '1464261232721657981',
    'iron3': '1464261235385172072',
    'brz1': '1464261246647013648',
    'brz2': '1464261249469644820',
    'brz3': '1464261251466137785',
    'sil1': '1464261253416620147',
    'sil2': '1464261255911968789',
    'sil3': '1464261257573175399',
    'gold1': '1464261259317739632',
    'gold2': '1464261260961906790',
    'gold3': '1464261262950269130',
    'plat1': '1464261264673869918',
    'plat2': '1464261266548985980',
    'plat3': '1464261268146880587',
    'dia1': '1464261269853966337',
    'dia2': '1464261272047456450',
    'dia3': '1464261274492997747',
    'asc1': '1464261276065726547',
    'asc2': '1464261278422925484',
    'asc3': '1464261280083869820',
    'imt1': '1464261281698676777',
    'imt2': '1464261283514941736',
    'imt3': '1464261285284810986',
    'radiant': '1464261286941691944',
    'unranked': '1464312159872749733'
};

// Valorant Logo Emote
const valorantLogo = {
    id: '1464555774981312563',
    name: 'valorantlogo',
    toString: function() {
        return `<:${this.name}:${this.id}>`;
    }
};

// Agent Emotes
const agentEmoteIds = {
    'astra': '1464653752609800353',
    'breach': '1464653754866602177',
    'brimstone': '1464653757043445862',
    'chamber': '1464653758741872782',
    'clove': '1464653761200001094',
    'cypher': '1464653763036975361',
    'deadlock': '1464653765343842335',
    'fade': '1464653767202046032',
    'gekko': '1464653768996946050',
    'harbor': '1464653770838380605',
    'iso': '1464653772897915000',
    'jett': '1464653774902530261',
    'kayo': '1464653776618127472',
    'killjoy': '1464653778484592864',
    'neon': '1464653780745322598',
    'omen': '1464653782808793333',
    'phoenix': '1464653784952209408',
    'raze': '1464653787057750220',
    'reyna': '1464653788647264524',
    'sage': '1464653790811787383',
    'skye': '1464653793198215270',
    'sova': '1464653794808959101',
    'tejo': '1464653797732385102',
    'veto': '1464653799976337644',
    'viper': '1464653802144661738',
    'vyse': '1464653804200001682',
    'waylay': '1464653806087307305',
    'yoru': '1464653807974617199'
};

// Map Emotes (add map emotes here)
const mapEmoteIds = {
    // Example: 'ascent': '123456789',
    // Add map emotes as needed
};

// Tracker.gg Emote (add when available)
const trackerEmote = {
    id: null,
    name: 'tracker',
    toString: function() {
        if (!this.id) return '';
        return `<:${this.name}:${this.id}>`;
    }
};

// Utility Emotes
const utilityEmotes = {
    // Example: 'win': '123456789',
    // 'loss': '123456789',
    // Add utility emotes as needed
};

/**
 * Map rank tier name from API to emote name
 * @param {string} tierName - Rank name from API (e.g: "Iron 1", "Diamond 3", "Radiant")
 * @returns {string} - Emote name (e.g: "iron1", "dia3", "radiant")
 */
function getRankEmoteName(tierName) {
    if (!tierName) return null;
    
    const tierLower = tierName.toLowerCase();
    
    const rankMap = {
        'iron': 'iron',
        'bronze': 'brz',
        'silver': 'sil',
        'gold': 'gold',
        'platinum': 'plat',
        'diamond': 'dia',
        'ascendant': 'asc',
        'immortal': 'imt',
        'radiant': 'radiant'
    };
    
    // Handle Radiant (no number)
    if (tierLower === 'radiant') {
        return 'radiant';
    }
    
    // Handle Unranked
    if (tierLower === 'unranked' || tierLower === 'unrated') {
        return 'unranked';
    }
    
    // Split rank name and number (e.g: "Iron 1" -> ["iron", "1"])
    const parts = tierLower.split(' ');
    if (parts.length < 2) return null;
    
    const rankName = parts[0];
    const rankNumber = parts[1];
    
    const prefix = rankMap[rankName];
    if (!prefix) return null;
    
    return `${prefix}${rankNumber}`;
}

/**
 * Get emote string to display in embed (custom emote format)
 * @param {string} tierName - Rank name from API
 * @returns {string} - Emote string or empty string
 */
function getRankEmote(tierName) {
    const emoteName = getRankEmoteName(tierName);
    if (!emoteName) return '';
    
    const emoteId = rankEmoteIds[emoteName];
    if (!emoteId) return '';
    
    return `<:${emoteName}:${emoteId}>`;
}

/**
 * Get agent emote string
 * @param {string} agentName - Agent name
 * @returns {string} - Emote string or empty string
 */
function getAgentEmote(agentName) {
    if (!agentName) return '';
    
    // Handle special case: kay/o -> kayo
    let emoteName = agentName.toLowerCase().replace(/\s+/g, '').replace(/\//g, '');
    const emoteId = agentEmoteIds[emoteName];
    if (!emoteId) return '';
    
    return `<:${emoteName}:${emoteId}>`;
}

/**
 * Get map emote string
 * @param {string} mapName - Map name
 * @returns {string} - Emote string or empty string
 */
function getMapEmote(mapName) {
    if (!mapName) return '';
    
    const emoteName = mapName.toLowerCase().replace(/\s+/g, '');
    const emoteId = mapEmoteIds[emoteName];
    if (!emoteId) return '';
    
    return `<:${emoteName}:${emoteId}>`;
}

module.exports = {
    // Emote IDs
    rankEmoteIds,
    agentEmoteIds,
    mapEmoteIds,
    utilityEmotes,
    
    // Special Emotes
    valorantLogo,
    trackerEmote,
    
    // Helper Functions
    getRankEmoteName,
    getRankEmote,
    getAgentEmote,
    getMapEmote
};
