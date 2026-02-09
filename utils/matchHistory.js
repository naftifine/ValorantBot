const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { browserHeaders } = require('./valorantStats');
const { getRankEmote, getAgentEmote, valorantLogo } = require('./emotes');

/**
 * Format time ago from date
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted time ago
 */
function formatTimeAgo(dateString) {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
        return `${diffMins}m ago`;
    } else if (diffHours < 24) {
        return `${diffHours}h ago`;
    } else {
        return `${diffDays}d ago`;
    }
}

/**
 * Format duration from milliseconds
 * @param {number} ms - Duration in milliseconds
 * @returns {string} - Formatted duration (e.g. "32:15")
 */
function formatDuration(ms) {
    if (!ms) return 'Unknown';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Fetch and display match detail for a specific match
 * @param {Interaction} interaction - Discord interaction object
 * @param {string} matchId - Match ID
 * @param {string} playerIdentifier - Player identifier for back button
 */
async function fetchAndDisplayMatchDetail(interaction, matchId, playerIdentifier) {
    try {
        const matchUrl = `https://api.tracker.gg/api/v2/valorant/standard/matches/${matchId}`;
        const matchResponse = await fetch(matchUrl, { headers: browserHeaders });

        if (!matchResponse.ok) {
            return interaction.editReply({
                content: 'Unable to fetch match details!',
                components: []
            });
        }

        const jsonData = await matchResponse.json();
        const matchData = jsonData.data;
        const metadata = matchData.metadata;
        const segments = matchData.segments || [];

        // Get team summaries
        const teams = segments.filter(seg => seg.type === 'team-summary');
        const teamA = teams.find(t => t.metadata?.hasWon) || teams[0];
        const teamB = teams.find(t => !t.metadata?.hasWon) || teams[1];

        // Get player summaries
        const playerSummaries = segments.filter(seg => seg.type === 'player-summary');
        
        // Separate players by team
        const teamAPlayers = playerSummaries.filter(p => p.metadata?.teamId === teamA?.attributes?.teamId);
        const teamBPlayers = playerSummaries.filter(p => p.metadata?.teamId === teamB?.attributes?.teamId);

        // Sort players by ACS (scorePerRound)
        const sortByACS = (a, b) => (b.stats?.scorePerRound?.value || 0) - (a.stats?.scorePerRound?.value || 0);
        teamAPlayers.sort(sortByACS);
        teamBPlayers.sort(sortByACS);

        // Build match info
        const mapName = metadata?.mapName || 'Unknown Map';
        const duration = formatDuration(metadata?.duration);
        const teamAScore = teamA?.stats?.roundsWon?.value || 0;
        const teamBScore = teamB?.stats?.roundsWon?.value || 0;

        // Build team stats - Table format
        const formatPlayerRow = (player) => {
            const meta = player.metadata || {};
            const stats = player.stats || {};
            
            const agentName = (meta.agentName || 'Unknown').substring(0, 8).padEnd(8);
            const agentEmote = getAgentEmote(meta.agentName);
            const playerName = (meta.platformInfo?.platformUserHandle || 'Unknown').substring(0, 14).padEnd(14);
            
            // Rank
            const rankTierName = stats.rank?.displayValue || stats.currRank?.displayValue;
            const rankEmote = getRankEmote(rankTierName);
            
            // Stats - pad for alignment
            const acs = String(stats.scorePerRound?.displayValue || '0').padStart(3);
            const kills = String(stats.kills?.value || 0).padStart(2);
            const deaths = String(stats.deaths?.value || 0).padStart(2);
            const assists = String(stats.assists?.value || 0).padStart(2);
            const kd = String(stats.kdRatio?.displayValue || '0.0').padStart(4);
            const hs = String(Math.round(stats.hsAccuracy?.value || 0)).padStart(2) + '%';
            const adr = String(Math.round(stats.damagePerRound?.value || 0)).padStart(3);
            const kast = String(Math.round(stats.kast?.value || 0)).padStart(2) + '%';
            const fk = String(stats.firstKills?.value || 0).padStart(2);
            
            return { agentEmote, agentName, rankEmote, playerName, acs, kills, deaths, assists, kd, hs, adr, kast, fk };
        };

        // Create table header
        const tableHeader = '` Agent  │ ACS │ K  │ D  │ A  │ K/D  │ HS% │ ADR │KAST │ FK `';
        const tableDivider = '`────────┼─────┼────┼────┼────┼──────┼─────┼─────┼─────┼────`';

        // Format team rows
        const formatTeamTable = (players) => {
            let rows = [tableHeader, tableDivider];
            for (const player of players) {
                const p = formatPlayerRow(player);
                rows.push(`${p.agentEmote}${p.rankEmote} **${p.playerName.trim()}**`);
                rows.push(`\`${p.agentName}│ ${p.acs} │ ${p.kills} │ ${p.deaths} │ ${p.assists} │ ${p.kd} │ ${p.hs} │ ${p.adr} │ ${p.kast} │ ${p.fk} \``);
            }
            return rows.join('\n');
        };

        const teamATable = formatTeamTable(teamAPlayers);
        const teamBTable = formatTeamTable(teamBPlayers);

        // Create embed
        const embed = new EmbedBuilder()
            .setColor(teamAScore > teamBScore ? '#00FF00' : '#FF0000')
            .setTitle(`${valorantLogo} Match Detail - ${mapName}`)
            .setDescription(`**Score: ${teamAScore} - ${teamBScore}** | Duration: ${duration}`)
            .addFields(
                { 
                    name: `🟢 Team A (${teamAScore} rounds)`, 
                    value: teamATable || 'No data', 
                    inline: false 
                },
                { 
                    name: `🔴 Team B (${teamBScore} rounds)`, 
                    value: teamBTable || 'No data', 
                    inline: false 
                }
            )
            .setFooter({ text: `Match ID: ${matchId}` })
            .setTimestamp(new Date(metadata?.dateStarted));

        // Create back button
        const backButton = new ButtonBuilder()
            .setCustomId(`valorant_matches_${Buffer.from(playerIdentifier).toString('base64')}`)
            .setLabel('Back to Match History')
            .setStyle(ButtonStyle.Secondary);

        const buttonRow = new ActionRowBuilder().addComponents(backButton);

        await interaction.editReply({ embeds: [embed], components: [buttonRow], content: null });

    } catch (error) {
        console.error('Error fetching match detail:', error);
        await interaction.editReply({
            content: '❌ An error occurred while fetching match details!',
            components: []
        });
    }
}

/**
 * Fetch and display match history for a player
 * @param {Interaction} interaction - Discord interaction object
 * @param {string} playerIdentifier - Valorant ID (e.g: Naftifine#meow)
 * @param {string} seasonId - Season ID to fetch matches for
 */
async function fetchAndDisplayMatchHistory(interaction, playerIdentifier, seasonId) {
    try {
        // If no seasonId provided, fetch profile first to get current season
        let currentSeasonId = seasonId;
        let avatarUrl = null;
        
        if (!currentSeasonId) {
            const profileUrl = `https://api.tracker.gg/api/v2/valorant/standard/profile/riot/${encodeURIComponent(playerIdentifier)}`;
            const profileResponse = await fetch(profileUrl, { headers: browserHeaders });
            
            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                // Get avatar URL
                avatarUrl = profileData.data?.platformInfo?.avatarUrl;
                // Get the latest season ID from segments
                const seasonSegment = profileData.data?.segments?.find(
                    seg => seg.type === 'season' && seg.attributes?.playlist === 'competitive'
                );
                currentSeasonId = seasonSegment?.attributes?.seasonId;
            }
        }
        
        if (!currentSeasonId) {
            return interaction.editReply({ 
                content: '❌ Unable to determine current season!',
                components: []
            });
        }

        // Fetch match history data with correct API format
        const matchesUrl = `https://api.tracker.gg/api/v2/valorant/standard/matches/riot/${encodeURIComponent(playerIdentifier)}?platform=pc&season=${currentSeasonId}&type=competitive`;
        
        const matchesResponse = await fetch(matchesUrl, { headers: browserHeaders });

        if (!matchesResponse.ok) {
            return interaction.editReply({ 
                content: '❌ Unable to fetch match history. Profile may be set to private!',
                components: []
            });
        }

        const jsonData = await matchesResponse.json();
        const matches = jsonData.data?.matches || [];

        if (matches.length === 0) {
            return interaction.editReply({ 
                content: '❌ No match history found for this player!',
                components: []
            });
        }

        // Get last 10 matches
        const recentMatches = matches.slice(0, 10);

        // Build match history description
        let matchDescription = '';
        
        for (let i = 0; i < recentMatches.length; i++) {
            const match = recentMatches[i];
            const metadata = match.metadata;
            const segments = match.segments || [];
            
            // Find overview segment for player stats
            const overviewSegment = segments.find(seg => seg.type === 'overview');
            const segmentMetadata = overviewSegment?.metadata || {};
            const stats = overviewSegment?.stats || {};
            
            // Match info
            const mapName = metadata?.mapName || 'Unknown Map';
            const result = metadata?.result || segmentMetadata?.result || 'Unknown';
            const matchDate = metadata?.timestamp;
            const timeAgo = formatTimeAgo(matchDate);
            
            // Agent info
            const agentName = segmentMetadata?.agentName || 'Unknown';
            
            // Score from rounds
            const roundsWon = stats.roundsWon?.value || 0;
            const roundsLost = stats.roundsLost?.value || 0;
            const score = `${roundsWon}-${roundsLost}`;
            
            // Player stats
            const kills = stats.kills?.value || 0;
            const deaths = stats.deaths?.value || 0;
            const assists = stats.assists?.value || 0;
            const kda = `${kills}/${deaths}/${assists}`;
            
            const acs = stats.scorePerRound?.displayValue || '0';
            const hs = stats.headshotsPercentage?.displayValue || '0';
            
            // Rank info
            const rankTierName = stats.rank?.metadata?.tierName;
            const rankEmote = getRankEmote(rankTierName);
            
            // Result emoji
            const resultLower = result.toLowerCase();
            const resultEmoji = resultLower === 'victory' ? '🟢' : 
                               resultLower === 'defeat' ? '🔴' : '🟡';
            
            // Format each match line
            // Format: [Result] Map | Score
            // ┗ Agent | K/D/A | ACS | HS% | Rank | Time
            const agentEmote = getAgentEmote(agentName);
            matchDescription += `${resultEmoji} **${mapName}** \`${score}\`\n`;
            matchDescription += `┗ ${agentEmote} ${agentName} | **${kda}** | ACS: ${acs} | HS: ${hs}%`;
            if (rankEmote) {
                matchDescription += ` | ${rankEmote}`;
            }
            matchDescription += ` | ${timeAgo}\n\n`;
        }

        // Get season name from first match
        const seasonName = recentMatches[0]?.metadata?.seasonName || 'Current Season';

        // Create embed
        const embed = new EmbedBuilder()
            .setColor('#FF4654') // Valorant red color
            .setTitle(`<:valorantlogo:1464555774981312563> Match History - ${playerIdentifier}`)
            .setDescription(`**${seasonName} - Last ${recentMatches.length} Competitive Matches**\n\n${matchDescription}`)
            .setFooter({ text: 'Valorant Match History | Competitive' })
            .setTimestamp();
        
        // Add thumbnail if avatar URL is available
        if (avatarUrl) {
            embed.setThumbnail(avatarUrl);
        }

        // Create dropdown for match details
        const selectOptions = recentMatches.map((match, index) => {
            const metadata = match.metadata;
            const segments = match.segments || [];
            const overviewSegment = segments.find(seg => seg.type === 'overview');
            const segmentMetadata = overviewSegment?.metadata || {};
            const stats = overviewSegment?.stats || {};
            
            const mapName = metadata?.mapName || 'Unknown Map';
            const result = metadata?.result || segmentMetadata?.result || 'Unknown';
            const roundsWon = stats.roundsWon?.value || 0;
            const roundsLost = stats.roundsLost?.value || 0;
            const resultEmoji = result.toLowerCase() === 'victory' ? '🟢' : 
                               result.toLowerCase() === 'defeat' ? '🔴' : '🟡';
            
            return {
                label: `${mapName} (${roundsWon}-${roundsLost})`,
                description: `${result} - Click to view details`,
                value: `match_${match.attributes?.id}_${Buffer.from(playerIdentifier).toString('base64')}`,
                emoji: resultEmoji === '🟢' ? '🟢' : resultEmoji === '🔴' ? '🔴' : '🟡'
            };
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('match_detail_select')
            .setPlaceholder('📋 Select a match to view details')
            .addOptions(selectOptions);

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        // Create back button
        const backButton = new ButtonBuilder()
            .setCustomId(`valorant_stats_${Buffer.from(playerIdentifier).toString('base64')}`)
            .setLabel('Back to Stats')
            .setStyle(ButtonStyle.Secondary);

        const buttonRow = new ActionRowBuilder().addComponents(backButton);

        await interaction.editReply({ embeds: [embed], components: [selectRow, buttonRow], content: null });

    } catch (error) {
        console.error('Error fetching match history:', error);
        await interaction.editReply({ 
            content: '❌ An error occurred while fetching match history. Please try again later!',
            components: []
        });
    }
}

module.exports = {
    fetchAndDisplayMatchHistory,
    fetchAndDisplayMatchDetail
};
