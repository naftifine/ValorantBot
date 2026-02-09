const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const AUTH_URL = 'https://auth.riotgames.com/authorize?client_id=riot-client&redirect_uri=http%3A%2F%2Flocalhost%2Fredirect&response_type=token+id_token&scope=openid+link+ban+lol_region+account&nonce=v44vd3cp9xe36be407ysw';

module.exports = {
    data: {
        name: 'login',
        description: 'Login to your Riot Account'
    },
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🔐 Login to your Riot Account')
            .setDescription(
                '**Step 1:** Click the link below to log in:\n' +
                `🔗 [Click here to login](${AUTH_URL})\n\n` +
                '**Step 2:** After logging in, your browser will show an error page – **this is normal!**\n\n' +
                '**Step 3:** Click the button below and paste the URL from your browser.\n\n' +
                '_Works with 2FA, Google, Facebook, Apple, and all login methods! Tip: Check \'Stay signed in\' to avoid being signed out._'
            )
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('login_paste_url')
                    .setLabel('🔑 I\'ve logged in - paste URL')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.reply({ 
            embeds: [embed], 
            components: [row],
            flags: MessageFlags.Ephemeral 
        });
    },

    // Handle button click
    async handleButton(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('login_url_modal')
            .setTitle('Paste Login URL');

        const urlInput = new TextInputBuilder()
            .setCustomId('login_url_input')
            .setLabel('Paste the URL from your browser')
            .setPlaceholder('http://localhost/redirect#access_token=...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const actionRow = new ActionRowBuilder().addComponents(urlInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
    },

    // Handle modal submit
    async handleModalSubmit(interaction) {
        const url = interaction.fields.getTextInputValue('login_url_input');
        
        try {
            // Parse the URL to extract tokens
            const parsedData = parseLoginUrl(url);
            
            if (!parsedData.access_token) {
                return await interaction.reply({
                    content: '❌ Invalid URL! Please make sure you copied the full URL from your browser.',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Decode the id_token to get account info
            const accountInfo = decodeIdToken(parsedData.id_token);
            
            // Save to data.json
            const dataPath = path.join(__dirname, '..', 'data', 'data.json');
            let data = {};
            
            // Read existing data if file exists
            if (fs.existsSync(dataPath)) {
                const fileContent = fs.readFileSync(dataPath, 'utf-8');
                if (fileContent.trim()) {
                    data = JSON.parse(fileContent);
                }
            }

            // Save user data with Discord user ID as key
            data[interaction.user.id] = {
                discord_id: interaction.user.id,
                discord_username: interaction.user.username,
                access_token: parsedData.access_token,
                id_token: parsedData.id_token,
                token_type: parsedData.token_type,
                expires_in: parsedData.expires_in,
                scope: parsedData.scope,
                puuid: accountInfo?.sub || null,
                game_name: accountInfo?.acct?.game_name || null,
                tag_line: accountInfo?.acct?.tag_line || null,
                region: accountInfo?.dat?.r || accountInfo?.lol_region?.find(r => r.active)?.cpid || null,
                login_at: new Date().toISOString()
            };

            // Write to file
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');

            const riotId = accountInfo?.acct ? 
                `${accountInfo.acct.game_name}#${accountInfo.acct.tag_line}` : 
                'Unknown';

            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Login Successful!')
                .setDescription(`Welcome, **${riotId}**!\n\nYour Riot account has been linked to your Discord account.`)
                .addFields(
                    { name: 'Riot ID', value: riotId, inline: true },
                    { name: 'Region', value: data[interaction.user.id].region || 'Unknown', inline: true }
                )
                .setFooter({ text: 'Your data has been saved securely' })
                .setTimestamp();

            await interaction.reply({
                embeds: [successEmbed],
                flags: MessageFlags.Ephemeral
            });

        } catch (error) {
            console.error('Login error:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your login. Please try again.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};

// Parse the redirect URL to extract tokens
function parseLoginUrl(url) {
    const result = {};
    
    try {
        // Extract fragment (everything after #)
        const hashIndex = url.indexOf('#');
        if (hashIndex === -1) return result;
        
        const fragment = url.substring(hashIndex + 1);
        const params = new URLSearchParams(fragment);
        
        result.access_token = params.get('access_token');
        result.id_token = params.get('id_token');
        result.token_type = params.get('token_type');
        result.expires_in = params.get('expires_in');
        result.scope = params.get('scope');
        result.session_state = params.get('session_state');
        
    } catch (error) {
        console.error('Error parsing URL:', error);
    }
    
    return result;
}

// Decode JWT id_token to get account info (without verification)
function decodeIdToken(idToken) {
    if (!idToken) return null;
    
    try {
        const parts = idToken.split('.');
        if (parts.length !== 3) return null;
        
        // Decode the payload (second part)
        const payload = parts[1];
        const decoded = Buffer.from(payload, 'base64').toString('utf-8');
        return JSON.parse(decoded);
    } catch (error) {
        console.error('Error decoding id_token:', error);
        return null;
    }
}
