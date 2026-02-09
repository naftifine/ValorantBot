const fs = require('fs');
const path = require('path');
const { MessageFlags } = require('discord.js');
const { browserHeaders } = require('../utils/valorantStats');

module.exports = {
    data: {
        name: 'setprofile',
        description: 'Link your Valorant account with Discord',
        options: [
            {
                name: 'riotid',
                description: 'Your RiotID (e.g. Naftifine#meow)',
                type: 3, // STRING
                required: true
            }
        ]
    },
    async execute(interaction) {
        const riotId = interaction.options.getString('riotid');
        const userId = interaction.user.id;

        // Kiểm tra định dạng name#tag
        const riotIdRegex = /^.+#.+$/;
        if (!riotIdRegex.test(riotId)) {
            return interaction.reply({
                content: 'Invalid Riot ID format! Please enter it in the format: `Name#Tag`\nExample: `Naftifine#meow`',
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply();

        try {
            // Kiểm tra profile có tồn tại trên tracker.gg không
            const profileUrl = `https://api.tracker.gg/api/v2/valorant/standard/profile/riot/${encodeURIComponent(riotId)}`;
            
            const profileResponse = await fetch(profileUrl, { headers: browserHeaders });

            if (!profileResponse.ok) {
                return interaction.editReply({
                    content: 'Could not find a Valorant profile with this Riot ID!\nPlease make sure that:\n• The Riot ID is correct (case-sensitive)\n• The tracker.gg profile is not set to private'
                });
            }

            const jsonData = await profileResponse.json();
            const data = jsonData.data;

            if (!data || !data.platformInfo) {
                return interaction.editReply({
                    content: 'Could not verify profile. Please try again later!'
                });
            }

            // Lưu vào profile.json
            const profilePath = path.join(__dirname, '..', 'data', 'profile.json');
            
            let profiles = {};
            if (fs.existsSync(profilePath)) {
                const fileContent = fs.readFileSync(profilePath, 'utf-8');
                if (fileContent.trim()) {
                    profiles = JSON.parse(fileContent);
                }
            }

            const isUpdate = profiles[userId] && profiles[userId].valorantId;
            const oldProfile = isUpdate ? profiles[userId].valorantId : null;

            // Lưu profile mới (ghi đè nếu đã có)
            profiles[userId] = {
                valorantId: data.platformInfo.platformUserIdentifier,
                displayName: data.platformInfo.platformUserHandle,
                avatarUrl: data.platformInfo.avatarUrl || null,
                linkedAt: new Date().toISOString(),
                discordUsername: interaction.user.username
            };

            fs.writeFileSync(profilePath, JSON.stringify(profiles, null, 2), 'utf-8');

            // Thông báo thành công
            if (isUpdate) {
                await interaction.editReply({
                    content: `Your Valorant profile has been updated!`
                });
            } else {
                await interaction.editReply({
                    content: `Successfully linked your Valorant profile!\n`
                });
            }

        } catch (error) {
            console.error('Error setting profile:', error);
            await interaction.editReply({
                content: 'An error occurred while linking your profile. Please try again later!'
            });
        }
    }
};

