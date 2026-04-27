require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits 
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// 🛠️ CONFIGURATION
const OWNER_ID = "1453824331346874500";
const DIGGING_CHANNEL_ID = "1497905935656554506";
const BUILDING_CHANNEL_ID = "1497906110219288646";
const APP_HUB_CHANNEL_ID = "1498193257212022835";
const APP_LOG_CHANNEL_ID = "1496241235810189453";
const TICKET_CATEGORY_ID = "1496950777275486429"; 
const STAFF_ROLE_ID = "1496951778967683072";     

let appQuestions = ["Why do you want to join Drox?", "What is your experience?", "How active are you?"];

client.once("ready", () => console.log(`✅ Drox Services Online`));

client.on("interactionCreate", async (interaction) => {

    // --- 1. SETUP HUB (Including Apps) ---
    if (interaction.isChatInputCommand() && interaction.commandName === "setup_hub") {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: "Owner only.", ephemeral: true });
        await interaction.deferReply({ ephemeral: true });

        try {
            // Digging Hub
            const digEmbed = new EmbedBuilder().setTitle("🪏 Drox Digging Services").setDescription("Rates: $900/block digged, $850/block air. Pay before dig!").setColor("#964B00");
            const digRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("open_digging_modal").setLabel("Request builder").setStyle(ButtonStyle.Primary));
            const digChan = await client.channels.fetch(DIGGING_CHANNEL_ID);
            await digChan.send({ embeds: [digEmbed], components: [digRow] });

            // Building Hub
            const buildEmbed = new EmbedBuilder().setTitle("🧱 Drox Building Services").setDescription("Select a farm below.").setColor("#FFD700");
            const buildRow = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId("select_build_service").setPlaceholder("Choose a farm...")
                .addOptions([{ label: "Ikea v1", value: "Ikea v1" }, { label: "Mauschu v1", value: "Mauschu v1" }, { label: "Custom", value: "Custom" }])
            );
            const buildChan = await client.channels.fetch(BUILDING_CHANNEL_ID);
            await buildChan.send({ embeds: [buildEmbed], components: [buildRow] });

            // Application Hub
            const appEmbed = new EmbedBuilder().setTitle("📝 Drox Staff Applications").setDescription("Think you have what it takes? Apply to join the team!").setColor("Green");
            const appRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("start_app").setLabel("Apply Now").setStyle(ButtonStyle.Success));
            const appChan = await client.channels.fetch(APP_HUB_CHANNEL_ID);
            await appChan.send({ embeds: [appEmbed], components: [appRow] });

            await interaction.editReply("✅ All hubs spawned!");
        } catch (e) { console.error(e); await interaction.editReply("❌ Error spawning hubs. Check IDs and Bot Permissions."); }
    }

    // --- 2. SET QUESTIONS COMMAND ---
    if (interaction.isChatInputCommand() && interaction.commandName === "set_app_questions") {
        if (interaction.user.id !== OWNER_ID) return interaction.reply("Owner only.");
        const q1 = interaction.options.getString('q1');
        const q2 = interaction.options.getString('q2');
        const q3 = interaction.options.getString('q3');
        appQuestions = [q1];
        if (q2) appQuestions.push(q2);
        if (q3) appQuestions.push(q3);
        await interaction.reply(`✅ Questions updated to: ${appQuestions.join(", ")}`);
    }

    // --- 3. APPLICATION DM SYSTEM ---
    if (interaction.isButton() && interaction.customId === "start_app") {
        try {
            await interaction.reply({ content: "📩 Check your DMs!", ephemeral: true });
            const dmChannel = await interaction.user.createDM();
            const answers = [];

            for (const q of appQuestions) {
                await dmChannel.send(`**Question:** ${q}`);
                const collected = await dmChannel.awaitMessages({ max: 1, time: 60000, errors: ['time'] });
                answers.push({ q, a: collected.first().content });
            }

            const logEmbed = new EmbedBuilder()
                .setTitle("📝 New Staff Application")
                .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                .setColor("Green")
                .addFields(answers.map(ans => ({ name: ans.q, value: ans.a })))
                .setTimestamp();

            const appLog = await client.channels.fetch(APP_LOG_CHANNEL_ID);
            await appLog.send({ embeds: [logEmbed] });
            await dmChannel.send("✅ Thank you! Your application has been sent to the staff team.");
        } catch (e) {
            await interaction.followUp({ content: "❌ I couldn't DM you. Make sure your DMs are open!", ephemeral: true });
        }
    }

    // --- 4. TICKET LOGIC (Fixed) ---
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

            const msg = type === "digging" 
                ? `<@${member.id}>\n\nYou want **${detail}** digged out\n\nAnd builder is digging this out soon!`
                : `<@${member.id}>\n\nYou want the **${detail}**\n\nAn builder is coming soon!`;

            await ticketChannel.send({ content: msg, components: [ticketRow] });
            return ticketChannel;
        } catch (e) {
            console.error("Ticket Creation Error:", e);
            return null;
        }
    }

    // Modal/Select triggers...
    if (interaction.isButton() && interaction.customId === "open_digging_modal") {
        const modal = new ModalBuilder().setCustomId("modal_digging").setTitle("Digging Request");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("dig_count").setLabel("Block Count").setStyle(TextInputStyle.Short)));
        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === "modal_digging") {
        await interaction.deferReply({ ephemeral: true });
        const ticket = await createTicket(interaction.member, "digging", interaction.fields.getTextInputValue("dig_count"));
        if (ticket) await interaction.editReply(`✅ Ticket: ${ticket}`);
        else await interaction.editReply("❌ Failed to create ticket. Check Bot permissions/Category ID.");
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "select_build_service") {
        await interaction.deferReply({ ephemeral: true });
        const ticket = await createTicket(interaction.member, "building", interaction.values[0]);
        if (ticket) await interaction.editReply(`✅ Ticket: ${ticket}`);
        else await interaction.editReply("❌ Failed. Check Bot permissions/Category ID.");
    }

    // Claim/Close handlers...
    if (interaction.isButton() && (interaction.customId === "claim_ticket" || interaction.customId === "close_ticket")) {
        if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: "Staff only.", ephemeral: true });
        if (interaction.customId === "claim_ticket") {
            await interaction.update({ content: `${interaction.message.content}\n\n**Claimed by:** ${interaction.user}`, components: [] });
        } else {
            await interaction.reply("Closing...");
            setTimeout(() => interaction.channel.delete(), 2000);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
