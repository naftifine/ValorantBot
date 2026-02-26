const { EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');

const BUG_REPORT_CHANNEL_ID = '1476475229688828029';

module.exports = {
    data: {
        name: 'report',
        description: 'Report a bug or issue with the bot'
    },
    async execute(interaction) {
        // Show modal for bug report
        const modal = new ModalBuilder()
            .setCustomId('bug_report_modal')
            .setTitle('Bug Report');

        const titleInput = new TextInputBuilder()
            .setCustomId('bug_title')
            .setLabel('Bug Title')
            .setPlaceholder('Brief description of the bug')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('bug_description')
            .setLabel('Bug Description')
            .setPlaceholder('Please describe the bug in detail. What happened? What did you expect?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1000);

        const stepsInput = new TextInputBuilder()
            .setCustomId('bug_steps')
            .setLabel('Steps to Reproduce (Optional)')
            .setPlaceholder('1. Use /command\n2. Click button\n3. Bug occurs')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setMaxLength(500);

        const row1 = new ActionRowBuilder().addComponents(titleInput);
        const row2 = new ActionRowBuilder().addComponents(descriptionInput);
        const row3 = new ActionRowBuilder().addComponents(stepsInput);

        modal.addComponents(row1, row2, row3);

        await interaction.showModal(modal);
    },

    async handleModalSubmit(interaction) {
        const bugTitle = interaction.fields.getTextInputValue('bug_title');
        const bugDescription = interaction.fields.getTextInputValue('bug_description');
        const bugSteps = interaction.fields.getTextInputValue('bug_steps') || 'Not provided';

        try {
            // Get the bug report channel
            const reportChannel = await interaction.client.channels.fetch(BUG_REPORT_CHANNEL_ID);
            
            if (!reportChannel) {
                return await interaction.reply({
                    content: '❌ Could not find the bug report channel. Please contact an administrator.',
                    flags: MessageFlags.Ephemeral
                });
            }

            // Create bug report embed
            const bugEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle(`🐛 Bug Report: ${bugTitle}`)
                .setDescription(bugDescription)
                .addFields(
                    {
                        name: '📝 Steps to Reproduce',
                        value: bugSteps,
                        inline: false
                    },
                    {
                        name: '👤 Reported By',
                        value: `${interaction.user.tag} (${interaction.user.id})`,
                        inline: true
                    },
                    {
                        name: '📍 Server',
                        value: interaction.guild ? `${interaction.guild.name} (${interaction.guild.id})` : 'DM',
                        inline: true
                    }
                )
                .setTimestamp()
                .setFooter({ text: 'Bug Report System' });

            // Send the bug report
            await reportChannel.send({ embeds: [bugEmbed] });

            // Confirm to user
            await interaction.reply({
                content: '✅ Thank you! Your bug report has been submitted successfully.',
                flags: MessageFlags.Ephemeral
            });

        } catch (error) {
            console.error('Error sending bug report:', error);
            await interaction.reply({
                content: '❌ An error occurred while submitting your bug report. Please try again later.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
