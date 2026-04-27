require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits, 
    Partials 
} = require("discord.js");
const ms = require("ms");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

// 🛠️ --- CONFIGURATION (VUL DEZE IN!) ---
const OWNER_ID = "1453824331346874500";
const DIGGING_CHANNEL_ID = "1497905935656554506";
const BUILDING_CHANNEL_ID = "1497906110219288646";
const APP_HUB_CHANNEL_ID = "1498193257212022835";
const APP_LOG_CHANNEL_ID = "1496241235810189453";
const TICKET_CATEGORY_ID = "1496950777275486429"; // De ID van de CATEGORIE (rechtermuisknop op categorie -> Copy ID)
const STAFF_ROLE_ID = "1496951778967683072";     // De ID van de STAFF ROL

// Standaard vragen voor sollicitaties
let appQuestions = ["Why do you want to join Drox?", "What is your experience?", "How active are you?"];
const giveaways = new Map();

client.once("ready", () => {
    console.log(`✅ Drox Services Bot is online as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {

    // --- 1. SETUP HUB ---
    if (interaction.isChatInputCommand() && interaction.commandName === "setup_hub") {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: "Owner only.", ephemeral: true });
        await interaction.deferReply({ ephemeral: true });

        try {
            // Digging Hub
            const digEmbed = new EmbedBuilder()
                .setTitle("🪏 Drox Digging Services")
                .setDescription("Our professional digging team is ready for your project.")
                .addFields(
                    { name: "💰 Rates", value: "• $900 per block digged\n• $850 per block placed in the air (Sky bases)\n• 7.5m for good cords" },
                    { name: "⚠️ Policy", value: "You pay **before** we do the dig out." }
                )
                .setColor("#964B00");
            const digRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("open_digging_modal").setLabel("Request builder").setStyle(ButtonStyle.Primary).setEmoji("⛏️")
            );
            const digChan = await client.channels.fetch(DIGGING_CHANNEL_ID);
            await digChan.send({ embeds: [digEmbed], components: [digRow] });

            // Building Hub
            const buildEmbed = new EmbedBuilder()
                .setTitle("🧱 Drox Building Services")
                .setDescription("Select a farm from the dropdown below to request a builder.")
                .setColor("#FFD700");

            const buildRow = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("select_build_service")
                    .setPlaceholder("Choose a farm or service...")
                    .addOptions([
                        { label: "Ikea v1 (264 smokers)", description: "55m", value: "Ikea v1 (55m)" },
                        { label: "Ikea v2 (512 smokers)", description: "90m", value: "Ikea v2 (90m)" },
                        { label: "Ikea v3 (1024 smokers)", description: "145m", value: "Ikea v3 (145m)" },
                        { label: "Ikea v4 (2048 smokers)", description: "200m", value: "Ikea v4 (200m)" },
                        { label: "Beginner farm", description: "25m", value: "Beginner farm (25m)" },
                        { label: "Intermidiate farm", description: "70m", value: "Intermidiate farm (70m)" },
                        { label: "Advanced farm", description: "85m", value: "Advanced farm (85m)" },
                        { label: "Mauschu v1", description: "100m", value: "Mauschu v1 (100m)" },
                        { label: "Mauschu v2", description: "155m", value: "Mauschu v2 (155m)" },
                        { label: "Mauschu v3", description: "205m", value: "Mauschu v3 (205m)" },
                        { label: "Mauschu v4", description: "255m", value: "Mauschu v4 (255m)" },
                        { label: "Mauschu v5", description: "300m", value: "Mauschu v5 (300m)" },
                        { label: "Mauschu v6", description: "370m", value: "Mauschu v6 (370m)" },
                        { label: "Mauschu v7", description: "500m", value: "Mauschu v7 (500m)" },
                        { label: "Mauschu v8", description: "575m", value: "Mauschu v8 (575m)" },
                        { label: "Mauschu v9", description: "650m", value: "Mauschu v9 (650m)" },
                        { label: "Fire Azure v1", description: "180m", value: "Fire Azure v1 (180m)" },
                        { label: "Fire Azure v2", description: "240m", value: "Fire Azure v2 (240m)" },
                        { label: "Fire Azure v3", description: "650m", value: "Fire Azure v3 (650m)" },
                        { label: "Lox v1", description: "50m", value: "Lox v1 (50m)" },
                        { label: "Lox v2", description: "85m", value: "Lox v2 (85m)" },
                        { label: "Lox v3", description: "135m", value: "Lox v3 (135m)" },
                        { label: "Lox v4", description: "170m", value: "Lox v4 (170m)" },
                        { label: "Lox v5", description: "230m", value: "Lox v5 (230m)" },
                        { label: "Mcds 240 smoker farm", description: "75m", value: "Mcds farm (75m)" }
                    ])
            );
            const buildChan = await client.channels.fetch(BUILDING_CHANNEL_ID);
            await buildChan.send({ embeds: [buildEmbed], components: [buildRow] });

            // App Hub
            const appEmbed = new EmbedBuilder().setTitle("📝 Drox Staff Applications").setDescription("Apply to join the Drox team! Check your DMs after clicking.").setColor("Green");
            const appRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("start_app").setLabel("Apply Now").setStyle(ButtonStyle.Success));
            const appChan = await client.channels.fetch(APP_HUB_CHANNEL_ID);
            await appChan.send({ embeds: [appEmbed], components: [appRow] });

            await interaction.editReply("✅ All hubs have been spawned!");
        } catch (e) {
            console.error(e);
            await interaction.editReply("❌ Error. Check channel IDs and Bot Permissions.");
        }
    }

    // --- 2. TICKET CREATOR FUNCTION ---
    async function createTicket(member, type, detail) {
        try {
            const ticketChannel = await interaction.guild.channels.create({
                name: `${member.user.username}-pending-builder`,
                type: ChannelType.GuildText,
                parent: TICKET_CATEGORY_ID,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            const ticketRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("claim_ticket").setLabel("Claim").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger)
            );

            const content = type === "digging" 
                ? `<@${member.id}>\n\nYou want **${detail}** digged out\n\nAnd builder is digging this out soon!`
                : `<@${member.id}>\n\nYou want the **${detail}**\n\nAn builder is coming soon!`;

            await ticketChannel.send({ content: content, components: [ticketRow] });
            return ticketChannel;
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    // --- 3. MODAL & SELECT HANDLERS ---
    if (interaction.isButton() && interaction.customId === "open_digging_modal") {
        const modal = new ModalBuilder().setCustomId("modal_digging").setTitle("Digging Request");
        const blockInput = new TextInputBuilder().setCustomId("dig_count").setLabel("How many blocks should we dig?").setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(blockInput));
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === "modal_digging") {
        await interaction.deferReply({ ephemeral: true });
        const count = interaction.fields.getTextInputValue("dig_count");
        const ticket = await createTicket(interaction.member, "digging", count);
        if (ticket) await interaction.editReply(`✅ Ticket created: ${ticket}`);
        else await interaction.editReply("❌ Error creating ticket. Check Category ID.");
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "select_build_service") {
        await interaction.deferReply({ ephemeral: true });
        const selected = interaction.values[0];
        const ticket = await createTicket(interaction.member, "building", selected);
        if (ticket) await interaction.editReply(`✅ Ticket created: ${ticket}`);
        else await interaction.editReply("❌ Error creating ticket. Check Category ID.");
    }

    // --- 4. CLAIM & CLOSE LOGIC ---
    if (interaction.isButton()) {
        if (interaction.customId === "claim_ticket") {
            if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: "Staff only.", ephemeral: true });
            await interaction.update({ content: `${interaction.message.content}\n\n✅ **Claimed by:** ${interaction.user}`, components: [] });
        }
        if (interaction.customId === "close_ticket") {
            if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: "Staff only.", ephemeral: true });
            await interaction.reply("🔒 Closing ticket in 3 seconds...");
            setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
        }
    }

    // --- 5. APPLICATION SYSTEM ---
    if (interaction.isButton() && interaction.customId === "start_app") {
        try {
            await interaction.reply({ content: "📩 Check your DMs to start the application!", ephemeral: true });
            const dmChannel = await interaction.user.createDM();
            const answers = [];

            for (const q of appQuestions) {
                await dmChannel.send(`**Question:** ${q}`);
                const collected = await dmChannel.awaitMessages({ max: 1, time: 300000, errors: ['time'] });
                answers.push({ q, a: collected.first().content });
            }

            const logEmbed = new EmbedBuilder()
                .setTitle("📝 New Staff Application")
                .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                .addFields(answers.map(ans => ({ name: ans.q, value: ans.a })))
                .setColor("Green").setTimestamp();

            const appLog = await client.channels.fetch(APP_LOG_CHANNEL_ID);
            await appLog.send({ embeds: [logEmbed] });
            await dmChannel.send("✅ Thank you! Your application has been submitted.");
        } catch (e) {
            await interaction.followUp({ content: "❌ Enable your DMs so I can message you!", ephemeral: true });
        }
    }

    // --- 6. COMMANDS (QUESTIONS & STAFFMOVE) ---
    if (interaction.isChatInputCommand() && interaction.commandName === "set_app_questions") {
        if (interaction.user.id !== OWNER_ID) return interaction.reply("Owner only.");
        const qs = [interaction.options.getString('q1'), interaction.options.getString('q2'), interaction.options.getString('q3'), interaction.options.getString('q4')].filter(q => q);
        appQuestions = qs;
        await interaction.reply(`✅ Updated questions: ${appQuestions.length}`);
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "staffmove") {
        if (interaction.user.id !== OWNER_ID) return interaction.reply("Owner only.");
        const user = interaction.options.getUser("user");
        const action = interaction.options.getString("type");
        const role = interaction.options.getRole("role");
        const member = await interaction.guild.members.fetch(user.id);
        if (action === "promote") await member.roles.add(role); else await member.roles.remove(role);
        await interaction.reply(`✅ ${action === "promote" ? "Promoted" : "Demoted"} ${user.tag}`);
    }
});

client.login(process.env.DISCORD_TOKEN);
