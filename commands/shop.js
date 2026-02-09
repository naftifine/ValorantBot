const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getEntitlementToken, getStorefront, getAccessoryStore } = require('../utils/riotApi');
const { getSkinByUUID, getBuddyByUUID, getCardByUUID, getSprayByUUID, getTitleByUUID, getContentTierByUUID, getTierEmoji } = require('../utils/skinData');

module.exports = {
    data: {
        name: 'shop',
        description: 'View your daily Valorant shop'
    },
    async execute(interaction) {
        await interaction.deferReply();

        try {
            // Load user data
            const dataPath = path.join(__dirname, '..', 'data', 'data.json');
            
            if (!fs.existsSync(dataPath)) {
                return await interaction.editReply({
                    content: '❌ You need to login first! Use `/login` to link your Riot account.'
                });
            }

            const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            const userData = data[interaction.user.id];

            if (!userData || !userData.access_token) {
                return await interaction.editReply({
                    content: '❌ You need to login first! Use `/login` to link your Riot account.'
                });
            }

            // Get entitlement token
            const entitlementToken = await getEntitlementToken(userData.access_token);
            
            if (!entitlementToken) {
                return await interaction.editReply({
                    content: '❌ Your session has expired. Please use `/login` to re-authenticate.'
                });
            }

            // Get storefront
            const storefront = await getStorefront(
                userData.access_token,
                entitlementToken,
                userData.puuid,
                userData.region
            );

            if (!storefront) {
                return await interaction.editReply({
                    content: '❌ Failed to fetch your shop. Please try again later.'
                });
            }

            // Get accessory store
            const accessoryStore = await getAccessoryStore(
                userData.access_token,
                entitlementToken,
                userData.puuid,
                userData.region
            );

            // Parse daily offers (skin shop)
            const skinOffers = parseSkinOffers(storefront);
            const accessoryOffers = parseAccessoryOffers(accessoryStore);

            // Calculate time remaining
            const timeRemaining = formatTimeRemaining(storefront.SkinsPanelLayout?.SingleItemOffersRemainingDurationInSeconds);

            // Build the embeds for skin shop (4 separate embeds)
            const skinEmbeds = buildSkinShopEmbeds(userData, skinOffers, timeRemaining);
            
            // Build action row with buttons
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('shop_skins')
                        .setLabel('🔫 Skin shop')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('shop_accessories')
                        .setLabel('🎒 Accessory shop')
                        .setStyle(ButtonStyle.Primary)
                );

            await interaction.editReply({
                embeds: skinEmbeds,
                components: [row]
            });

        } catch (error) {
            console.error('Shop command error:', error);
            await interaction.editReply({
                content: '❌ An error occurred while fetching your shop. Please try again later.'
            });
        }
    },

    // Handle shop button interactions
    async handleButton(interaction, type) {
        try {
            // Load user data
            const dataPath = path.join(__dirname, '..', 'data', 'data.json');
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            const userData = data[interaction.user.id];

            if (!userData) {
                return await interaction.reply({
                    content: '❌ You need to login first!',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Get entitlement token
            const entitlementToken = await getEntitlementToken(userData.access_token);
            
            if (!entitlementToken) {
                return await interaction.reply({
                    content: '❌ Your session has expired. Please use `/login` to re-authenticate.',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Get stores
            const storefront = await getStorefront(
                userData.access_token,
                entitlementToken,
                userData.puuid,
                userData.region
            );

            const accessoryStore = await getAccessoryStore(
                userData.access_token,
                entitlementToken,
                userData.puuid,
                userData.region
            );

            let row;

            if (type === 'skins') {
                const skinOffers = parseSkinOffers(storefront);
                const timeRemaining = formatTimeRemaining(storefront?.SkinsPanelLayout?.SingleItemOffersRemainingDurationInSeconds);
                const embeds = buildSkinShopEmbeds(userData, skinOffers, timeRemaining);
                
                row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('shop_skins')
                            .setLabel('🔫 Skin shop')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('shop_accessories')
                            .setLabel('🎒 Accessory shop')
                            .setStyle(ButtonStyle.Primary)
                    );

                await interaction.update({
                    embeds: embeds,
                    components: [row]
                });
            } else {
                const accessoryOffers = parseAccessoryOffers(accessoryStore);
                const timeRemaining = formatTimeRemaining(accessoryStore?.AccessoryStore?.AccessoryStoreRemainingDurationInSeconds);
                const embed = buildAccessoryShopEmbed(userData, accessoryOffers, timeRemaining);
                
                row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('shop_skins')
                            .setLabel('🔫 Skin shop')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('shop_accessories')
                            .setLabel('🎒 Accessory shop')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );

                await interaction.update({
                    embeds: [embed],
                    components: [row]
                });
            }

        } catch (error) {
            console.error('Shop button error:', error);
            await interaction.reply({
                content: '❌ An error occurred. Please try again.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};

/**
 * Parse skin offers from storefront
 */
function parseSkinOffers(storefront) {
    const offers = [];
    
    if (!storefront?.SkinsPanelLayout?.SingleItemOffers) {
        return offers;
    }

    for (const offerUuid of storefront.SkinsPanelLayout.SingleItemOffers) {
        const skin = getSkinByUUID(offerUuid);
        
        // Find price from SingleItemStoreOffers
        let price = 0;
        const storeOffer = storefront.SkinsPanelLayout.SingleItemStoreOffers?.find(
            offer => offer.OfferID === offerUuid
        );
        
        if (storeOffer?.Cost) {
            // VP currency UUID
            price = storeOffer.Cost['85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741'] || 0;
        }

        offers.push({
            uuid: offerUuid,
            name: skin?.displayName || 'Unknown Skin',
            icon: skin?.displayIcon || skin?.levels?.[0]?.displayIcon,
            tierUuid: skin?.contentTierUuid,
            price: price
        });
    }

    return offers;
}

/**
 * Parse accessory offers from store
 */
function parseAccessoryOffers(accessoryStore) {
    const offers = [];
    
    if (!accessoryStore?.AccessoryStore?.AccessoryStoreOffers) {
        return offers;
    }

    for (const offer of accessoryStore.AccessoryStore.AccessoryStoreOffers) {
        const itemUuid = offer.Offer?.Rewards?.[0]?.ItemID;
        const itemType = offer.Offer?.Rewards?.[0]?.ItemTypeID;
        
        let item = null;
        let type = 'unknown';

        // Determine item type and get info
        // Buddy: dd3bf334-87f3-40bd-b043-682a57a8dc3a
        // Card: 3f296c07-64c3-494c-923b-fe692a4fa1bd
        // Spray: d5f120f8-ff8c-4571-a619-6040a92ab800
        // Title: de7caa6b-adf7-4588-bbd1-143831e786c6
        
        if (itemType === 'dd3bf334-87f3-40bd-b043-682a57a8dc3a') {
            item = getBuddyByUUID(itemUuid);
            type = 'buddy';
        } else if (itemType === '3f296c07-64c3-494c-923b-fe692a4fa1bd') {
            item = getCardByUUID(itemUuid);
            type = 'card';
        } else if (itemType === 'd5f120f8-ff8c-4571-a619-6040a92ab800') {
            item = getSprayByUUID(itemUuid);
            type = 'spray';
        } else if (itemType === 'de7caa6b-adf7-4588-bbd1-143831e786c6') {
            item = getTitleByUUID(itemUuid);
            type = 'title';
        }

        // Get price (Kingdom Credits)
        let price = 0;
        if (offer.Offer?.Cost) {
            price = offer.Offer.Cost['85ca954a-41f2-ce94-9b45-8ca3dd39a00d'] || 0;
        }

        offers.push({
            uuid: itemUuid,
            name: item?.displayName || item?.titleText || 'Unknown Item',
            icon: item?.displayIcon || item?.smallArt,
            type: type,
            price: price
        });
    }

    return offers;
}

/**
 * Format time remaining in hours
 */
function formatTimeRemaining(seconds) {
    if (!seconds) return 'Unknown';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}

/**
 * Build skin shop embeds (4 separate embeds for each skin)
 */
function buildSkinShopEmbeds(userData, offers, timeRemaining) {
    const riotId = `${userData.game_name}#${userData.tag_line}`;
    const embeds = [];

    // Rarity emote IDs
    const tierEmotes = {
        'Select': '<:select:1468791764235194454>',
        'Deluxe': '<:deluxe:1468791756362616957>',
        'Premium': '<:premium:1468791762385371369>',
        'Exclusive': '<:exclusive:1468791759877439621>',
        'Ultra': '<:ultra:1468791765929693314>'
    };

    // Header embed
    const headerEmbed = new EmbedBuilder()
        .setColor('#FF4654')
        .setAuthor({ name: `Daily shop for ${riotId} (new shop in ${timeRemaining})` })
    embeds.push(headerEmbed);

    // Create an embed for each skin (max 4)
    for (let i = 0; i < Math.min(offers.length, 4); i++) {
        const offer = offers[i];
        const tier = getContentTierByUUID(offer.tierUuid);
        const tierName = tier?.devName || 'Standard';
        const tierEmote = tierEmotes[tierName] || '◇';
        
        // Get tier color
        const tierColors = {
            'Select': '#5A9C47',
            'Deluxe': '#009587',
            'Premium': '#D1548D',
            'Exclusive': '#F5955B',
            'Ultra': '#FAD663'
        };
        const color = tierColors[tierName] || '#FF4654';

        const skinEmbed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`${tierEmote} ${offer.name}`);

        // Add skin image as thumbnail (small, on the right)
        if (offer.icon) {
            skinEmbed.setThumbnail(offer.icon);
        }

        embeds.push(skinEmbed);
    }

    if (offers.length === 0) {
        headerEmbed.setDescription('No items available');
    }

    return embeds;
}

/**
 * Build accessory shop embed
 */
function buildAccessoryShopEmbed(userData, offers, timeRemaining) {
    const riotId = `${userData.game_name}#${userData.tag_line}`;
    
    let description = '';
    
    const typeEmojis = {
        'buddy': '🔗',
        'card': '🃏',
        'spray': '🎨',
        'title': '📛',
        'unknown': '❓'
    };

    for (const offer of offers) {
        const emoji = typeEmojis[offer.type] || '❓';
        description += `${emoji} **${offer.name}** - ${offer.price} KC\n`;
    }

    if (!description) {
        description = 'No accessories available';
    }

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ name: `Accessory shop for ${riotId} (new shop in ${timeRemaining})` })
        .setDescription(description);

    return embed;
}
