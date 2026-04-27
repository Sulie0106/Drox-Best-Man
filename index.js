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

// 🛠️ --- CONFIGURATION ---
const OWNER_ID = "1453824331346874500";
const DIGGING_CHANNEL_ID = "1497905935656554506";
const BUILDING_CHANNEL_ID = "1497906110219288646";
const APP_HUB_CHANNEL_ID = "1498193257212022835";
const APP_LOG_CHANNEL_ID = "1496241235810189453";
const TICKET_CATEGORY_ID = "1496950777275486429"; 
const STAFF_ROLE_ID = "1496951778967683072";     

let appQuestions = ["Why do you want to join Drox?", "What is your experience?", "How active are you?"];
const activeGiveaways = new Map();

client.once("ready", () => console.log(`✅ Drox Services Bot is online`));

client.on("interactionCreate", async (interaction) => {

    // --- 1. COMMANDS (OWNER ONLY) ---
    if (interaction.isChatInputCommand()) {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: "❌ You do not have permission to use Drox Admin commands.", ephemeral: true });

        if (interaction.commandName === "setup_hub") {
            await interaction.deferReply({ ephemeral: true });
            // Digging
            const digEmbed = new EmbedBuilder().setTitle("🪏 Drox Digging Services").setDescription("Rates: $900/block dig, $850/block air. Pay before dig!").setColor("#964B00");
            const digRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("open_digging_modal").setLabel("Request builder").setStyle(ButtonStyle.Primary));
            const digChan = await client.channels.fetch(DIGGING_CHANNEL_ID);
            await digChan.send({ embeds: [digEmbed], components: [digRow] });

            // Building
            const buildEmbed = new EmbedBuilder().setTitle("🧱 Drox Building Services").setDescription("Select a farm below.").setColor("#FFD700");
            const buildRow = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId("select_build_service").setPlaceholder("Choose a farm...")
                .addOptions([
                    { label: "Ikea v1", description: "55m", value: "Ikea v1" },
                    { label: "Mauschu v1", description: "100m", value: "Mauschu v1" },
                    { label: "Mauschu v9", description: "650m", value: "Mauschu v9" },
                    { label: "Your Schematics", description: "Negotiable", value: "Custom Schematic" }
                ])
            );
            const buildChan = await client.channels.fetch(BUILDING_CHANNEL_ID);
            await buildChan.send({ embeds: [buildEmbed], components: [buildRow] });

            // Apps
            const appEmbed = new EmbedBuilder().setTitle("📝 Drox Staff Applications").setDescription("Apply to join the team!").setColor("Green");
            const appRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("start_app").setLabel("Apply Now").setStyle(ButtonStyle.Success));
            const appChan = await client.channels.fetch(APP_HUB_CHANNEL_ID);
            await appChan.send({ embeds: [appEmbed], components: [appRow] });

            await interaction.editReply("✅ Hubs setup!");
        }

        if (interaction.commandName === "gwcreate") {
            const prize = interaction.options.getString("prize");
            const duration = ms(interaction.options.getString("time"));
            const winnerCount = interaction.options.getInteger("winners");
            if (!duration) return interaction.reply("Invalid time!");

            const endTime = Math.floor((Date.now() + duration) / 1000);
            const embed = new EmbedBuilder().setTitle("🎉 GIVEAWAY").setDescription(`Prize: **${prize}**\nEnds: <t:${endTime}:R>`).setColor("Gold");
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("join_gw").setLabel("Join!").setStyle(ButtonStyle.Primary));

            const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
            activeGiveaways.set(msg.id, { prize, winners: winnerCount, entrants: [] });

            setTimeout(async () => {
                const data = activeGiveaways.get(msg.id);
                const winners = data.entrants.sort(() => 0.5 - Math.random()).slice(0, data.winners);
                
                const endEmbed = new EmbedBuilder().setTitle("🎊 GIVEAWAY ENDED").setDescription(`Prize: **${prize}**\nWinners: ${winners.length ? winners.map(id => `<@${id}>`).join(", ") : "None"}`).setColor("Grey");
                const claimRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("claim_gw_prize").setLabel("Claim Prize").setStyle(ButtonStyle.Success));
                
                await msg.edit({ embeds: [endEmbed], components: [claimRow] });
                activeGiveaways.delete(msg.id);
            }, duration);
        }
    }

    // --- 2. BUTTON & INTERACTION LOGIC ---
    if (interaction.isButton()) {
        // Giveaway Join
        if (interaction.customId === "join_gw") {
            const data = activeGiveaways.get(interaction.message.id);
            if (!data) return interaction.reply({ content: "Ended.", ephemeral: true });
            if (!data.entrants.includes(interaction.user.id)) data.entrants.push(interaction.user.id);
            return interaction.reply({ content: "✅ Entered!", ephemeral: true });
        }

        // Giveaway Claim (Winner Only)
        if (interaction.customId === "claim_gw_prize") {
            const isWinner = interaction.message.embeds[0].description.includes(interaction.user.id);
            if (!isWinner) return interaction.reply({ content: "❌ You did not win this giveaway!", ephemeral: true });
            
            const ticket = await interaction.guild.channels.create({
                name: `claim-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: TICKET_CATEGORY_ID,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });
            await ticket.send(`🏆 <@${interaction.user.id}> is here to claim their prize from the giveaway!`);
            await interaction.reply({ content: `✅ Ticket created: ${ticket}`, ephemeral: true });
        }

        // Application Accept/Deny
        if (interaction.customId.startsWith("app_")) {
            if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: "Staff only.", ephemeral: true });
            const [action, userId] = interaction.customId.split("_");
            const targetUser = await client.users.fetch(userId);

            if (action === "app_accept") {
                await targetUser.send("✅ **Congratulations!** Your application for Drox Services has been **Accepted**. Welcome to the team!");
                await interaction.update({ content: `✅ Accepted by ${interaction.user.tag}`, components: [] });
            } else {
                await targetUser.send("❌ **Update:** Your application for Drox Services has been **Denied** at this time.");
                await interaction.update({ content: `❌ Denied by ${interaction.user.tag}`, components: [] });
            }
        }

        // Start App (DM System)
        if (interaction.customId === "start_app") {
            await interaction.reply({ content: "📩 Check DMs!", ephemeral: true });
            const dm = await interaction.user.createDM();
            let answers = "";
            for (const q of appQuestions) {
                await dm.send(`**${q}**`);
                const msg = await dm.awaitMessages({ max: 1, time: 60000 }).then(c => c.first().content);
                answers += `**${q}**\n${msg}\n\n`;
            }
            const logChan = await client.channels.fetch(APP_LOG_CHANNEL_ID);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`app_accept_${interaction.user.id}`).setLabel("Accept").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`app_deny_${interaction.user.id}`).setLabel("Deny").setStyle(ButtonStyle.Danger)
            );
            await logChan.send({ content: `📝 **New App from ${interaction.user.tag}**\n\n${answers}`, components: [row] });
            await dm.send("✅ Submitted!");
        }

        // Ticket Claim/Close
        if (interaction.customId === "claim_ticket") {
            if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: "Staff only.", ephemeral: true });
            await interaction.update({ content: `${interaction.message.content}\n\n👤 **Claimed by:** ${interaction.user}`, components: [] });
        }
        if (interaction.customId === "close_ticket") {
            if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: "Staff only.", ephemeral: true });
            await interaction.reply("Closing...");
            setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
        }
    }

    // Modal Submit (Digging Ticket)
    if (interaction.isModalSubmit() && interaction.customId === "modal_digging") {
        await interaction.deferReply({ ephemeral: true });
        const count = interaction.fields.getTextInputValue("dig_count");
        const ticket = await interaction.guild.channels.create({
            name: `${interaction.user.username}-pending-builder`,
            type: ChannelType.GuildText,
            parent: TICKET_CATEGORY_ID,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("claim_ticket").setLabel("Claim").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger));
        await ticket.send({ content: `<@${interaction.user.id}> wants **${count}** blocks digged.`, components: [row] });
        await interaction.editReply(`✅ Ticket: ${ticket}`);
    }
});

client.login(process.env.DISCORD_TOKEN);
