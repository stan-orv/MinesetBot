require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ]
});

const THEME_COLOR = 0xf69f7e;
const TEAM_ROLE_ID = process.env.TEAM_ROLE_ID;
const APPLICATIONS_CHANNEL_ID = '1375493401222451274';

const ticketDataFile = path.join(__dirname, 'ticketData.json');
let ticketData = {};

const activeApplications = new Map();
const applicationTimeouts = new Map();

if (fs.existsSync(ticketDataFile)) {
    ticketData = JSON.parse(fs.readFileSync(ticketDataFile, 'utf-8'));
} else {
    ticketData = {
        counters: {
            'general-help': 0,
            'bug-report': 0,
            'player-report': 0,
            'server-help': 0
        },
        activeTickets: {}
    };
    saveTicketData();
}

function saveTicketData() {
    fs.writeFileSync(ticketDataFile, JSON.stringify(ticketData, null, 2));
}

function getNextTicketNumber(category) {
    ticketData.counters[category] = (ticketData.counters[category] || 0) + 1;
    saveTicketData();
    return String(ticketData.counters[category]).padStart(4, '0');
}

const commands = [
    {
        name: 'ticket-setup',
        description: 'Setup the ticket panel in this channel',
        default_member_permissions: PermissionFlagsBits.Administrator.toString()
    },
    {
        name: 'ticket-add',
        description: 'Add a user to the current ticket',
        options: [
            {
                name: 'user',
                description: 'The user to add to the ticket',
                type: 6, // USER type
                required: true
            }
        ]
    },
    {
        name: 'ticket-remove',
        description: 'Remove a user from the current ticket',
        options: [
            {
                name: 'user',
                description: 'The user to remove from the ticket',
                type: 6, // USER type
                required: true
            }
        ]
    },
    {
        name: 'ticket-close',
        description: 'Close the current ticket',
        options: [
            {
                name: 'reason',
                description: 'Reason for closing the ticket',
                type: 3, // STRING type
                required: false
            }
        ]
    },
    {
        name: 'ticket-transcript',
        description: 'Generate a transcript of the current ticket'
    },
    {
        name: 'application-setup',
        description: 'Setup the application panel in this channel',
        default_member_permissions: PermissionFlagsBits.Administrator.toString()
    }
];

client.once('ready', async () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);

    try {
        const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );

        console.log('✅ Slash commands registered');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        const { commandName } = interaction;

        if (commandName === 'ticket-setup') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ You need Administrator permissions to use this command.', ephemeral: true });
            }

            const imageEmbed = new EmbedBuilder()
                .setImage('https://i.imgur.com/E3UH40u.png')
                .setColor(THEME_COLOR);

            const embed = new EmbedBuilder()
                .setTitle('SUPPORT TICKETS')
                .setDescription('Need assistance? Select the appropriate category below to open a support ticket.')
                .addFields({
                    name: 'Categories:',
                    value: '`General Help` - Questions and general assistance\n`Bug Report` - Technical issues and bugs\n`Player Report` - Report rule violations\n`Server Help` - Server-related problems'
                })
                .setColor(THEME_COLOR)
                .setFooter({
                    text: 'Mineset  •  Support',
                    iconURL: 'https://i.imgur.com/K0Lw3oU.png'
                });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket-general-help')
                        .setLabel('General Help')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('ticket-bug-report')
                        .setLabel('Bug Report')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('ticket-player-report')
                        .setLabel('Player Report')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('ticket-server-help')
                        .setLabel('Server Help')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.channel.send({ embeds: [imageEmbed, embed], components: [row] });
            await interaction.reply({ content: 'Ticket panel has been set up successfully.', ephemeral: true });
        }

        if (commandName === 'ticket-add') {
            if (!ticketData.activeTickets[interaction.channel.id]) {
                return interaction.reply({ content: '❌ This command can only be used in ticket channels.', ephemeral: true });
            }

            const user = interaction.options.getUser('user');
            try {
                await interaction.channel.permissionOverwrites.create(user.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });

                const embed = new EmbedBuilder()
                    .setDescription(`${user} has been added to the ticket.`)
                    .setColor(THEME_COLOR)
                    .setFooter({
                        text: 'Mineset  •  Support',
                        iconURL: 'https://i.imgur.com/K0Lw3oU.png'
                    });

                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                await interaction.reply({ content: '❌ Failed to add user to the ticket.', ephemeral: true });
            }
        }

        if (commandName === 'ticket-remove') {
            if (!ticketData.activeTickets[interaction.channel.id]) {
                return interaction.reply({ content: '❌ This command can only be used in ticket channels.', ephemeral: true });
            }

            const user = interaction.options.getUser('user');
            try {
                await interaction.channel.permissionOverwrites.delete(user.id);

                const embed = new EmbedBuilder()
                    .setDescription(`${user} has been removed from the ticket.`)
                    .setColor(THEME_COLOR)
                    .setFooter({
                        text: 'Mineset  •  Support',
                        iconURL: 'https://i.imgur.com/K0Lw3oU.png'
                    });

                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                await interaction.reply({ content: '❌ Failed to remove user from the ticket.', ephemeral: true });
            }
        }

        if (commandName === 'ticket-close') {
            if (!ticketData.activeTickets[interaction.channel.id]) {
                return interaction.reply({ content: '❌ This command can only be used in ticket channels.', ephemeral: true });
            }

            const reason = interaction.options.getString('reason') || 'No reason provided';

            const confirmEmbed = new EmbedBuilder()
                .setTitle('Confirm Closure')
                .setDescription(`Are you sure you want to close this ticket?\n\n**Reason:** ${reason}`)
                .setColor(0xff6b6b);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm-close')
                        .setLabel('Confirm Close')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('cancel-close')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.reply({ embeds: [confirmEmbed], components: [row] });
        }


        if (commandName === 'ticket-transcript') {
            if (!ticketData.activeTickets[interaction.channel.id]) {
                return interaction.reply({ content: '❌ This command can only be used in ticket channels.', ephemeral: true });
            }

            await interaction.deferReply();

            try {
                const messages = await interaction.channel.messages.fetch({ limit: 100 });
                const transcript = messages.reverse().map(m =>
                    `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}`
                ).join('\n');

                const buffer = Buffer.from(transcript, 'utf-8');

                await interaction.editReply({
                    content: 'Ticket transcript generated:',
                    files: [{
                        attachment: buffer,
                        name: `transcript-${interaction.channel.name}.txt`
                    }]
                });
            } catch (error) {
                await interaction.editReply({ content: '❌ Failed to generate transcript.' });
            }
        }

        if (commandName === 'application-setup') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: '❌ You need Administrator permissions to use this command.', ephemeral: true });
            }

            const imageEmbed = new EmbedBuilder()
                .setImage('https://i.imgur.com/V4MY9qO.png')
                .setColor(THEME_COLOR);

            const embed = new EmbedBuilder()
                .setTitle('APPLICATIONS')
                .setDescription('We are currently looking for experienced **builders** to join our team at Mineset.')
                .addFields(
                    {
                        name: 'Requirements:',
                        value: '`Age` -  14+\n`Experience` - Must have past builds to show\n`Knowledge` - Must be familiar with Axiom'
                    },
                    {
                        name: 'Apply:',
                        value: 'To apply, press the button below.'
                    }
                )
                .setColor(THEME_COLOR)
                .setFooter({
                    text: 'Mineset  •  Applications',
                    iconURL: 'https://i.imgur.com/K0Lw3oU.png'
                });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('start-application')
                        .setLabel('Apply Now')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.channel.send({ embeds: [imageEmbed, embed], components: [row] });
            await interaction.reply({ content: 'Application panel has been set up successfully.', ephemeral: true });
        }
    }

    if (interaction.isButton()) {
        if (interaction.customId.startsWith('ticket-')) {
            const categoryMap = {
                'ticket-general-help': 'general-help',
                'ticket-bug-report': 'bug-report',
                'ticket-player-report': 'player-report',
                'ticket-server-help': 'server-help'
            };

            const category = categoryMap[interaction.customId];

            if (category) {
                const existingTicket = Object.values(ticketData.activeTickets).find(
                    ticket => ticket.userId === interaction.user.id && ticket.open
                );

                if (existingTicket) {
                    return interaction.reply({
                        content: `❌ You already have an open ticket: <#${existingTicket.channelId}>`,
                        ephemeral: true
                    });
                }

                await interaction.deferReply({ ephemeral: true });

                const ticketNumber = getNextTicketNumber(category);
                const channelName = `${category}-${ticketNumber}`;

                try {
                    const ticketChannel = await interaction.guild.channels.create({
                        name: channelName,
                        type: ChannelType.GuildText,
                        parent: '1385706437707305160',
                        permissionOverwrites: [
                            {
                                id: interaction.guild.id,
                                deny: [PermissionFlagsBits.ViewChannel]
                            },
                            {
                                id: interaction.user.id,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory
                                ]
                            },
                            {
                                id: TEAM_ROLE_ID,
                                allow: [
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory,
                                    PermissionFlagsBits.ManageMessages
                                ]
                            }
                        ]
                    });

                    ticketData.activeTickets[ticketChannel.id] = {
                        channelId: ticketChannel.id,
                        userId: interaction.user.id,
                        category: category,
                        ticketNumber: ticketNumber,
                        open: true,
                        createdAt: new Date().toISOString()
                    };
                    saveTicketData();

                    const categoryTitles = {
                        'general-help': 'General Help',
                        'bug-report': 'Bug Report',
                        'player-report': 'Player Report',
                        'server-help': 'Server Help'
                    };

                    const welcomeEmbed = new EmbedBuilder()
                        .setTitle(`Welcome ${interaction.user.username}`)
                        .setDescription(`Please describe your issue below and a staff member will assist you.`)
                        .addFields(
                            { name: 'Ticket', value: `\`#${ticketNumber}\``, inline: true },
                            { name: 'Category', value: `\`${categoryTitles[category]}\``, inline: true },
                            { name: 'Created', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                        )
                        .setColor(THEME_COLOR)
                        .setFooter({
                            text: 'Mineset  •  Support',
                            iconURL: 'https://i.imgur.com/K0Lw3oU.png'
                        });

                    const controlRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('close-ticket')
                                .setLabel('Close')
                                .setStyle(ButtonStyle.Danger),
                            new ButtonBuilder()
                                .setCustomId('claim-ticket')
                                .setLabel('Claim')
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId('ticket-settings')
                                .setLabel('Settings')
                                .setStyle(ButtonStyle.Secondary)
                        );

                    await ticketChannel.send({
                        content: `<@&${TEAM_ROLE_ID}>`,
                        embeds: [welcomeEmbed],
                        components: [controlRow]
                    });

                    await interaction.editReply({
                        content: `Your ticket has been created: ${ticketChannel}`,
                        ephemeral: true
                    });

                } catch (error) {
                    console.error('Error creating ticket:', error);
                    await interaction.editReply({
                        content: '❌ Failed to create ticket. Please try again later.',
                        ephemeral: true
                    });
                }
            }
        }

        if (interaction.customId === 'close-ticket') {
            if (!ticketData.activeTickets[interaction.channel.id]) {
                return interaction.reply({ content: '❌ This is not a ticket channel.', ephemeral: true });
            }

            const confirmEmbed = new EmbedBuilder()
                .setTitle('Confirm Closure')
                .setDescription('Are you sure you want to close this ticket?')
                .setColor(0xff6b6b);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm-close')
                        .setLabel('Confirm')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('cancel-close')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });
        }

        if (interaction.customId === 'confirm-close') {
            const ticketInfo = ticketData.activeTickets[interaction.channel.id];

            if (ticketInfo) {
                ticketInfo.open = false;
                ticketInfo.closedAt = new Date().toISOString();
                ticketInfo.closedBy = interaction.user.id;
                saveTicketData();

                const closeEmbed = new EmbedBuilder()
                    .setTitle('Ticket Closed')
                    .setDescription(`This ticket has been closed by ${interaction.user}`)
                    .addFields(
                        { name: 'Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
                    )
                    .setColor(0xff6b6b);

                await interaction.update({ embeds: [closeEmbed], components: [] });

                setTimeout(async () => {
                    try {
                        await interaction.channel.delete();
                        delete ticketData.activeTickets[interaction.channel.id];
                        saveTicketData();
                    } catch (error) {
                        console.error('Error deleting channel:', error);
                    }
                }, 5000);
            }
        }

        if (interaction.customId === 'cancel-close') {
            await interaction.update({ content: '❌ Ticket closure cancelled.', embeds: [], components: [] });
        }

        if (interaction.customId === 'claim-ticket') {
            if (!ticketData.activeTickets[interaction.channel.id]) {
                return interaction.reply({ content: '❌ This is not a ticket channel.', ephemeral: true });
            }

            const hasTeamRole = interaction.member.roles.cache.has(TEAM_ROLE_ID);
            if (!hasTeamRole) {
                return interaction.reply({ content: '❌ Only team members can claim tickets.', ephemeral: true });
            }

            const claimEmbed = new EmbedBuilder()
                .setDescription(`This ticket has been claimed by ${interaction.user}`)
                .setColor(THEME_COLOR)
                .setFooter({
                    text: 'Mineset  •  Support',
                    iconURL: 'https://i.imgur.com/K0Lw3oU.png'
                });

            await interaction.reply({ embeds: [claimEmbed] });

            ticketData.activeTickets[interaction.channel.id].claimedBy = interaction.user.id;
            saveTicketData();
        }

        if (interaction.customId === 'ticket-settings') {
            if (!ticketData.activeTickets[interaction.channel.id]) {
                return interaction.reply({ content: '❌ This is not a ticket channel.', ephemeral: true });
            }

            const settingsEmbed = new EmbedBuilder()
                .setTitle('Ticket Settings')
                .setDescription('Select an option from the menu below:')
                .setColor(THEME_COLOR)
                .setFooter({
                    text: 'Mineset  •  Support',
                    iconURL: 'https://i.imgur.com/K0Lw3oU.png'
                });

            const menu = new StringSelectMenuBuilder()
                .setCustomId('ticket-settings-menu')
                .setPlaceholder('Choose an action')
                .addOptions([
                    {
                        label: 'Add User',
                        description: 'Add a user to this ticket',
                        value: 'add-user'
                    },
                    {
                        label: 'Remove User',
                        description: 'Remove a user from this ticket',
                        value: 'remove-user'
                    },
                    {
                        label: 'Priority Level',
                        description: 'Set ticket priority',
                        value: 'priority'
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(menu);

            await interaction.reply({ embeds: [settingsEmbed], components: [row], ephemeral: true });
        }
    }

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticket-settings-menu') {
            const selected = interaction.values[0];

            if (selected === 'add-user') {
                await interaction.reply({
                    content: 'Please use the `/ticket-add` command to add a user to this ticket.',
                    ephemeral: true
                });
                return;
            }

            if (selected === 'remove-user') {
                await interaction.reply({
                    content: 'Please use the `/ticket-remove` command to remove a user from this ticket.',
                    ephemeral: true
                });
                return;
            }

            if (selected === 'priority') {
                if (!ticketData.activeTickets[interaction.channel.id]) {
                    return interaction.reply({ content: '❌ This is not a ticket channel.', ephemeral: true });
                }

                const priorityEmbed = new EmbedBuilder()
                    .setTitle('Set Priority Level')
                    .setDescription('Select the priority level for this ticket:')
                    .setColor(THEME_COLOR)
                    .setFooter({
                        text: 'Mineset  •  Support',
                        iconURL: 'https://i.imgur.com/K0Lw3oU.png'
                    });

                const priorityRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('priority-low')
                            .setLabel('Low')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('priority-medium')
                            .setLabel('Medium')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('priority-high')
                            .setLabel('High')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId('priority-urgent')
                            .setLabel('Urgent')
                            .setStyle(ButtonStyle.Danger)
                    );

                await interaction.update({ embeds: [priorityEmbed], components: [priorityRow] });
            }
        }
    }

    if (interaction.isButton()) {
        if (interaction.customId.startsWith('priority-')) {
            if (!ticketData.activeTickets[interaction.channel.id]) {
                return interaction.reply({ content: '❌ This is not a ticket channel.', ephemeral: true });
            }

            const priority = interaction.customId.replace('priority-', '');
            const priorityPositions = {
                'urgent': 0,
                'high': 10,
                'medium': 20,
                'low': 30
            };

            try {
                await interaction.channel.setPosition(priorityPositions[priority]);

                ticketData.activeTickets[interaction.channel.id].priority = priority;
                saveTicketData();

                const priorityLabels = {
                    'urgent': 'Urgent',
                    'high': 'High',
                    'medium': 'Medium',
                    'low': 'Low'
                };

                const embed = new EmbedBuilder()
                    .setDescription(`Ticket priority set to **${priorityLabels[priority]}**`)
                    .setColor(THEME_COLOR)
                    .setFooter({
                        text: 'Mineset  •  Support',
                        iconURL: 'https://i.imgur.com/K0Lw3oU.png'
                    });

                await interaction.update({ embeds: [embed], components: [] });
            } catch (error) {
                await interaction.reply({ content: '❌ Failed to update ticket priority.', ephemeral: true });
            }
        }

        if (interaction.customId === 'start-application') {
            if (activeApplications.has(interaction.user.id)) {
                return interaction.reply({
                    content: '❌ You already have an active application in progress. Please complete it first.',
                    ephemeral: true
                });
            }

            try {
                await interaction.deferReply({ ephemeral: true });

                const welcomeEmbed = new EmbedBuilder()
                    .setTitle('Builder Application')
                    .setDescription('Thank you for your interest in joining our build team!\n\nI will guide you through the application process. Please answer each question honestly and thoroughly.')
                    .setColor(THEME_COLOR)
                    .setFooter({
                        text: 'Mineset  •  Applications',
                        iconURL: 'https://i.imgur.com/K0Lw3oU.png'
                    });

                const dmChannel = await interaction.user.createDM();
                await dmChannel.send({ embeds: [welcomeEmbed] });

                await interaction.editReply({
                    content: 'Application started! Please check your DMs to continue the application process.',
                    ephemeral: true
                });

                const applicationData = {
                    userId: interaction.user.id,
                    username: interaction.user.username,
                    startedAt: new Date().toISOString(),
                    currentQuestion: 0,
                    answers: [],
                    attachments: [],
                    inReview: false
                };

                activeApplications.set(interaction.user.id, applicationData);

                // Set 30-minute timeout
                const timeout = setTimeout(async () => {
                    if (activeApplications.has(interaction.user.id)) {
                        const timeoutEmbed = new EmbedBuilder()
                            .setTitle('Application Timed Out')
                            .setDescription('Your application has been automatically cancelled due to 30 minutes of inactivity.\n\nYou can start a new application at any time.')
                            .setColor(0xff6b6b)
                            .setFooter({
                                text: 'Mineset  •  Applications',
                                iconURL: 'https://i.imgur.com/K0Lw3oU.png'
                            });

                        try {
                            await dmChannel.send({ embeds: [timeoutEmbed] });
                        } catch (error) {
                            console.log('Could not send timeout message to user');
                        }

                        activeApplications.delete(interaction.user.id);
                        applicationTimeouts.delete(interaction.user.id);
                    }
                }, 30 * 60 * 1000); // 30 minutes

                applicationTimeouts.set(interaction.user.id, timeout);

                const questions = [
                    'What is your age?',
                    'What is your Minecraft username?',
                    'How long have you been building in Minecraft?',
                    'What building styles are you most comfortable with? (Medieval, Modern, Fantasy, etc.)',
                    'Are you familiar with Axiom? If yes, how experienced are you with it?',
                    'What timezone are you in and what hours are you typically available?',
                    'Why do you want to join the Mineset build team?',
                    'Please provide links to your portfolio or previous builds (Imgur, Planet Minecraft, etc.)',
                    'Please upload screenshots of your best builds (you can send multiple images)'
                ];

                const askQuestion = async (questionIndex) => {
                    if (questionIndex < questions.length - 1) {
                        const questionEmbed = new EmbedBuilder()
                            .setTitle(`Question ${questionIndex + 1}/${questions.length}`)
                            .setDescription(questions[questionIndex])
                            .setColor(THEME_COLOR)
                            .setFooter({
                                text: 'Type your answer below',
                                iconURL: 'https://i.imgur.com/K0Lw3oU.png'
                            });

                        await dmChannel.send({ embeds: [questionEmbed] });
                    } else {
                        const questionEmbed = new EmbedBuilder()
                            .setTitle(`Question ${questionIndex + 1}/${questions.length}`)
                            .setDescription(questions[questionIndex])
                            .setColor(THEME_COLOR)
                            .setFooter({
                                text: 'Send your images below. When done, type "done" to review your application',
                                iconURL: 'https://i.imgur.com/K0Lw3oU.png'
                            });

                        await dmChannel.send({ embeds: [questionEmbed] });
                    }
                };

                await askQuestion(0);

            } catch (error) {
                console.error('Error starting application:', error);

                if (error.code === 50007) {
                    await interaction.editReply({
                        content: '❌ I cannot send you a DM. Please enable DMs from server members in your privacy settings and try again.',
                        ephemeral: true
                    });
                } else {
                    await interaction.editReply({
                        content: '❌ An error occurred while starting your application. Please try again later.',
                        ephemeral: true
                    });
                }

                activeApplications.delete(interaction.user.id);
            }
        }

        if (interaction.customId === 'submit-application') {
            if (!interaction.channel.isDMBased()) return;

            const applicationData = activeApplications.get(interaction.user.id);
            if (!applicationData) return;

            await interaction.deferUpdate();
            await submitApplication(interaction, applicationData);
        }

        if (interaction.customId === 'edit-application') {
            if (!interaction.channel.isDMBased()) return;

            const applicationData = activeApplications.get(interaction.user.id);
            if (!applicationData) return;

            const selectEmbed = new EmbedBuilder()
                .setTitle('Edit Application')
                .setDescription('Which question would you like to edit? Type the question number (1-8).')
                .setColor(THEME_COLOR)
                .setFooter({
                    text: 'Type "cancel" to go back',
                    iconURL: 'https://i.imgur.com/K0Lw3oU.png'
                });

            const menu = new StringSelectMenuBuilder()
                .setCustomId('select-edit-question')
                .setPlaceholder('Select a question to edit')
                .addOptions(
                    applicationData.answers.map((qa, index) => ({
                        label: `Question ${index + 1}`,
                        description: qa.question.substring(0, 50) + '...',
                        value: String(index)
                    }))
                );

            const row = new ActionRowBuilder().addComponents(menu);

            await interaction.update({ embeds: [selectEmbed], components: [row] });
        }

        if (interaction.customId === 'cancel-application') {
            if (!interaction.channel.isDMBased()) return;

            const applicationData = activeApplications.get(interaction.user.id);
            if (!applicationData) return;

            const cancelEmbed = new EmbedBuilder()
                .setTitle('Application Cancelled')
                .setDescription('Your application has been cancelled. You can start a new application at any time by clicking the Apply button in the server.')
                .setColor(0xff6b6b)
                .setFooter({
                    text: 'Mineset  •  Applications',
                    iconURL: 'https://i.imgur.com/K0Lw3oU.png'
                });

            await interaction.update({ embeds: [cancelEmbed], components: [] });
            activeApplications.delete(interaction.user.id);

            // Clear timeout
            if (applicationTimeouts.has(interaction.user.id)) {
                clearTimeout(applicationTimeouts.get(interaction.user.id));
                applicationTimeouts.delete(interaction.user.id);
            }
        }
    }

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'select-edit-question') {
            if (!interaction.channel.isDMBased()) return;

            const applicationData = activeApplications.get(interaction.user.id);
            if (!applicationData) return;

            const questionIndex = parseInt(interaction.values[0]);
            applicationData.editingQuestion = questionIndex;

            const questions = [
                'What is your age?',
                'What is your Minecraft username?',
                'How long have you been building in Minecraft?',
                'What building styles are you most comfortable with? (Medieval, Modern, Fantasy, etc.)',
                'Are you familiar with Axiom? If yes, how experienced are you with it?',
                'What timezone are you in and what hours are you typically available?',
                'Why do you want to join the Mineset build team?',
                'Please provide links to your portfolio or previous builds (Imgur, Planet Minecraft, etc.)'
            ];

            const editEmbed = new EmbedBuilder()
                .setTitle(`Edit Answer - Question ${questionIndex + 1}`)
                .setDescription(questions[questionIndex])
                .addFields({
                    name: 'Current Answer',
                    value: applicationData.answers[questionIndex].answer || 'No answer provided'
                })
                .setColor(THEME_COLOR)
                .setFooter({
                    text: 'Type your new answer below',
                    iconURL: 'https://i.imgur.com/K0Lw3oU.png'
                });

            await interaction.update({ embeds: [editEmbed], components: [] });
        }
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.guild) return;

    const applicationData = activeApplications.get(message.author.id);
    if (!applicationData) return;

    const questions = [
        'What is your age?',
        'What is your Minecraft username?',
        'How long have you been building in Minecraft?',
        'What building styles are you most comfortable with? (Medieval, Modern, Fantasy, etc.)',
        'Are you familiar with Axiom? If yes, how experienced are you with it?',
        'What timezone are you in and what hours are you typically available?',
        'Why do you want to join the Mineset build team?',
        'Please provide links to your portfolio or previous builds (Imgur, Planet Minecraft, etc.)',
        'Please upload screenshots of your best builds (you can send multiple images)'
    ];

    // Reset timeout on any activity
    if (applicationTimeouts.has(message.author.id)) {
        clearTimeout(applicationTimeouts.get(message.author.id));
        const timeout = setTimeout(async () => {
            if (activeApplications.has(message.author.id)) {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('Application Timed Out')
                    .setDescription('Your application has been automatically cancelled due to 30 minutes of inactivity.\n\nYou can start a new application at any time.')
                    .setColor(0xff6b6b)
                    .setFooter({
                        text: 'Mineset  •  Applications',
                        iconURL: 'https://i.imgur.com/K0Lw3oU.png'
                    });

                try {
                    await message.channel.send({ embeds: [timeoutEmbed] });
                } catch (error) {
                    console.log('Could not send timeout message to user');
                }

                activeApplications.delete(message.author.id);
                applicationTimeouts.delete(message.author.id);
            }
        }, 30 * 60 * 1000);
        applicationTimeouts.set(message.author.id, timeout);
    }

    // Check if editing FIRST, before anything else
    if (applicationData.editingQuestion !== undefined) {
        applicationData.answers[applicationData.editingQuestion] = {
            question: questions[applicationData.editingQuestion],
            answer: message.content
        };

        delete applicationData.editingQuestion;
        applicationData.inReview = true;
        await showApplicationReview(message, applicationData);
        return;
    }

    // If in review state, ignore messages unless editing
    if (applicationData.inReview) {
        return;
    }

    // Handle last question (images)
    if (applicationData.currentQuestion === questions.length - 1) {
        if (message.content.toLowerCase() === 'done') {
            applicationData.inReview = true;
            await showApplicationReview(message, applicationData);
            return;
        }

        if (message.attachments.size > 0) {
            message.attachments.forEach(attachment => {
                applicationData.attachments.push(attachment.url);
            });

            const confirmEmbed = new EmbedBuilder()
                .setDescription(`${message.attachments.size} image(s) added to your application.\n\nSend more images or type "done" to review your application.`)
                .setColor(THEME_COLOR)
                .setFooter({
                    text: 'Mineset  •  Applications',
                    iconURL: 'https://i.imgur.com/K0Lw3oU.png'
                });

            await message.channel.send({ embeds: [confirmEmbed] });
            return;
        }

        return;
    }

    // Normal question answering
    applicationData.answers.push({
        question: questions[applicationData.currentQuestion],
        answer: message.content
    });

    applicationData.currentQuestion++;

    if (applicationData.currentQuestion < questions.length) {
        const nextQuestionEmbed = new EmbedBuilder()
            .setTitle(`Question ${applicationData.currentQuestion + 1}/${questions.length}`)
            .setDescription(questions[applicationData.currentQuestion])
            .setColor(THEME_COLOR)
            .setFooter({
                text: applicationData.currentQuestion === questions.length - 1
                    ? 'Send your images below.'
                    : 'Type your answer below',
                iconURL: 'https://i.imgur.com/K0Lw3oU.png'
            });

        await message.channel.send({ embeds: [nextQuestionEmbed] });
    }
});

async function showApplicationReview(message, applicationData) {
    const questions = [
        'What is your age?',
        'What is your Minecraft username?',
        'How long have you been building in Minecraft?',
        'What building styles are you most comfortable with? (Medieval, Modern, Fantasy, etc.)',
        'Are you familiar with Axiom? If yes, how experienced are you with it?',
        'What timezone are you in and what hours are you typically available?',
        'Why do you want to join the Mineset build team?',
        'Please provide links to your portfolio or previous builds (Imgur, Planet Minecraft, etc.)',
        'Please upload screenshots of your best builds (you can send multiple images)'
    ];

    const reviewEmbed = new EmbedBuilder()
        .setTitle('Review Your Application')
        .setDescription('Please review your answers below. You can edit any answer or submit your application.')
        .setColor(THEME_COLOR)
        .setFooter({
            text: 'Mineset  •  Applications',
            iconURL: 'https://i.imgur.com/K0Lw3oU.png'
        });

    applicationData.answers.forEach((qa, index) => {
        const value = qa.answer.length > 100 ? qa.answer.substring(0, 97) + '...' : qa.answer;
        reviewEmbed.addFields({
            name: `${index + 1}. ${qa.question}`,
            value: value || 'No answer provided',
            inline: false
        });
    });

    if (applicationData.attachments.length > 0) {
        reviewEmbed.addFields({
            name: '9. Build Screenshots',
            value: `${applicationData.attachments.length} image(s) attached`,
            inline: false
        });
    }

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('submit-application')
                .setLabel('Submit Application')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('edit-application')
                .setLabel('Edit Answers')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('cancel-application')
                .setLabel('Cancel Application')
                .setStyle(ButtonStyle.Danger)
        );

    const reviewMessage = await message.channel.send({ embeds: [reviewEmbed], components: [row1] });
    applicationData.reviewMessageId = reviewMessage.id;
}

async function submitApplication(interaction, applicationData) {
    try {
        const guild = client.guilds.cache.first();
        const applicationsChannel = guild.channels.cache.get(APPLICATIONS_CHANNEL_ID);

        if (!applicationsChannel) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('Error')
                .setDescription('Applications channel not found. Please contact an administrator.')
                .setColor(0xff6b6b)
                .setFooter({
                    text: 'Mineset  •  Applications',
                    iconURL: 'https://i.imgur.com/K0Lw3oU.png'
                });

            if (interaction.message) {
                await interaction.message.edit({ embeds: [errorEmbed], components: [] });
            } else {
                await interaction.channel.send({ embeds: [errorEmbed] });
            }
            activeApplications.delete(interaction.user.id);
            return;
        }

        const applicationEmbed = new EmbedBuilder()
            .setTitle('New Builder Application')
            .setDescription(`**Applicant:** ${applicationData.username} (<@${applicationData.userId}>)`)
            .setColor(THEME_COLOR)
            .setTimestamp()
            .setFooter({
                text: 'Mineset  •  Applications',
                iconURL: 'https://i.imgur.com/K0Lw3oU.png'
            });

        applicationData.answers.forEach((qa, index) => {
            const value = qa.answer.length > 1024 ? qa.answer.substring(0, 1021) + '...' : qa.answer;
            applicationEmbed.addFields({
                name: qa.question,
                value: value || 'No answer provided',
                inline: false
            });
        });

        if (applicationData.attachments.length > 0) {
            applicationEmbed.addFields({
                name: 'Build Screenshots',
                value: `${applicationData.attachments.length} image(s) attached`,
                inline: false
            });
        }

        const reviewRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`accept-application-${applicationData.userId}`)
                    .setLabel('Accept')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`deny-application-${applicationData.userId}`)
                    .setLabel('Deny')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`interview-application-${applicationData.userId}`)
                    .setLabel('Schedule Interview')
                    .setStyle(ButtonStyle.Primary)
            );

        const appMessage = await applicationsChannel.send({
            embeds: [applicationEmbed],
            components: [reviewRow]
        });

        if (applicationData.attachments.length > 0) {
            const imageEmbeds = applicationData.attachments.slice(0, 4).map(url =>
                new EmbedBuilder()
                    .setImage(url)
                    .setColor(THEME_COLOR)
            );

            await applicationsChannel.send({ embeds: imageEmbeds });
        }

        const successEmbed = new EmbedBuilder()
            .setTitle('Application Submitted!')
            .setDescription('Your application has been successfully submitted. Our team will review it and get back to you soon.\n\nThank you for your interest in joining Mineset!')
            .setColor(THEME_COLOR)
            .setFooter({
                text: 'Mineset  •  Applications',
                iconURL: 'https://i.imgur.com/K0Lw3oU.png'
            });

        if (interaction.message) {
            await interaction.message.edit({ embeds: [successEmbed], components: [] });
        } else {
            await interaction.channel.send({ embeds: [successEmbed] });
        }
        activeApplications.delete(interaction.user.id);

        // Clear timeout
        if (applicationTimeouts.has(interaction.user.id)) {
            clearTimeout(applicationTimeouts.get(interaction.user.id));
            applicationTimeouts.delete(interaction.user.id);
        }

    } catch (error) {
        console.error('Error submitting application:', error);

        const errorEmbed = new EmbedBuilder()
            .setTitle('Error')
            .setDescription('An error occurred while submitting your application. Please try again later.')
            .setColor(0xff6b6b)
            .setFooter({
                text: 'Mineset  •  Applications',
                iconURL: 'https://i.imgur.com/K0Lw3oU.png'
            });

        if (interaction.message) {
            await interaction.message.edit({ embeds: [errorEmbed], components: [] });
        } else {
            await interaction.channel.send({ embeds: [errorEmbed] });
        }
        activeApplications.delete(interaction.user.id);
    }
}

client.login(process.env.BOT_TOKEN);