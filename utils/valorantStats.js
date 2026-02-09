const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getRankEmote, valorantLogo } = require('./emotes');

// Browser headers to avoid 403 blocking
const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36 Edg/144.0.0.0',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Origin': 'https://tracker.gg',
    'Referer': 'https://tracker.gg/',
    'Sec-Ch-Ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Microsoft Edge";v="144"',
    'Sec-Ch-Ua-Mobile': '?1',
    'Sec-Ch-Ua-Platform': '"Android"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'Priority': 'u=1, i'
};

/**
 * Fetch and display Valorant stats for a player
 * @param {Interaction} interaction - Discord interaction object
 * @param {string} playerIdentifier - Valorant ID (e.g: Naftifine#meow)
 */
async function fetchAndDisplayStats(interaction, playerIdentifier) {
    try {
        // Fetch profile data
        const profileUrl = `https://api.tracker.gg/api/v2/valorant/standard/profile/riot/${encodeURIComponent(playerIdentifier)}`;
        
        const profileResponse = await fetch(profileUrl, { headers: browserHeaders });

        if (!profileResponse.ok) {
            return interaction.editReply({ 
                content: 'Unable to fetch player data. Profile may be set to private!',
                components: []
            });
        }

        const jsonData = await profileResponse.json();
        const data = jsonData.data;
        const platformInfo = data.platformInfo;
        const metadata = data.metadata;

        // Find competitive season segment
        const seasonSegment = data.segments?.find(
            seg => seg.type === 'season' && seg.attributes?.playlist === 'competitive'
        );

        if (!seasonSegment) {
            return interaction.editReply({ 
                content: 'No Competitive data found for this player!',
                components: []
            });
        }

        const stats = seasonSegment.stats;

        // Get emote for rank
        const rankTierName = stats.rank?.metadata?.tierName;
        const peakRankTierName = stats.peakRank?.metadata?.tierName;
        const rankEmote = getRankEmote(rankTierName);
        const peakRankEmote = getRankEmote(peakRankTierName);

        // Check if current rank is Immortal+ to display RR
        const rankValue = stats.rank?.value; // Current RR value
        const isCurrentImmortalPlus = rankTierName && 
            (rankTierName.toLowerCase().startsWith('immortal') || 
             rankTierName.toLowerCase() === 'radiant');
        
        // Format Rank with RR if Immortal+
        let rankDisplay = `${rankEmote}${rankTierName || 'Unranked'}`;
        if (isCurrentImmortalPlus && rankValue !== undefined) {
            rankDisplay = `${rankEmote}${rankTierName} (${rankValue} RR)`;
        }

        // Check if peak rank is Immortal+ to display Peak RR
        const peakRankValue = stats.peakRank?.value; // Peak RR value
        const isPeakImmortalPlus = peakRankTierName && 
            (peakRankTierName.toLowerCase().startsWith('immortal') || 
             peakRankTierName.toLowerCase() === 'radiant');
        
        // Format Peak Rank with RR if Immortal+
        let peakRankDisplay = `${peakRankEmote}${peakRankTierName || 'N/A'}`;
        if (isPeakImmortalPlus && peakRankValue !== undefined) {
            peakRankDisplay = `${peakRankEmote}${peakRankTierName} (${peakRankValue} RR)`;
        }

        // Create embed
        const embed = new EmbedBuilder()
            .setColor('#FF4654') // Valorant red color
            .setTitle(`<:valorantlogo:1464555774981312563> Valorant Stats - ${platformInfo.platformUserHandle}`)
            .setThumbnail(platformInfo.avatarUrl)
            // .setDescription(`**${seasonSegment.metadata?.name || 'Competitive'}**`)
            .addFields(
                // Basic info
                { 
                    name: 'Current Rank', 
                    value: rankDisplay, 
                    inline: true 
                },
                { 
                    name: 'Peak Rank', 
                    value: peakRankDisplay, 
                    inline: true 
                },
                { 
                    name: 'Account Level', 
                    value: `${metadata.accountLevel || 'N/A'}`, 
                    inline: true 
                },
                
                // Combat Stats
                {name: '\u200B', value: `**${seasonSegment.metadata?.name || 'Competitive'}**`, inline: false },
                // { name: '\u200B', value: '**Combat Stats**', inline: false },
                { 
                    name: 'K/D/A', 
                    value: `${stats.kills?.value || 0} / ${stats.deaths?.value || 0} / ${stats.assists?.value || 0}`, 
                    inline: true 
                },
                { 
                    name: 'K/D Ratio', 
                    value: `${stats.kDRatio?.displayValue || '0'}`, 
                    inline: true 
                },
                { 
                    name: 'Headshot %', 
                    value: `${stats.headshotsPercentage?.displayValue || '0%'}`, 
                    inline: true 
                },
                
                // Performance
                // { name: '\u200B', value: '**Performance**', inline: false },
                { 
                    name: 'Damage/Round', 
                    value: `${stats.damagePerRound?.displayValue || '0'}`, 
                    inline: true 
                },
                { 
                    name: 'ACS', 
                    value: `${stats.scorePerRound?.displayValue || '0'}`, 
                    inline: true 
                },
                { 
                    name: 'KAST', 
                    value: `${stats.kAST?.displayValue || '0%'}`, 
                    inline: true 
                },
                
                // Match Stats
                // { name: '\u200B', value: '**Match Stats**', inline: false },
                { 
                    name: 'Matches', 
                    value: `${stats.matchesPlayed?.value || 0}`, 
                    inline: true 
                },
                { 
                    name: 'Wins', 
                    value: `${stats.matchesWon?.value || 0}`, 
                    inline: true 
                },
                { 
                    name: 'Win Rate', 
                    value: `${stats.matchesWinPct?.displayValue || '0%'}`, 
                    inline: true 
                },
                
                // Extra Stats
                { name: '\u200B', value: '**Highlights**', inline: false },
                { 
                    name: 'MVPs', 
                    value: `${stats.mVPs?.value || 0}`, 
                    inline: true 
                },
                { 
                    name: 'First Bloods', 
                    value: `${stats.firstBloods?.value || 0}`, 
                    inline: true 
                },
                { 
                    name: 'Aces', 
                    value: `${stats.aces?.value || 0}`, 
                    inline: true 
                },
                { 
                    name: 'Time Played', 
                    value: `${stats.timePlayed?.displayValue || '0h'}`, 
                    inline: true 
                },
                { 
                    name: 'Clutches', 
                    value: `${stats.clutches?.value || 0}`, 
                    inline: true 
                },
                { 
                    name: 'Performance Score', 
                    value: `${stats.trnPerformanceScore?.value || 0}`, 
                    inline: true 
                }
            )
            .setFooter({ 
                text: `Region: ${metadata.activeShard?.toUpperCase() || 'N/A'} | Platform: ${metadata.defaultPlatform?.toUpperCase() || 'PC'}` 
            })
            .setTimestamp();

        // Create Performance button
        const performanceButton = new ButtonBuilder()
            .setCustomId(`valorant_performance_${Buffer.from(playerIdentifier).toString('base64')}`)
            .setLabel('Performance')
            .setStyle(ButtonStyle.Primary);

        // Create Match History button
        const matchHistoryButton = new ButtonBuilder()
            .setCustomId(`valorant_matches_${Buffer.from(playerIdentifier).toString('base64')}`)
            .setLabel('Match History')
            .setStyle(ButtonStyle.Secondary);

        const buttonRow = new ActionRowBuilder().addComponents(performanceButton, matchHistoryButton);

        await interaction.editReply({ embeds: [embed], components: [buttonRow], content: null });

    } catch (error) {
        console.error('Error fetching valorant stats:', error);
        await interaction.editReply({ 
            content: 'An error occurred while fetching data. Please try again later!',
            components: []
        });
    }
}

module.exports = {
    fetchAndDisplayStats,
    browserHeaders
};
