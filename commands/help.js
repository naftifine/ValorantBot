const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: {
        name: 'help',
        description: 'Display all available commands'
    },
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#FF4654') // Valorant red color
            .setTitle('<:valorantlogo:1464555774981312563> Bot Commands')
            .setDescription('Here are all the available commands:')
            .addFields(
                {
                    name: '`/help`',
                    value: 'Display this help message with all available commands.',
                    inline: false
                },
                {
                    name: '`/login`',
                    value: 'Login to your Riot account to access shop and other features.',
                    inline: false
                },
                {
                    name: '`/shop`',
                    value: 'View your daily Valorant shop (requires login).',
                    inline: false
                },
                {
                    name: '`/tracker <name>`',
                    value: 'Look up Valorant stats for any player.\nExample: `/tracker name:Naftifine#meow`',
                    inline: false
                },
                {
                    name: '`/profile`',
                    value: 'Display your saved Valorant profile stats.',
                    inline: false
                },
                {
                    name: '`/setprofile <riotid>`',
                    value: 'Link your Valorant account to your Discord.\nExample: `/setprofile riotid:Naftifine#meow`',
                    inline: false
                }
            )
            .setFooter({ text: 'Valorant Stats Bot' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
