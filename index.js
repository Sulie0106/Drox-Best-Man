require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits 
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.MessageContent
    ]
});

// 🛠️ CONFIGURATION
const OWNER_ID = "1453824331346874500";
const DIGGING_CHANNEL_ID = "1497905935656554506";
const BUILDING_CHANNEL_ID = "1497906110219288646";
const TICKET_CATEGORY_ID = "1496950777275486429"; // <--- VUL DIT IN!
const STAFF_ROLE_ID = "1496951778967683072";     // <--- VUL DIT IN!

client.once("ready", () => console.log(`✅ Drox Services Online`));

client.on("interactionCreate", async (interaction) => {

    // --- 1. SETUP HUB ---
    if (interaction.isChatInputCommand() && interaction.commandName === "setup_hub") {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: "Owner only.", ephemeral: true });
        await interaction.deferReply({ ephemeral: true });

        // DIGGING EMBED
        const digEmbed = new EmbedBuilder()
            .setTitle("🪏 Drox Digging Services")
            .setDescription("💰 **Rates**\n• $900 per block digged\n• $850 per block placed in the air\n• 7.5m for good cords\n\n⚠️ **Policy**: You pay before we do the dig out.")
            .setColor("#964B00");

        const digRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("open_digging_modal").setLabel("Request builder").setStyle(ButtonStyle.Primary).setEmoji("⛏️")
        );

        // BUILDING EMBED
        const buildEmbed = new EmbedBuilder()
            .setTitle("🧱 Drox Building Services")
            .setDescription("Select a farm from the dropdown below to request a builder.")
            .setColor("#FFD700");

        const buildRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("select_build_service")
                .setPlaceholder("Choose a farm or service...")
                .addOptions([
                    { label: "Ikea v1 (264 smokers)", description: "55m", value: "Ikea v1" },
                    { label: "Ikea v2 (512 smokers)", description: "90m", value: "Ikea v2" },
                    { label: "Mauschu v1", description: "100m", value: "Mauschu v1" },
                    { label: "Mauschu v9", description: "650m", value: "Mauschu v9" },
                    { label: "Fire Azure v1", description: "180m", value: "Fire Azure v1" },
                    { label: "Lox v1", description: "50m", value: "Lox v1" },
                    { label: "Mcds farm", description: "75m", value: "Mcds farm" },
                    { label: "Your Schematics", description: "Negotiable", value: "Custom Schematic" }
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

    // --- 2. TICKET CREATOR FUNCTION ---
    async function createTicket(user, type, detail) {
        const guild = user.guild;
        const channelName = `${user.user.username}-pending-builder`;

        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: TICKET_CATEGORY_ID,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, // Hide for everyone
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }, // Show to user
                { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] } // Show to staff
            ]
        });

        if (type === "digging") {
            await ticketChannel.send({
                content: `<@${user.id}>\n\nYou want **${detail}** digged out\n\nAnd builder is digging this out soon!`
            });
        } else {
            await ticketChannel.send({
                content: `<@${user.id}>\n\nYou want the **${detail}**\n\nAn builder is coming soon!`
            });
        }
        return ticketChannel;
    }

    // --- 3. MODAL HANDLER (DIGGING) ---
    if (interaction.isButton() && interaction.customId === "open_digging_modal") {
        const modal = new ModalBuilder().setCustomId("modal_digging").setTitle("Digging Request");
        const blockInput = new TextInputBuilder().setCustomId("dig_count").setLabel("How many blocks should we dig?").setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(blockInput));
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === "modal_digging") {
        const count = interaction.fields.getTextInputValue("dig_count");
        await interaction.deferReply({ ephemeral: true });
        const ticket = await createTicket(interaction.member, "digging", count);
        await interaction.editReply(`✅ Ticket created: ${ticket}`);
    }

    // --- 4. SELECT MENU HANDLER (BUILDING) ---
    if (interaction.isStringSelectMenu() && interaction.customId === "select_build_service") {
        const selected = interaction.values[0];
        await interaction.deferReply({ ephemeral: true });
        const ticket = await createTicket(interaction.member, "building", selected);
        await interaction.editReply(`✅ Ticket created: ${ticket}`);
    }
});

client.login(process.env.DISCORD_TOKEN);
