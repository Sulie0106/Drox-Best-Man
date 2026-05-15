require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, 
    Partials, StringSelectMenuBuilder, AttachmentBuilder 
} = require("discord.js");
const ms = require("ms");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User]
});

// --- CONFIG ---
const AUTHORIZED_USER_ID = "1501597756794474497"; 
const APP_VIEWER_ID = "1453824331346874500"; 
const TRANSCRIPT_CHANNEL_ID = "1481710822471241758"; 
const MUTE_PINGS_CHANNEL_ID = "1481693716124012818";
const TICKET_CATEGORY_ID = "1491159170265907390";
const STAFF_ROLE_ID = "1487093799304954047";
const NEW_STAFF_ROLE_ID = "1489175813398986782";
const MARKET_ROLE_ID = "1500770062762639394"; 

const GEN_HUB_ID = "1481692635117785159";
const APP_HUB_ID = "1481691158148157517";
const BUILD_HUB_ID = "1481692244884066425";

// Application Questions
const APP_QUESTIONS = {
    staff: [
        "What is your IGN, Balance, and total Playtime?",
        "Do you have previous Staff experience? (List servers if possible)",
        "Why do you want to join our staff team specifically?",
        "How many giveaways can you host per week?",
        "Have you read and understood all server rules?"
    ],
    builder: [
        "What is your IGN and Playtime?",
        "Please provide links to screenshots or a portfolio of your builds.",
        "Are you familiar with WorldEdit or Schematics?",
        "How many hours a week can you dedicate to building?",
        "Can you work well within a team on large-scale projects?"
    ],
    pm: [
        "What is your IGN and server history?",
        "How many servers have you partnered with before?",
        "What is your strategy for finding high-quality partners?",
        "How many partnerships can you realistically complete per week?",
        "Are you comfortable managing a partnership log?"
    ]
};

const activeGiveaways = new Map(); 

client.once("ready", () => {
    console.log(`✅ 𝓒𝓾𝓻𝓻𝓸𝓹𝓽𝓲𝓸𝓷 𝓪𝓷𝓭 𝓭𝓸𝓻𝓪 𝓫𝓸𝓽 is online and watching over the server!`);
    client.user.setActivity("Applications & Giveaways", { type: 3 });
});

// --- AUTO-MESSAGE LOGIC ---
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.channel.id === MUTE_PINGS_CHANNEL_ID) {
        await message.channel.send("# **Mute for no pings**");
    }
});

client.on("interactionCreate", async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
            const isWhitelisted = interaction.user.id === AUTHORIZED_USER_ID;

            if (!isAdmin && !isWhitelisted) return interaction.reply({ content: "🚫 Restricted access.", ephemeral: true });

            if (interaction.commandName === "setup_hub") {
                await interaction.deferReply({ ephemeral: true });
                
                // Gen Hub
                const genChan = await client.channels.fetch(GEN_HUB_ID);
                const genMenu = new StringSelectMenuBuilder().setCustomId("ticket_gen").setPlaceholder("Select Ticket Category...").addOptions(
                    { label: "Giveaways", value: "Giveaways", emoji: "🎉" },
                    { label: "Partnership", value: "Partnership", emoji: "🤝" },
                    { label: "Support", value: "Support", emoji: "🛠️" },
                    { label: "Market", value: "Market", emoji: "🛒" }
                );
                await genChan.send({ 
                    embeds: [new EmbedBuilder().setTitle("🎫 Support Center").setDescription("Select a category below to open a ticket.").setColor("#5865F2")],
                    components: [new ActionRowBuilder().addComponents(genMenu)] 
                });

                // App Hub (3 Buttons)
                const appChan = await client.channels.fetch(APP_HUB_ID);
                const appEmbed = new EmbedBuilder()
                    .setTitle("📝 Recruitment Center")
                    .setDescription("Interested in joining the team? Select the role you wish to apply for.\n\n> **Note:** The bot will DM you to start the process.")
                    .setColor("#2ecc71");
                
                const appBtns = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("app_staff").setLabel("Staff App").setStyle(ButtonStyle.Primary).setEmoji("🛡️"),
                    new ButtonBuilder().setCustomId("app_builder").setLabel("Builder App").setStyle(ButtonStyle.Success).setEmoji("🔨"),
                    new ButtonBuilder().setCustomId("app_pm").setLabel("Partner Manager").setStyle(ButtonStyle.Secondary).setEmoji("🤝")
                );
                await appChan.send({ embeds: [appEmbed], components: [appBtns] });

                // Build Hub
                const buildChan = await client.channels.fetch(BUILD_HUB_ID);
                const buildMenu = new StringSelectMenuBuilder().setCustomId("ticket_build").setPlaceholder("Select Farm Type...").addOptions(
                    { label: "Ikea v1-v4", value: "Ikea-Farm" }, { label: "Mauschu Starter", value: "Mauschu-Starter" },
                    { label: "Mauschu v1-v4", value: "Mauschu-Mid" }, { label: "Mauschu v5-v9", value: "Mauschu-High" },
                    { label: "Fire Azure v1-v3", value: "Fire-Azure" }, { label: "Lox v1-v5", value: "Lox-Farm" }
                );
                await buildChan.send({ 
                    embeds: [new EmbedBuilder().setTitle("🏗️ Construction Services").setDescription("Select a farm schematic to request a build.").setColor("#e67e22")],
                    components: [new ActionRowBuilder().addComponents(buildMenu)] 
                });

                return interaction.editReply("✅ All hubs deployed with upgraded visuals!");
            }
        }

        // --- BUTTON HANDLERS ---
        if (interaction.isButton()) {
            // Application Trigger
            if (interaction.customId.startsWith("app_")) {
                const type = interaction.customId.split("_")[1]; // staff, builder, pm
                await interaction.reply({ content: "📩 Check your DMs to start the application!", ephemeral: true });
                return handleDMApplication(interaction.user, type, interaction.guild);
            }

            // Giveaway Join
            if (interaction.customId === "gw_join") {
                const data = activeGiveaways.get(interaction.message.id);
                if (!data) return interaction.reply({ content: "❌ This giveaway has already expired.", ephemeral: true });
                if (data.entrants.has(interaction.user.id)) return interaction.reply({ content: "⚠️ You're already in!", ephemeral: true });
                data.entrants.add(interaction.user.id);
                return interaction.reply({ content: "✅ Entry confirmed!", ephemeral: true });
            }

            // Ticket Controls
            if (interaction.customId === "close_ticket") {
                await interaction.reply("🔒 Ticket will be closed in 3 seconds...");
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
            }

            if (interaction.customId.startsWith("claim_")) {
                const isMarket = interaction.channel.name.startsWith("market-");
                const roleReq = isMarket ? MARKET_ROLE_ID : STAFF_ROLE_ID;
                if (!interaction.member.roles.cache.has(roleReq)) return interaction.reply({ content: "❌ You cannot claim this.", ephemeral: true });

                const creatorId = interaction.customId.split("_")[1];
                await interaction.channel.permissionOverwrites.set([
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: creatorId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]);
                return interaction.reply(`✨ Ticket claimed by **${interaction.user.tag}**`);
            }

            // App Decision (Accept/Deny)
            if (interaction.customId.startsWith("dec_")) {
                const [ , decision, type, targetId] = interaction.customId.split("_");
                if (interaction.user.id !== APP_VIEWER_ID && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ content: "❌ Unauthorized.", ephemeral: true });
                }

                const logChan = await client.channels.fetch(TRANSCRIPT_CHANNEL_ID);
                const isAccept = decision === "acc";
                
                const embed = new EmbedBuilder()
                    .setTitle(`App Result: ${type.toUpperCase()}`)
                    .setDescription(`**Target:** <@${targetId}>\n**Moderator:** ${interaction.user}\n**Result:** ${isAccept ? "✅ Accepted" : "❌ Denied"}`)
                    .setColor(isAccept ? "Green" : "Red")
                    .setTimestamp();

                await logChan.send({ embeds: [embed] });
                
                const target = await interaction.guild.members.fetch(targetId).catch(() => null);
                if (target) {
                    if (isAccept) await target.roles.add([STAFF_ROLE_ID, NEW_STAFF_ROLE_ID]).catch(() => {});
                    await target.send(`✨ Your **${type}** application was **${isAccept ? "ACCEPTED" : "DENIED"}**.`).catch(() => {});
                }

                await interaction.reply({ content: `✅ Processed ${isAccept ? "Acceptance" : "Denial"}.`, ephemeral: true });
                setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
            }
        }

        // --- SELECT MENUS ---
        if (interaction.isStringSelectMenu()) {
            const choice = interaction.values[0];
            await interaction.deferReply({ ephemeral: true });
            const ticket = await createTicket(interaction, choice);
            await ticket.send({ 
                content: `${interaction.user} | <@&${STAFF_ROLE_ID}>`, 
                embeds: [new EmbedBuilder().setTitle(`New Ticket: ${choice}`).setDescription("Staff will be with you shortly.").setColor("Blue")],
                components: [createTicketButtons(interaction.user.id)] 
            });
            return interaction.editReply(`✅ Ticket Opened: ${ticket}`);
        }

    } catch (e) { console.error(e); }
});

// --- DM APPLICATION HANDLER ---
async function handleDMApplication(user, type, guild) {
    try {
        const questions = APP_QUESTIONS[type];
        const answers = [];

        const startEmbed = new EmbedBuilder()
            .setTitle(`📝 ${type.toUpperCase()} Application`)
            .setDescription(`Welcome! Please answer the following **${questions.length} questions** carefully.\nType \`cancel\` at any time to stop.`)
            .setColor("Gold")
            .setFooter({ text: "You have 5 minutes per question." });

        await user.send({ embeds: [startEmbed] });

        for (const q of questions) {
            await user.send(`**Question:** ${q}`);
            const filter = m => m.author.id === user.id;
            const collected = await user.dmChannel.awaitMessages({ filter, max: 1, time: 300000, errors: ['time'] })
                .catch(() => null);

            if (!collected) {
                return user.send("⏰ Time expired. Application cancelled.");
            }

            const msg = collected.first().content;
            if (msg.toLowerCase() === "cancel") return user.send("❌ Application cancelled.");
            answers.push({ q, a: msg });
        }

        // Submit to Ticket
        const ticket = await guild.channels.create({
            name: `app-${type}-${user.username}`,
            type: ChannelType.GuildText,
            parent: TICKET_CATEGORY_ID,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: APP_VIEWER_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        const appEmbed = new EmbedBuilder()
            .setTitle(`New ${type.toUpperCase()} Application`)
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
            .setColor("Blue")
            .setTimestamp();

        answers.forEach(item => appEmbed.addFields({ name: item.q, value: item.a }));

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`dec_acc_${type}_${user.id}`).setLabel("Accept").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`dec_den_${type}_${user.id}`).setLabel("Deny").setStyle(ButtonStyle.Danger)
        );

        await ticket.send({ content: `<@${APP_VIEWER_ID}> | New Application submitted.`, embeds: [appEmbed], components: [row] });
        await user.send("✅ Thank you! Your application has been submitted and is under review.");

    } catch (err) {
        console.error(err);
        // This usually triggers if DMs are closed
    }
}

// --- HELPERS ---
async function createTicket(interaction, type) {
    const overwrites = [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
    ];
    if (type === "Market") overwrites.push({ id: MARKET_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });

    return await interaction.guild.channels.create({
        name: `${type.toLowerCase()}-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID,
        permissionOverwrites: overwrites
    });
}

function createTicketButtons(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`claim_${userId}`).setLabel("Claim").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger)
    );
}

client.login(process.env.DISCORD_TOKEN);
