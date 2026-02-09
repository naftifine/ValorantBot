const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { browserHeaders } = require('./valorantStats');
const { getRankEmote } = require('./emotes');

// Cache to store season data for pagination
const seasonCache = new Map();

const SEASONS_PER_PAGE = 24;

/**
 * Check if rank is Immortal+
 * @param {string} tierName - Tên rank
 * @returns {boolean}
 */
function isImmortalPlus(tierName) {
    if (!tierName) return false;
    const tierLower = tierName.toLowerCase();
    return tierLower.startsWith('immortal') || tierLower === 'radiant';
}

/**
 * Format rank với RR nếu là Immortal+
 * @param {string} tierName - Tên rank
 * @param {number} rrValue - Giá trị RR
 * @returns {string}
 */
function formatRankWithRR(tierName, rrValue) {
    const emote = getRankEmote(tierName);
    if (!tierName) return 'Unranked';
    
    if (isImmortalPlus(tierName) && rrValue !== undefined && rrValue !== null) {
        return `${emote} ${tierName}\n${rrValue} RR`;
    }
    
    return `${emote} ${tierName}`;
}

/**
 * Tạo embed cho một trang season report
 * @param {Array} seasonReports - Tất cả season reports
 * @param {number} page - Số trang (bắt đầu từ 0)
 * @param {string} playerIdentifier - Valorant ID
 * @param {string} avatarUrl - Player avatar URL
 * @returns {EmbedBuilder}
 */
function createSeasonEmbed(seasonReports, page, playerIdentifier, avatarUrl) {
    const totalPages = Math.ceil(seasonReports.length / SEASONS_PER_PAGE);
    const startIndex = page * SEASONS_PER_PAGE;
    const endIndex = Math.min(startIndex + SEASONS_PER_PAGE, seasonReports.length);
    const displaySeasons = seasonReports.slice(startIndex, endIndex);

    const embed = new EmbedBuilder()
        .setColor('#FF4654')
        .setTitle(`Season Performance - ${playerIdentifier}`)
        .setDescription('**Competitive Season History**')
        .setTimestamp();

    // Add thumbnail if avatar URL is available
    if (avatarUrl) {
        embed.setThumbnail(avatarUrl);
    }

    // Thêm fields cho mỗi season
    for (const season of displaySeasons) {
        const stats = season.stats;
        const metadata = season.metadata;
        const seasonName = metadata?.name || 'Unknown Season';
        
        const rankTierName = stats.rank?.metadata?.tierName;
        const rankValue = stats.rank?.value;
        
        const rankDisplay = formatRankWithRR(rankTierName, rankValue);
        
        const timePlayed = stats.timePlayed?.displayValue || '0h';
        const matches = stats.matchesPlayed?.value || 0;
        const headshotPct = stats.headshotsPercentage?.displayValue || '0%';
        const kdRatio = stats.kDRatio?.displayValue || '0';
        const winRate = stats.matchesWinPct?.displayValue || '0%';

        const fieldValue = [
            rankDisplay,
            `Playtime: ${timePlayed}`,
            `Matches: ${matches}`,
            `HS%: ${headshotPct} | ${kdRatio} K/D`,
            `Winrate: ${winRate}`
        ].join('\n');

        embed.addFields({
            name: `${seasonName}`,
            value: fieldValue,
            inline: true
        });
    }

    embed.setFooter({ 
        text: `Page ${page + 1}/${totalPages} | Showing ${startIndex + 1}-${endIndex} of ${seasonReports.length} seasons` 
    });

    return embed;
}

/**
 * Tạo buttons cho pagination
 * @param {string} cacheKey - Key để lấy data từ cache
 * @param {number} currentPage - Trang hiện tại
 * @param {number} totalPages - Tổng số trang
 * @returns {ActionRowBuilder}
 */
function createPaginationButtons(cacheKey, currentPage, totalPages) {
    const backButton = new ButtonBuilder()
        .setCustomId(`season_back_${cacheKey}_${currentPage}`)
        .setLabel('◀️ Back')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 0);

    const nextButton = new ButtonBuilder()
        .setCustomId(`season_next_${cacheKey}_${currentPage}`)
        .setLabel('Next ▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages - 1);

    const pageIndicator = new ButtonBuilder()
        .setCustomId('season_page_indicator')
        .setLabel(`${currentPage + 1} / ${totalPages}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true);

    return new ActionRowBuilder().addComponents(backButton, pageIndicator, nextButton);
}

/**
 * Fetch và hiển thị Season Report của người chơi
 * @param {Interaction} interaction - Discord interaction object
 * @param {string} playerIdentifier - Valorant ID (VD: Naftifine#meow)
 * @param {number} page - Số trang (mặc định 0)
 */
async function fetchAndDisplaySeasonReport(interaction, playerIdentifier, page = 0) {
    try {
        // Tạo cache key unique cho mỗi player
        const cacheKey = Buffer.from(playerIdentifier).toString('base64').slice(0, 20);
        
        let seasonReports;
        let avatarUrl = null;
        
        // Kiểm tra cache trước
        if (seasonCache.has(cacheKey) && page > 0) {
            const cached = seasonCache.get(cacheKey);
            seasonReports = cached.reports;
            avatarUrl = cached.avatarUrl;
        } else {
            // Fetch profile to get avatar URL
            const profileUrl = `https://api.tracker.gg/api/v2/valorant/standard/profile/riot/${encodeURIComponent(playerIdentifier)}`;
            const profileResponse = await fetch(profileUrl, { headers: browserHeaders });
            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                avatarUrl = profileData.data?.platformInfo?.avatarUrl;
            }
            
            const url = `https://api.tracker.gg/api/v2/valorant/standard/profile/riot/${encodeURIComponent(playerIdentifier)}/segments/season-report?playlist=competitive`;
            
            const response = await fetch(url, { headers: browserHeaders });

            if (!response.ok) {
                return interaction.editReply({ 
                    content: '❌ Không thể lấy dữ liệu Season Report. Profile có thể đang ở chế độ riêng tư!',
                    components: []
                });
            }

            const jsonData = await response.json();
            const seasons = jsonData.data || [];

            // Lọc chỉ lấy season-report
            seasonReports = seasons.filter(s => s.type === 'season-report');

            if (seasonReports.length === 0) {
                return interaction.editReply({ 
                    content: '❌ Không tìm thấy dữ liệu Season Report cho người chơi này!',
                    components: []
                });
            }

            // Sắp xếp theo sort (mới nhất trước)
            seasonReports.sort((a, b) => (b.metadata?.sort || 0) - (a.metadata?.sort || 0));

            // Lưu vào cache (tự động xóa sau 5 phút)
            seasonCache.set(cacheKey, { reports: seasonReports, avatarUrl });
            setTimeout(() => seasonCache.delete(cacheKey), 5 * 60 * 1000);
        }

        const totalPages = Math.ceil(seasonReports.length / SEASONS_PER_PAGE);
        
        // Tạo embed
        const embed = createSeasonEmbed(seasonReports, page, playerIdentifier, avatarUrl);
        
        // Tạo buttons nếu có nhiều hơn 1 trang
        const components = [];
        if (totalPages > 1) {
            components.push(createPaginationButtons(cacheKey, page, totalPages));
        }

        // Thêm nút Back to Stats
        const backToStatsButton = new ButtonBuilder()
            .setCustomId(`valorant_stats_${Buffer.from(playerIdentifier).toString('base64')}`)
            .setLabel('Back to Stats')
            .setStyle(ButtonStyle.Danger);

        const backButtonRow = new ActionRowBuilder().addComponents(backToStatsButton);
        components.push(backButtonRow);

        await interaction.editReply({ embeds: [embed], components, content: null });

    } catch (error) {
        console.error('Error fetching season report:', error);
        await interaction.editReply({ 
            content: '❌ Có lỗi xảy ra khi lấy dữ liệu. Vui lòng thử lại sau!',
            components: []
        });
    }
}

/**
 * Xử lý pagination button click
 * @param {Interaction} interaction - Button interaction
 * @param {string} action - 'back' hoặc 'next'
 * @param {string} cacheKey - Cache key
 * @param {number} currentPage - Trang hiện tại
 */
async function handleSeasonPagination(interaction, action, cacheKey, currentPage) {
    try {
        const cached = seasonCache.get(cacheKey);
        
        if (!cached) {
            return interaction.reply({ 
                content: '❌ Dữ liệu đã hết hạn. Vui lòng sử dụng lại lệnh /tracker!',
                flags: MessageFlags.Ephemeral 
            });
        }

        const seasonReports = cached.reports;
        const avatarUrl = cached.avatarUrl;
        const totalPages = Math.ceil(seasonReports.length / SEASONS_PER_PAGE);
        let newPage = currentPage;

        if (action === 'back' && currentPage > 0) {
            newPage = currentPage - 1;
        } else if (action === 'next' && currentPage < totalPages - 1) {
            newPage = currentPage + 1;
        }

        // Lấy player identifier từ cache data (lấy từ title của embed cũ)
        const oldEmbed = interaction.message.embeds[0];
        const playerIdentifier = oldEmbed?.title?.replace('Season Performance - ', '') || 'Unknown';

        const embed = createSeasonEmbed(seasonReports, newPage, playerIdentifier, avatarUrl);
        const components = [];
        if (totalPages > 1) {
            components.push(createPaginationButtons(cacheKey, newPage, totalPages));
        }

        await interaction.update({ embeds: [embed], components });

    } catch (error) {
        console.error('Error handling pagination:', error);
        await interaction.reply({ 
            content: '❌ Có lỗi xảy ra!',
            flags: MessageFlags.Ephemeral 
        });
    }
}

module.exports = {
    fetchAndDisplaySeasonReport,
    handleSeasonPagination,
    formatRankWithRR,
    isImmortalPlus,
    getRankEmote,
    seasonCache
};

