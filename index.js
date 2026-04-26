require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require("discord.js");
const ms = require("ms");

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

const giveaways = new Map();

client.once("ready", () => {
    console.log(`✅ Drox Services Bot is online as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
    
    // --- 1. SETUP HUB (SENDS TO ALL 3 CHANNELS) ---
    if (interaction.commandName === "setup_hub") {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: "Owner only.", ephemeral: true });

        await interaction.deferReply({ ephemeral: true });

        // A. Main Hub Embed
        const hubEmbed = new EmbedBuilder()
            .setTitle("🏗️ Drox Services Hub")
            .setDescription("Welcome to the central hub of **Drox Services**. Use the buttons below for general inquiries or staff applications.")
            .setColor("#2f3136")
            .setFooter({ text: "Drox Services • Quality above all" });

        const hubRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("open_app").setLabel("Apply for Staff").setStyle(ButtonStyle.Success).setEmoji("📝")
        );

        // B. Digging Service Embed
        const diggingEmbed = new EmbedBuilder()
            .setTitle("⛏️ Drox Digging Services")
            .setDescription("Need a perimeter, a hole, or massive terraforming? Our expert diggers are ready to help!")
            .addFields(
                { name: "✨ Features", value: "• Fast Completion\n• Large Scale Projects\n• Competitive Pricing" }
            )
            .setColor("#964B00");

        const diggingRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("open_order_digging").setLabel("Order Digging").setStyle(ButtonStyle.Primary).setEmoji("⛏️")
        );

        // C. Building Service Embed
        const buildingEmbed = new EmbedBuilder()
            .setTitle("🧱 Drox Building Services")
            .setDescription("From mega-bases to detailed spawns, our builders bring your vision to life.")
            .addFields(
                { name: "✨ Features", value: "• Custom Designs\n• Any Style (Medieval, Modern, etc.)\n• Material Gathering Included" }
            )
            .setColor("#FFD700");

        const buildingRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("open_order_building").setLabel("Order Building").setStyle(ButtonStyle.Primary).setEmoji("🧱")
        );

        try {
            // Send to current channel
            await interaction.channel.send({ embeds: [hubEmbed], components: [hubRow] });

            // Send to Digging Channel
            const digChannel = await client.channels.fetch(DIGGING_CHANNEL_ID);
            if (digChannel) await digChannel.send({ embeds: [diggingEmbed], components: [diggingRow] });

            // Send to Building Channel
            const buildChannel = await client.channels.fetch(BUILDING_CHANNEL_ID);
            if (buildChannel) await buildChannel.send({ embeds: [buildingEmbed], components: [buildingRow] });

            await interaction.editReply("✅ All service stations have been set up!");
        } catch (err) {
            console.error(err);
            await interaction.editReply("❌ Error during setup. Check channel permissions.");
        }
    }

    // --- 2. MODAL LOGIC FOR ORDERS ---
    if (interaction.isButton()) {
        if (interaction.customId === "open_order_digging" || interaction.customId === "open_order_building") {
            const isDigging = interaction.customId.includes("digging");
            const modal = new ModalBuilder()
                .setCustomId(isDigging ? "modal_digging" : "modal_building")
                .setTitle(isDigging ? "Digging Order Form" : "Building Order Form");

            const descInput = new TextInputBuilder()
                .setCustomId("order_desc")
                .setLabel("Project Description")
                .setPlaceholder("Tell us what you need...")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            const budgetInput = new TextInputBuilder()
                .setCustomId("order_budget")
                .setLabel("What is your budget?")
                .setPlaceholder("e.g. 5m coins")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(descInput),
                new ActionRowBuilder().addComponents(budgetInput)
            );
            await interaction.showModal(modal);
        }

        // --- GIVEAWAY JOIN LOGIC (from previous code) ---
        if (interaction.customId === "join_gw") {
            const data = giveaways.get(interaction.message.id);
            if (!data) return interaction.reply({ content: "Giveaway expired.", ephemeral: true });
            if (data.entrants.includes(interaction.user.id)) return interaction.reply({ content: "Already entered!", ephemeral: true });
            data.entrants.push(interaction.user.id);
            const newEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setFooter({ text: `Entries: ${data.entrants.length}` });
            await interaction.message.edit({ embeds: [newEmbed] });
            await interaction.reply({ content: "✅ Joined!", ephemeral: true });
        }
    }

    // --- 3. MODAL SUBMISSION HANDLING ---
    if (interaction.isModalSubmit()) {
        const desc = interaction.fields.getTextInputValue("order_desc");
        const budget = interaction.fields.getTextInputValue("order_budget");
        const serviceType = interaction.customId === "modal_digging" ? "⛏️ DIGGING" : "🧱 BUILDING";

        const logEmbed = new EmbedBuilder()
            .setTitle(`🚨 NEW ${serviceType} ORDER`)
            .setColor(interaction.customId === "modal_digging" ? "#964B00" : "#FFD700")
            .addFields(
                { name: "Client", value: `${interaction.user} (${interaction.user.id})` },
                { name: "Description", value: desc },
                { name: "Budget", value: budget }
            )
            .setTimestamp();

        const logChannel = await client.channels.fetch(process.env.ORDER_LOG_CHANNEL_ID);
        if (logChannel) logChannel.send({ embeds: [logEmbed] });

        await interaction.reply({ content: "✅ Your order has been submitted! A staff member will contact you soon.", ephemeral: true });
    }

    // --- GIVEAWAY & STAFFMOVE COMMANDS (Remain the same as previous) ---
    // ... [Insert the gwcreate and staffmove logic from the previous code here] ...
});

client.login(process.env.DISCORD_TOKEN);