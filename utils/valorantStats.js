const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
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

        // Create dropdown menu for navigation
        const encodedPlayer = Buffer.from(playerIdentifier).toString('base64');
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('valorant_profile_menu')
            .setPlaceholder('📊 View more stats...')
            .addOptions([
                {
                    label: 'Season Performance',
                    description: 'View all seasons rank history',
                    value: `performance_${encodedPlayer}`,
                    emoji: '📈'
                },
                {
                    label: 'Match History',
                    description: 'View recent competitive matches',
                    value: `matches_${encodedPlayer}`,
                    emoji: '🎮'
                },
                {
                    label: 'Weapon Stats',
                    description: 'View loadout & weapon statistics',
                    value: `weapons_${encodedPlayer}`,
                    emoji: '🔫'
                }
            ]);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.editReply({ embeds: [embed], components: [selectRow], content: null });

    } catch (error) {
        console.error('Error fetching valorant stats:', error);
        await interaction.editReply({ 
            content: 'An error occurred while fetching data. Please try again later!',
            components: []
        });
    }
}

/**
 * Fetch and display weapon loadout stats for a player
 * @param {Interaction} interaction - Discord interaction object
 * @param {string} playerIdentifier - Valorant ID (e.g: Naftifine#meow)
 */
async function fetchAndDisplayWeaponStats(interaction, playerIdentifier) {
    try {
        // Fetch profile first to get current season ID and avatar
        const profileUrl = `https://api.tracker.gg/api/v2/valorant/standard/profile/riot/${encodeURIComponent(playerIdentifier)}`;
        const profileResponse = await fetch(profileUrl, { headers: browserHeaders });
        
        if (!profileResponse.ok) {
            return interaction.editReply({ 
                content: '❌ Unable to fetch player data. Profile may be set to private!',
                components: []
            });
        }
        
        const profileData = await profileResponse.json();
        const avatarUrl = profileData.data?.platformInfo?.avatarUrl;
        const platformHandle = profileData.data?.platformInfo?.platformUserHandle;
        
        // Get current season ID from profile
        const seasonSegment = profileData.data?.segments?.find(
            seg => seg.type === 'season' && seg.attributes?.playlist === 'competitive'
        );
        const seasonId = seasonSegment?.attributes?.seasonId;
        const seasonName = seasonSegment?.metadata?.name || 'Current Season';
        
        if (!seasonId) {
            return interaction.editReply({ 
                content: '❌ Unable to determine current season!',
                components: []
            });
        }
        
        // Fetch weapon loadout stats
        const loadoutUrl = `https://api.tracker.gg/api/v2/valorant/standard/profile/riot/${encodeURIComponent(playerIdentifier)}/segments/loadout?playlist=competitive&seasonId=${seasonId}`;
        const loadoutResponse = await fetch(loadoutUrl, { headers: browserHeaders });
        
        if (!loadoutResponse.ok) {
            return interaction.editReply({ 
                content: '❌ Unable to fetch weapon stats!',
                components: []
            });
        }
        
        const loadoutData = await loadoutResponse.json();
        const loadouts = loadoutData.data || [];
        
        if (loadouts.length === 0) {
            return interaction.editReply({ 
                content: '❌ No weapon stats found for this player!',
                components: []
            });
        }
        
        // Fetch weapon stats
        const weaponUrl = `https://api.tracker.gg/api/v2/valorant/standard/profile/riot/${encodeURIComponent(playerIdentifier)}/segments/weapon?playlist=competitive&seasonId=${seasonId}`;
        const weaponResponse = await fetch(weaponUrl, { headers: browserHeaders });
        
        let weapons = [];
        if (weaponResponse.ok) {
            const weaponData = await weaponResponse.json();
            weapons = weaponData.data || [];
        }
        
        // Fetch season segments to get longestKillDistance per weapon
        const seasonSegmentsUrl = `https://api.tracker.gg/api/v2/valorant/standard/profile/riot/${encodeURIComponent(playerIdentifier)}/segments/season?playlist=competitive&seasonId=${seasonId}&source=web`;
        const seasonSegmentsResponse = await fetch(seasonSegmentsUrl, { headers: browserHeaders });
        
        let weaponDistanceMap = {};
        if (seasonSegmentsResponse.ok) {
            const seasonSegmentsData = await seasonSegmentsResponse.json();
            const seasonWeapons = (seasonSegmentsData.data || []).filter(s => s.type === 'weapon');
            for (const w of seasonWeapons) {
                const key = w.attributes?.key;
                if (key && w.stats?.longestKillDistance) {
                    weaponDistanceMap[key] = w.stats.longestKillDistance.displayValue;
                }
            }
        }
        
        // Loadout type emojis and order
        const loadoutOrder = ['pistol', 'full', 'semi', 'eco'];
        const loadoutEmojis = {
            'pistol': '🔫',
            'eco': '💰',
            'semi': '⚖️',
            'full': '💎'
        };
        
        // Loadout descriptions
        const loadoutDescriptions = {
            'pistol': '1st Round Atk/Def',
            'full': '>= $3900',
            'semi': '$1000-3900',
            'eco': '$0-1000'
        };
        
        // Create embed
        const embed = new EmbedBuilder()
            .setColor('#FF4654')
            .setTitle(`Weapon & Loadout Stats - ${platformHandle}`)
            .setDescription(`**${seasonName}** - Competitive`)
            .setTimestamp();
        
        if (avatarUrl) {
            embed.setThumbnail(avatarUrl);
        }
        
        // === LOADOUTS Section ===
        // Sort loadouts by order
        const sortedLoadouts = loadoutOrder
            .map(key => loadouts.find(l => l.attributes?.key === key))
            .filter(Boolean);
        
        // Build loadout table header - using monospace formatting
        let loadoutTable = '```\n';
        loadoutTable += 'Loadout│ K/D │ ADR │ KAST │  ESR │Kill│Death\n';
        loadoutTable += '───────┼─────┼─────┼──────┼──────┼────┼─────\n';
        
        for (const loadout of sortedLoadouts) {
            const key = loadout.attributes?.key;
            const name = loadout.metadata?.name || key;
            const stats = loadout.stats || {};
            
            const kd = String(stats.kDRatio?.displayValue || '0.00').padStart(4);
            const adr = String(Math.round(stats.damagePerRound?.value || 0)).padStart(3);
            const kast = String(stats.kAST?.displayValue || '0.0%').padStart(5);
            const esr = String(stats.esr?.displayValue || '0.0%').padStart(5);
            const kills = String(stats.kills?.value || 0).padStart(3);
            const deaths = String(stats.deaths?.value || 0).padStart(4);
            
            const paddedName = name.padEnd(6);
            
            loadoutTable += `${paddedName} │${kd} │ ${adr} │${kast} │${esr} │${kills} │${deaths}\n`;
        }
        loadoutTable += '```';
        
        embed.addFields({
            name: 'LOADOUTS',
            value: loadoutTable,
            inline: false
        });
        
        // === WEAPONS Section ===
        if (weapons.length > 0) {
            // Sort weapons by kills (descending), filter out 0-kill weapons
            const sortedWeapons = weapons
                .filter(w => w.type === 'weapon' && (w.stats?.kills?.value || 0) > 0)
                .sort((a, b) => (b.stats?.kills?.value || 0) - (a.stats?.kills?.value || 0));
            
            const header = 'Weapon   │Kills│  HS% │ ADR │K/Rnd│ Distance\n';
            const separator = '─────────┼─────┼──────┼─────┼─────┼─────────\n';
            
            // Build all weapon rows
            const weaponRows = [];
            for (const weapon of sortedWeapons) {
                const name = weapon.metadata?.name || 'Unknown';
                const stats = weapon.stats || {};
                
                const kills = String(stats.kills?.value || 0).padStart(3);
                const hs = String(stats.headshotsPercentage?.displayValue || '0.0%').padStart(5);
                const adr = String(Math.round(stats.damagePerRound?.value || 0)).padStart(3);
                const killsPerRound = String(stats.killsPerRound?.displayValue || '0.0').padStart(3);
                const weaponKey = weapon.attributes?.key;
                const longestKill = weaponDistanceMap[weaponKey] || stats.longestKillDistance?.displayValue || 'N/A';
                
                const paddedName = name.substring(0, 8).padEnd(8);
                const paddedDistance = longestKill.padStart(7);
                
                weaponRows.push(`${paddedName} │ ${kills} │${hs} │ ${adr} │ ${killsPerRound} │${paddedDistance}\n`);
            }
            
            // Split rows into chunks that fit within 1024 chars per embed field
            const chunks = [];
            let currentRows = [];
            const overhead = '```\n'.length + header.length + separator.length + '```'.length;
            let currentLength = overhead;
            
            for (const row of weaponRows) {
                if (currentLength + row.length > 1024 && currentRows.length > 0) {
                    chunks.push(currentRows);
                    currentRows = [];
                    currentLength = overhead;
                }
                currentRows.push(row);
                currentLength += row.length;
            }
            if (currentRows.length > 0) chunks.push(currentRows);
            
            // Add each chunk as a separate embed field
            for (let i = 0; i < chunks.length; i++) {
                let table = '```\n' + header + separator;
                table += chunks[i].join('');
                table += '```';
                
                const fieldName = i === 0 ? 'WEAPONS' : 'WEAPONS (cont.)';
                embed.addFields({ name: fieldName, value: table, inline: false });
            }
        }
        
        embed.setFooter({ text: 'Valorant Weapon Stats | Competitive' });
        
        // Create back button
        const backButton = new ButtonBuilder()
            .setCustomId(`valorant_stats_${Buffer.from(playerIdentifier).toString('base64')}`)
            .setLabel('Back to Stats')
            .setStyle(ButtonStyle.Secondary);
        
        const buttonRow = new ActionRowBuilder().addComponents(backButton);
        
        await interaction.editReply({ embeds: [embed], components: [buttonRow], content: null });
        
    } catch (error) {
        console.error('Error fetching weapon stats:', error);
        await interaction.editReply({ 
            content: '❌ An error occurred while fetching weapon stats!',
            components: []
        });
    }
}

module.exports = {
    fetchAndDisplayStats,
    fetchAndDisplayWeaponStats,
    browserHeaders
};
