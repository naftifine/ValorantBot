const fs = require('fs');
const path = require('path');
const { fetchAndDisplayStats } = require('../utils/valorantStats');

module.exports = {
    data: {
        name: 'profile',
        description: 'Displays your saved Valorant profile.',
    },
    async execute(interaction) {
        const userId = interaction.user.id;
        const dataPath = path.join(__dirname, '..', 'data', 'data.json');

        await interaction.deferReply();

        try {
            // Đọc file data.json
            let data = {};
            if (fs.existsSync(dataPath)) {
                const fileContent = fs.readFileSync(dataPath, 'utf-8');
                if (fileContent.trim()) {
                    data = JSON.parse(fileContent);
                }
            }

            // Kiểm tra xem user có trong data không
            if (!data[userId] || !data[userId].game_name) {
                return interaction.editReply('❌ Your profile is not set. Use `/login` to link your Riot account.');
            }

            const valorantId = `${data[userId].game_name}#${data[userId].tag_line}`;

            // Fetch và hiển thị stats
            await fetchAndDisplayStats(interaction, valorantId);

        } catch (error) {
            console.error('Error reading profile:', error);
            await interaction.editReply('There was an error reading your profile. Please try again later.');
        }
    }
};