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
const ORDER_LOG_ID = process.env.ORDER_LOG_CHANNEL_ID;
const STAFF_LOG_ID = process.env.STAFF_LOG_CHANNEL_ID;

const giveaways = new Map();

client.once("ready", () => {
    console.log(`✅ Drox Services Bot is online as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
    
    // --- 1. SETUP HUB ---
    if (interaction.isChatInputCommand() && interaction.commandName === "setup_hub") {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: "Owner only.", ephemeral: true });
        await interaction.deferReply({ ephemeral: true });

        const hubEmbed = new EmbedBuilder().setTitle("🏗️ Drox Services Hub").setDescription("Central hub for **Drox Services**.").setColor("#2f3136");
        const hubRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("open_app").setLabel("Apply for Staff").setStyle(ButtonStyle.Success));

        const diggingEmbed = new EmbedBuilder().setTitle("⛏️ Drox Digging Services").setDescription("Order your digging projects here!").setColor("#964B00");
        const diggingRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("open_order_digging").setLabel("Order Digging").setStyle(ButtonStyle.Primary));

        const buildingEmbed = new EmbedBuilder().setTitle("🧱 Drox Building Services").setDescription("Order your building projects here!").setColor("#FFD700");
        const buildingRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("open_order_building").setLabel("Order Building").setStyle(ButtonStyle.Primary));

        try {
            await interaction.channel.send({ embeds: [hubEmbed], components: [hubRow] });
            const digChan = await client.channels.fetch(DIGGING_CHANNEL_ID);
            if (digChan) await digChan.send({ embeds: [diggingEmbed], components: [diggingRow] });
            const buildChan = await client.channels.fetch(BUILDING_CHANNEL_ID);
            if (buildChan) await buildChan.send({ embeds: [buildingEmbed], components: [buildingRow] });
            await interaction.editReply("✅ All channels set up!");
        } catch (e) { await interaction.editReply("❌ Setup failed. Check IDs."); }
    }

    // --- 2. GIVEAWAY CREATE ---
    if (interaction.isChatInputCommand() && interaction.commandName === "gwcreate") {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: "Owner only.", ephemeral: true });
        
        const prize = interaction.options.getString("prize");
        const timeStr = interaction.options.getString("time");
        const winnerCount = interaction.options.getInteger("winners");
        const duration = ms(timeStr);

        if (!duration) return interaction.reply({ content: "Invalid time! (e.g. 1h)", ephemeral: true });
        const endTime = Math.floor((Date.now() + duration) / 1000);
        
        const embed = new EmbedBuilder().setTitle("🎉 NEW GIVEAWAY").setDescription(`**Prize:** ${prize}\n**Ends:** <t:${endTime}:R>`).setColor("Gold");
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("join_gw").setLabel("Join!").setStyle(ButtonStyle.Primary));

        const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        giveaways.set(msg.id, { prize, winners: winnerCount, entrants: [], endTime });

        setTimeout(async () => {
            const data = giveaways.get(msg.id);
            if (!data) return;
            const winners = data.entrants.sort(() => 0.5 - Math.random()).slice(0, data.winners).map(id => `<@${id}>`);
            const endEmbed = EmbedBuilder.from(embed).setTitle("🎊 GIVEAWAY ENDED").setDescription(`**Prize:** ${prize}\n**Winners:** ${winners.length ? winners.join(", ") : "None"}`).setColor("Grey");
            await msg.edit({ embeds: [endEmbed], components: [] });
            if (winners.length) await msg.reply(`Congrats ${winners.join(", ")}!`);
            giveaways.delete(msg.id);
        }, duration);
    }

    // --- 3. STAFFMOVE ---
    if (interaction.isChatInputCommand() && interaction.commandName === "staffmove") {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: "Owner only.", ephemeral: true });
        await interaction.deferReply();

        const user = interaction.options.getUser("user");
        const action = interaction.options.getString("type");
        const role = interaction.options.getRole("role");
        const member = await interaction.guild.members.fetch(user.id);

        if (action === "promote") await member.roles.add(role); else await member.roles.remove(role);

        const logChan = await client.channels.fetch(STAFF_LOG_ID);
        if (logChan) await logChan.send({ content: `✅ ${action.toUpperCase()}: ${user} to ${role.name}` });
        await interaction.editReply(`✅ Successfully updated ${user.tag}`);
    }

    // --- 4. BUTTONS & MODALS ---
    if (interaction.isButton()) {
        if (interaction.customId === "join_gw") {
            const data = giveaways.get(interaction.message.id);
            if (!data) return interaction.reply({ content: "Ended.", ephemeral: true });
            if (data.entrants.includes(interaction.user.id)) return interaction.reply({ content: "Already in!", ephemeral: true });
            data.entrants.push(interaction.user.id);
            await interaction.reply({ content: "✅ Joined!", ephemeral: true });
        }

        if (interaction.customId.startsWith("open_order")) {
            const modal = new ModalBuilder().setCustomId(interaction.customId === "open_order_digging" ? "modal_digging" : "modal_building").setTitle("Order Form");
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("desc").setLabel("Project Details").setStyle(TextInputStyle.Paragraph).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("budget").setLabel("Budget").setStyle(TextInputStyle.Short).setRequired(true))
            );
            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {
        await interaction.reply({ content: "✅ Submitted!", ephemeral: true });
        const logChan = await client.channels.fetch(ORDER_LOG_ID);
        if (logChan) await logChan.send({ content: `🚨 **New Order** from ${interaction.user.tag}\nDetails: ${interaction.fields.getTextInputValue("desc")}\nBudget: ${interaction.fields.getTextInputValue("budget")}` });
    }
});

client.login(process.env.DISCORD_TOKEN);
