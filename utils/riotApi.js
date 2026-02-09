/**
 * Riot API utilities for authentication and store
 */

const CLIENT_PLATFORM = 'ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9';
const CLIENT_VERSION = 'release-12.01-15-4211771';

// Region to shard mapping
const REGION_TO_SHARD = {
    'NA': 'na',
    'LATAM': 'na',
    'BR': 'na',
    'EU': 'eu',
    'AP': 'ap',
    'KR': 'kr',
    'VN2': 'ap',
    'TW': 'ap',
    'TH': 'ap',
    'PH': 'ap',
    'SG': 'ap',
    'ID': 'ap',
    'JP': 'ap'
};

/**
 * Get entitlement token from access token
 * @param {string} accessToken - The access token from login
 * @returns {Promise<string|null>} - The entitlement token
 */
async function getEntitlementToken(accessToken) {
    try {
        const response = await fetch('https://entitlements.auth.riotgames.com/api/token/v1', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            console.error('Failed to get entitlement token:', response.status);
            return null;
        }

        const data = await response.json();
        return data.entitlements_token;
    } catch (error) {
        console.error('Error getting entitlement token:', error);
        return null;
    }
}

/**
 * Get shard from region
 * @param {string} region - The region code (e.g., VN2, NA, EU)
 * @returns {string} - The shard
 */
function getShardFromRegion(region) {
    return REGION_TO_SHARD[region?.toUpperCase()] || 'ap';
}

/**
 * Get storefront data (daily shop)
 * @param {string} accessToken - The access token
 * @param {string} entitlementToken - The entitlement token
 * @param {string} puuid - Player UUID
 * @param {string} region - Player region
 * @returns {Promise<object|null>} - Storefront data
 */
async function getStorefront(accessToken, entitlementToken, puuid, region) {
    try {
        const shard = getShardFromRegion(region);
        const url = `https://pd.${shard}.a.pvp.net/store/v3/storefront/${puuid}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Riot-ClientPlatform': CLIENT_PLATFORM,
                'X-Riot-ClientVersion': CLIENT_VERSION,
                'X-Riot-Entitlements-JWT': entitlementToken,
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            console.error('Failed to get storefront:', response.status, await response.text());
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting storefront:', error);
        return null;
    }
}

/**
 * Get accessory store data
 * @param {string} accessToken - The access token
 * @param {string} entitlementToken - The entitlement token
 * @param {string} puuid - Player UUID
 * @param {string} region - Player region
 * @returns {Promise<object|null>} - Accessory store data
 */
async function getAccessoryStore(accessToken, entitlementToken, puuid, region) {
    try {
        const shard = getShardFromRegion(region);
        const url = `https://pd.${shard}.a.pvp.net/store/v3/storefront/${puuid}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Riot-ClientPlatform': CLIENT_PLATFORM,
                'X-Riot-ClientVersion': CLIENT_VERSION,
                'X-Riot-Entitlements-JWT': entitlementToken,
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            console.error('Failed to get accessory store:', response.status);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting accessory store:', error);
        return null;
    }
}

module.exports = {
    getEntitlementToken,
    getStorefront,
    getAccessoryStore,
    getShardFromRegion,
    CLIENT_PLATFORM,
    CLIENT_VERSION
};
