const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
const { fetchAndDisplayStats, browserHeaders } = require('../utils/valorantStats');
const { fetchAndDisplaySeasonReport } = require('../utils/seasonReport');

// Lưu trữ player identifier cho mỗi interaction để sử dụng với nút Performance
const playerCache = new Map();

module.exports = {
    data: {
        name: 'tracker',
        description: 'View Valorant player statistics',
        options: [
            {
                name: 'name',
                description: 'Player Name/RiotID (e.g. Naftifine / Naftifine#meow)',
                type: 3, 
                required: true
            }   
        ]
    },
    async execute(interaction) {
        const searchName = interaction.options.getString('name');
        
        await interaction.deferReply(); // Defer because the API may take time

        try {
            // Headers giả lập browser để tránh bị chặn 403
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

            // Bước 1: Search người chơi
            const searchUrl = `https://api.tracker.gg/api/v2/valorant/standard/search?platform=riot&query=${encodeURIComponent(searchName)}&autocomplete=true`;
            
            const searchResponse = await fetch(searchUrl, { headers: browserHeaders });
            if (!searchResponse.ok) {
                return interaction.editReply('Unable to find the player. Please try again later!');
            }

            const searchData = await searchResponse.json();
            const results = searchData.data || [];

            if (results.length === 0) {
                return interaction.editReply(`No players found with the name "${searchName}"`);
            }

            // Nếu chỉ có 1 kết quả, lấy luôn
            if (results.length === 1) {
                await fetchAndDisplayStats(interaction, results[0].platformUserIdentifier);
                return;
            }

            // Bước 2: Hiển thị dropdown để chọn
            const options = results.slice(0, 25).map((player, index) => ({
                label: player.platformUserHandle || player.platformUserIdentifier,
                description: player.status || `Platform: ${player.platformSlug || 'Riot'}`,
                value: player.platformUserIdentifier,
                emoji: '🎮'
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('valorant_player_select')
                .setPlaceholder('Choose player...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const response = await interaction.editReply({
                content: `Found **${results.length}** results for "${searchName}". Please select a player:`,
                components: [row]
            });

            // Step 3: Wait for user selection
            try {
                const collector = response.createMessageComponentCollector({
                    componentType: ComponentType.StringSelect,
                    time: 60000 // 60 seconds
                });

                collector.on('collect', async (selectInteraction) => {
                    if (selectInteraction.user.id !== interaction.user.id) {
                        return selectInteraction.reply({ 
                            content: 'You cannot use this menu!', 
                            flags: MessageFlags.Ephemeral 
                        });
                    }

                    await selectInteraction.deferUpdate();
                    const selectedPlayer = selectInteraction.values[0];
                    await fetchAndDisplayStats(interaction, selectedPlayer);
                    collector.stop();
                });

                collector.on('end', (collected, reason) => {
                    if (reason === 'time' && collected.size === 0) {
                        interaction.editReply({ 
                            content: 'Time is up! Please try again.', 
                            components: [] 
                        });
                    }
                });

            } catch (error) {
                console.error('Collector error:', error);
            }

        } catch (error) {
            console.error('Error searching valorant player:', error);
            await interaction.editReply('An error occurred while searching. Please try again later!');
        }
    }
};

