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
const TICKET_CATEGORY_ID = "YOUR_CATEGORY_ID"; 
const STAFF_ROLE_ID = "YOUR_STAFF_ROLE_ID";     

client.once("ready", () => console.log(`✅ Drox Services Online`));

client.on("interactionCreate", async (interaction) => {

    // --- 1. SETUP HUB ---
    if (interaction.isChatInputCommand() && interaction.commandName === "setup_hub") {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: "Owner only.", ephemeral: true });
        await interaction.deferReply({ ephemeral: true });

        const digEmbed = new EmbedBuilder()
            .setTitle("🪏 Drox Digging Services")
            .setDescription("💰 **Rates**\n• $900 per block digged\n• $850 per block placed in the air\n• 7.5m for good cords\n\n⚠️ **Policy**: You pay before we do the dig out.")
            .setColor("#964B00");

        const digRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("open_digging_modal").setLabel("Request builder").setStyle(ButtonStyle.Primary).setEmoji("⛏️")
        );

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
                    { label: "Mauschu v1", description: "100m", value: "Mauschu v1" },
                    { label: "Mauschu v9", description: "650m", value: "Mauschu v9" },
                    { label: "Fire Azure v1", description: "180m", value: "Fire Azure v1" },
                    { label: "Custom Schematic", description: "Negotiable", value: "Custom Schematic" }
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
    async function createTicket(member, type, detail) {
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

        const ticketEmbed = new EmbedBuilder()
            .setTitle("🎫 Ticket Actions")
            .setDescription("Staff can claim this ticket or close it once the service is complete.")
            .setColor("Blue")
            .setTimestamp();

        const ticketRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("claim_ticket").setLabel("Claim").setStyle(ButtonStyle.Success).setEmoji("🙋‍♂️"),
            new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger).setEmoji("🔒")
        );

        const content = type === "digging" 
            ? `<@${member.id}>\n\nYou want **${detail}** digged out\n\nAnd builder is digging this out soon!`
            : `<@${member.id}>\n\nYou want the **${detail}**\n\nAn builder is coming soon!`;

        await ticketChannel.send({
            content: content,
            embeds: [ticketEmbed],
            components: [ticketRow]
        });

        return ticketChannel;
    }

    // --- 3. INTERACTION HANDLERS ---
    
    // Modals & Select Menus
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

    if (interaction.isStringSelectMenu() && interaction.customId === "select_build_service") {
        const selected = interaction.values[0];
        await interaction.deferReply({ ephemeral: true });
        const ticket = await createTicket(interaction.member, "building", selected);
        await interaction.editReply(`✅ Ticket created: ${ticket}`);
    }

    // Ticket Actions: CLAIM & CLOSE
    if (interaction.isButton()) {
        // CLAIM LOGIC
        if (interaction.customId === "claim_ticket") {
            if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
                return interaction.reply({ content: "❌ Only staff can claim tickets!", ephemeral: true });
            }

            const claimedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor("Green")
                .setDescription(`Ticket claimed by: ${interaction.user}`);

            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("claimed").setLabel("Claimed").setStyle(ButtonStyle.Success).setDisabled(true),
                new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger)
            );

            await interaction.update({ embeds: [claimedEmbed], components: [disabledRow] });
            await interaction.followUp({ content: `👋 ${interaction.user} will be helping you today!` });
        }

        // CLOSE LOGIC
        if (interaction.customId === "close_ticket") {
            if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
                return interaction.reply({ content: "❌ Only staff can close tickets!", ephemeral: true });
            }

            await interaction.reply("🔒 Closing ticket in 5 seconds...");
            setTimeout(() => {
                interaction.channel.delete().catch(() => console.log("Channel already deleted."));
            }, 5000);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
