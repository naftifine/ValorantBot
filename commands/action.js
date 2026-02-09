const { EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { banUser, unbanUser, getBanList, isUserBanned } = require('../utils/banManager');

// Admin user IDs who can use this command (add your Discord ID here)
const ADMIN_IDS = [
    // Add admin Discord user IDs here
    // Example: '123456789012345678'
    process.env.OWNER_ID,
    process.env.ADMIN_IDS?.split(',') || []
];

module.exports = {
    data: {
        name: 'action',
        description: 'Manage bot bans (Admin only)',
        options: [
            {
                name: 'action',
                description: 'Action to perform',
                type: 3, // STRING
                required: true,
                choices: [
                    { name: 'Ban', value: 'ban' },
                    { name: 'Unban', value: 'unban' },
                    { name: 'Check', value: 'check' },
                    { name: 'List All', value: 'list' }
                ]
            },
            {
                name: 'user',
                description: 'User to ban/unban/check',
                type: 6, // USER
                required: false
            },
            {
                name: 'reason',
                description: 'Reason for ban',
                type: 3, // STRING
                required: false
            }
        ]
    },
    async execute(interaction) {
        // Check if user is admin
        const isAdmin = ADMIN_IDS.includes(interaction.user.id) || 
                        interaction.member?.permissions?.has(PermissionFlagsBits.Administrator);

        const action = interaction.options.getString('action');
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        if (targetUser.id === process.env.OWNER_ID) {
            return interaction.reply({
                content: '?',
            });
        }

        if (!isAdmin) {
            return interaction.reply({
                content: 'You do not have permission to use this command!',
                flags: MessageFlags.Ephemeral
            });
        }

        switch (action) {
            case 'ban': {
                if (!targetUser) {
                    return interaction.reply({
                        content: 'Please specify a user to ban!',
                        flags: MessageFlags.Ephemeral
                    });
                }

                // Prevent banning admins
                if (ADMIN_IDS.includes(targetUser.id)) {
                    return interaction.reply({
                        content: 'You cannot ban an admin!',
                        flags: MessageFlags.Ephemeral
                    });
                }
            
                const success = banUser(targetUser.id, reason, interaction.user.id);
                
                if (success) {
                    const embed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('🔨 User Banned')
                        .addFields(
                            { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                            { name: 'Reason', value: reason, inline: true },
                            { name: 'Banned By', value: interaction.user.tag, inline: true }
                        )
                        .setTimestamp();
                    
                    return interaction.reply({ embeds: [embed] });
                } else {
                    return interaction.reply({
                        content: 'Failed to ban user!',
                        flags: MessageFlags.Ephemeral
                    });
                }
            }

            case 'unban': {
                if (!targetUser) {
                    return interaction.reply({
                        content: 'Please specify a user to unban!',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const success = unbanUser(targetUser.id);
                
                if (success) {
                    const embed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('✅ User Unbanned')
                        .addFields(
                            { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                            { name: 'Unbanned By', value: interaction.user.tag, inline: true }
                        )
                        .setTimestamp();
                    
                    return interaction.reply({ embeds: [embed] });
                } else {
                    return interaction.reply({
                        content: 'User is not banned!',
                        flags: MessageFlags.Ephemeral
                    });
                }
            }

            case 'check': {
                if (!targetUser) {
                    return interaction.reply({
                        content: '❌ Please specify a user to check!',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const banInfo = isUserBanned(targetUser.id);
                
                if (banInfo) {
                    const embed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('🚫 User is Banned')
                        .addFields(
                            { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
                            { name: 'Reason', value: banInfo.reason, inline: true },
                            { name: 'Banned At', value: new Date(banInfo.bannedAt).toLocaleString(), inline: true },
                            { name: 'Banned By', value: `<@${banInfo.bannedBy}>`, inline: true }
                        )
                        .setTimestamp();
                    
                    return interaction.reply({ embeds: [embed] });
                } else {
                    const embed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('✅ User is Not Banned')
                        .setDescription(`${targetUser.tag} is not banned from using this bot.`)
                        .setTimestamp();
                    
                    return interaction.reply({ embeds: [embed] });
                }
            }

            case 'list': {
                const banList = getBanList();
                const bannedUsers = Object.entries(banList);
                
                if (bannedUsers.length === 0) {
                    return interaction.reply({
                        content: '✅ No users are currently banned.',
                        flags: MessageFlags.Ephemeral
                    });
                }

                const embed = new EmbedBuilder()
                    .setColor('#FF4654')
                    .setTitle('📋 Ban List')
                    .setDescription(`Total banned users: **${bannedUsers.length}**`)
                    .setTimestamp();

                // Add fields for each banned user (max 25)
                const displayUsers = bannedUsers.slice(0, 25);
                for (const [userId, info] of displayUsers) {
                    embed.addFields({
                        name: `User ID: ${userId}`,
                        value: `**Reason:** ${info.reason}\n**Banned At:** ${new Date(info.bannedAt).toLocaleString()}`,
                        inline: true
                    });
                }

                if (bannedUsers.length > 25) {
                    embed.setFooter({ text: `Showing 25 of ${bannedUsers.length} banned users` });
                }

                return interaction.reply({ embeds: [embed] });
            }
        }
    }
};

