require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder 
} = require("discord.js");
const ms = require("ms");

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent]
});

const OWNER_ID = "1453824331346874500";
const DIGGING_CHANNEL_ID = "1497905935656554506";
const BUILDING_CHANNEL_ID = "1497906110219288646";
const ORDER_LOG_ID = process.env.ORDER_LOG_CHANNEL_ID;

client.once("ready", () => console.log(`✅ Drox Services Online`));

client.on("interactionCreate", async (interaction) => {

    // --- 1. SETUP HUB ---
    if (interaction.isChatInputCommand() && interaction.commandName === "setup_hub") {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: "Owner only.", ephemeral: true });
        await interaction.deferReply({ ephemeral: true });

        // DIGGING EMBED
        const digEmbed = new EmbedBuilder()
            .setTitle("🪏 Drox Digging Services")
            .setDescription("Our professional digging team is ready for your project.")
            .addFields(
                { name: "💰 Rates", value: "• $900 per block digged\n• $850 per block placed in the air (Sky bases)\n• 7.5m for finding good cords" },
                { name: "⚠️ Policy", value: "You pay **before** we start the dig out." }
            )
            .setColor("#964B00");

        const digRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("open_digging_modal").setLabel("Order Digging").setStyle(ButtonStyle.Primary).setEmoji("⛏️")
        );

        // BUILDING EMBED
        const buildEmbed = new EmbedBuilder()
            .setTitle("🧱 Drox Building Services")
            .setDescription("Choose from our selection of premium farms and schematic services.")
            .setColor("#FFD700");

        const buildRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("select_build_service")
                .setPlaceholder("Choose a farm or service...")
                .addOptions([
                    { label: "Building service", value: "General Building" },
                    { label: "Kelp Farms", value: "Kelp Farms" },
                    { label: "Ikea v1 (264 smokers)", description: "55m", value: "Ikea v1" },
                    { label: "Ikea v2 (512 smokers)", description: "90m", value: "Ikea v2" },
                    { label: "Ikea v3 (1024 smokers)", description: "145m", value: "Ikea v3" },
                    { label: "Ikea v4 (2048 smokers)", description: "200m", value: "Ikea v4" },
                    { label: "Mauschu v1", description: "100m", value: "Mauschu v1" },
                    { label: "Mauschu v4", description: "255m", value: "Mauschu v4" },
                    { label: "Mauschu v9", description: "650m", value: "Mauschu v9" },
                    { label: "Fire Azure v1", description: "180m", value: "Fire Azure v1" },
                    { label: "Fire Azure v3", description: "650m", value: "Fire Azure v3" },
                    { label: "Lox v1", description: "50m", value: "Lox v1" },
                    { label: "Lox v5", description: "230m", value: "Lox v5" },
                    { label: "Mcds (240 smokers)", description: "75m", value: "Mcds farm" },
                    { label: "Your Schematics", description: "Price Negotiable", value: "Custom Schematic" }
                ])
        );

        try {
            const digChan = await client.channels.fetch(DIGGING_CHANNEL_ID);
            await digChan.send({ embeds: [digEmbed], components: [digRow] });
            const buildChan = await client.channels.fetch(BUILDING_CHANNEL_ID);
            await buildChan.send({ embeds: [buildEmbed], components: [buildRow] });
            await interaction.editReply("✅ Hub setup complete!");
        } catch (e) { await interaction.editReply("❌ Error. Check channel IDs."); }
    }

    // --- 2. BUTTON HANDLER (DIGGING) ---
    if (interaction.isButton() && interaction.customId === "open_digging_modal") {
        const modal = new ModalBuilder().setCustomId("modal_digging").setTitle("Digging Order");
        const blockInput = new TextInputBuilder()
            .setCustomId("dig_count")
            .setLabel("How many blocks should we dig?")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        
        modal.addComponents(new ActionRowBuilder().addComponents(blockInput));
        await interaction.showModal(modal);
    }

    // --- 3. SELECT MENU HANDLER (BUILDING) ---
    if (interaction.isStringSelectMenu() && interaction.customId === "select_build_service") {
        const selected = interaction.values[0];
        const logChan = await client.channels.fetch(ORDER_LOG_ID);
        
        const logEmbed = new EmbedBuilder()
            .setTitle("🧱 NEW BUILDING ORDER")
            .addFields(
                { name: "Client", value: `${interaction.user.tag}` },
                { name: "Service/Farm", value: selected }
            )
            .setColor("#FFD700")
            .setTimestamp();

        if (logChan) await logChan.send({ embeds: [logEmbed] });
        await interaction.reply({ content: `✅ You have requested: **${selected}**. Staff will contact you soon!`, ephemeral: true });
    }

    // --- 4. MODAL SUBMIT (DIGGING) ---
    if (interaction.isModalSubmit() && interaction.customId === "modal_digging") {
        const count = interaction.fields.getTextInputValue("dig_count");
        const logChan = await client.channels.fetch(ORDER_LOG_ID);
        
        const logEmbed = new EmbedBuilder()
            .setTitle("⛏️ NEW DIGGING ORDER")
            .addFields(
                { name: "Client", value: `${interaction.user.tag}` },
                { name: "Amount", value: `${count} blocks` }
            )
            .setColor("#964B00")
            .setTimestamp();

        if (logChan) await logChan.send({ embeds: [logEmbed] });
        await interaction.reply({ content: "✅ Digging request submitted!", ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
