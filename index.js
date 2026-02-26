require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { fetchAndDisplaySeasonReport, handleSeasonPagination } = require('./utils/seasonReport');
const { fetchAndDisplayMatchHistory, fetchAndDisplayMatchDetail } = require('./utils/matchHistory');
const { fetchAndDisplayStats, fetchAndDisplayWeaponStats } = require('./utils/valorantStats');
const { checkBanMiddleware } = require('./utils/banManager');
const { initializeAllData } = require('./utils/skinData');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Collection to store commands
client.commands = new Collection();

// Load all commands from commands folder
function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`✅ Loaded command: ${command.data.name}`);
        } else {
            console.log(`⚠️ Command at ${filePath} is missing "data" or "execute"`);
        }
    }
}

// Load commands
loadCommands();

// Register slash commands
async function registerCommands() {
    const commands = client.commands.map(cmd => cmd.data);

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('Registering slash commands...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('Slash commands registered successfully!');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

// When bot is ready
client.once('clientReady', async () => {
    console.log(`Bot is online as: ${client.user.tag}`);
    registerCommands();
    
    // Initialize Valorant content data (skins, buddies, etc.)
    await initializeAllData();
});

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
    // Handle Modal submissions
    if (interaction.isModalSubmit()) {
        // Login URL modal
        if (interaction.customId === 'login_url_modal') {
            try {
                const loginCommand = client.commands.get('login');
                if (loginCommand && loginCommand.handleModalSubmit) {
                    await loginCommand.handleModalSubmit(interaction);
                }
            } catch (error) {
                console.error('Error handling login modal:', error);
                await interaction.reply({ 
                    content: '❌ An error occurred while processing your login!', 
                    flags: MessageFlags.Ephemeral 
                });
            }
            return;
        }

        // Bug report modal
        if (interaction.customId === 'bug_report_modal') {
            try {
                const reportCommand = client.commands.get('report');
                if (reportCommand && reportCommand.handleModalSubmit) {
                    await reportCommand.handleModalSubmit(interaction);
                }
            } catch (error) {
                console.error('Error handling bug report modal:', error);
                await interaction.reply({ 
                    content: '❌ An error occurred while submitting your report!', 
                    flags: MessageFlags.Ephemeral 
                });
            }
            return;
        }
    }

    // Handle Button interactions
    if (interaction.isButton()) {
        // Login paste URL button
        if (interaction.customId === 'login_paste_url') {
            try {
                const loginCommand = client.commands.get('login');
                if (loginCommand && loginCommand.handleButton) {
                    await loginCommand.handleButton(interaction);
                }
            } catch (error) {
                console.error('Error handling login button:', error);
                await interaction.reply({ 
                    content: '❌ An error occurred!', 
                    flags: MessageFlags.Ephemeral 
                });
            }
            return;
        }

        // Shop buttons disabled (accessory shop removed)

        // Performance button
        if (interaction.customId.startsWith('valorant_performance_')) {
            try {
                // Get player identifier from customId (base64 encoded)
                const encodedPlayer = interaction.customId.replace('valorant_performance_', '');
                const playerIdentifier = Buffer.from(encodedPlayer, 'base64').toString('utf-8');
                
                await interaction.deferUpdate();
                await fetchAndDisplaySeasonReport(interaction, playerIdentifier);
            } catch (error) {
                console.error('Error handling performance button:', error);
                await interaction.reply({ 
                    content: '❌ An error occurred while fetching Season Performance!', 
                    flags: MessageFlags.Ephemeral 
                });
            }
            return;
        }

        // Match History button
        if (interaction.customId.startsWith('valorant_matches_')) {
            try {
                const encodedPlayer = interaction.customId.replace('valorant_matches_', '');
                const playerIdentifier = Buffer.from(encodedPlayer, 'base64').toString('utf-8');
                
                await interaction.deferUpdate();
                await fetchAndDisplayMatchHistory(interaction, playerIdentifier);
            } catch (error) {
                console.error('Error handling match history button:', error);
                await interaction.reply({ 
                    content: '❌ An error occurred while fetching Match History!', 
                    flags: MessageFlags.Ephemeral 
                });
            }
            return;
        }

        // Back to Stats button
        if (interaction.customId.startsWith('valorant_stats_')) {
            try {
                const encodedPlayer = interaction.customId.replace('valorant_stats_', '');
                const playerIdentifier = Buffer.from(encodedPlayer, 'base64').toString('utf-8');
                
                await interaction.deferUpdate();
                await fetchAndDisplayStats(interaction, playerIdentifier);
            } catch (error) {
                console.error('Error handling back to stats button:', error);
                await interaction.reply({ 
                    content: '❌ An error occurred while fetching Stats!', 
                    flags: MessageFlags.Ephemeral 
                });
            }
            return;
        }

        // Pagination buttons (Back/Next)
        if (interaction.customId.startsWith('season_back_') || interaction.customId.startsWith('season_next_')) {
            try {
                const parts = interaction.customId.split('_');
                const action = parts[1]; // 'back' or 'next'
                const cacheKey = parts[2];
                const currentPage = parseInt(parts[3], 10);
                
                await handleSeasonPagination(interaction, action, cacheKey, currentPage);
            } catch (error) {
                console.error('Error handling pagination:', error);
                await interaction.reply({ 
                    content: '❌ An error occurred!', 
                    flags: MessageFlags.Ephemeral 
                });
            }
            return;
        }

        return;
    }

    // Handle Select Menu interactions
    if (interaction.isStringSelectMenu()) {
        // Profile menu dropdown (Performance, Match History, Weapon Stats)
        if (interaction.customId === 'valorant_profile_menu') {
            try {
                const value = interaction.values[0];
                const parts = value.split('_');
                const action = parts[0]; // 'performance', 'matches', or 'weapons'
                const encodedPlayer = parts.slice(1).join('_');
                const playerIdentifier = Buffer.from(encodedPlayer, 'base64').toString('utf-8');
                
                await interaction.deferUpdate();
                
                if (action === 'performance') {
                    await fetchAndDisplaySeasonReport(interaction, playerIdentifier);
                } else if (action === 'matches') {
                    await fetchAndDisplayMatchHistory(interaction, playerIdentifier);
                } else if (action === 'weapons') {
                    await fetchAndDisplayWeaponStats(interaction, playerIdentifier);
                }
            } catch (error) {
                console.error('Error handling profile menu:', error);
                await interaction.reply({ 
                    content: '❌ An error occurred!', 
                    flags: MessageFlags.Ephemeral 
                });
            }
            return;
        }

        // Match detail dropdown
        if (interaction.customId === 'match_detail_select') {
            try {
                const value = interaction.values[0];
                // Format: match_{matchId}_{base64Player}
                const parts = value.split('_');
                const matchId = parts[1];
                const encodedPlayer = parts.slice(2).join('_');
                const playerIdentifier = Buffer.from(encodedPlayer, 'base64').toString('utf-8');
                
                await interaction.deferUpdate();
                await fetchAndDisplayMatchDetail(interaction, matchId, playerIdentifier);
            } catch (error) {
                console.error('Error handling match detail select:', error);
                await interaction.reply({ 
                    content: '❌ An error occurred while fetching match details!', 
                    flags: MessageFlags.Ephemeral 
                });
            }
            return;
        }

        return;
    }

    if (!interaction.isChatInputCommand()) return;

    // Check if user is banned
    const canProceed = await checkBanMiddleware(interaction);
    if (!canProceed) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ 
            content: 'An error occurred while executing the command!', 
            flags: MessageFlags.Ephemeral 
        });
    }
});

// Login bot
client.login(process.env.DISCORD_TOKEN);

