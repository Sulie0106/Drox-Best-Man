require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits, 
    Partials, MessageFlags 
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
const ADMIN_ROLE_ID = "1496951778967683072"; // Anyone with this role can run setup/giveaways/staffmove
const DIGGING_CHANNEL_ID = "1497905935656554506";
const BUILDING_CHANNEL_ID = "1497906110219288646";
const APP_HUB_CHANNEL_ID = "1498193257212022835";
const APP_LOG_CHANNEL_ID = "1496241235810189453";
const TICKET_CATEGORY_ID = "PASTE_CATEGORY_ID_HERE"; 
const STAFF_ROLE_ID = "PASTE_STAFF_ROLE_ID_HERE";     

let appQuestions = ["Why do you want to join Drox?", "What is your experience?", "How active are you?"];
const activeGiveaways = new Map();

client.once("ready", () => console.log(`✅ Drox Services Bot is fully online and ready!`));

client.on("interactionCreate", async (interaction) => {
    try {
        // ==========================================
        // 1. SLASH COMMANDS (ADMIN ROLE ONLY)
        // ==========================================
        if (interaction.isChatInputCommand()) {
            // Check if the user has the Admin Role
            if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
                return interaction.reply({ 
                    content: "❌ You don't have the required role to use this command.", 
                    flags: MessageFlags.Ephemeral 
                });
            }

            if (interaction.commandName === "setup_hub") {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                
                // --- DIGGING HUB ---
                const digEmbed = new EmbedBuilder().setTitle("🪏 Drox Digging Services").setDescription("Rates:\n• $900/block dig\n• $850/block placed in air\n• 7.5m for good cords\n\n⚠️ Pay before we dig out.").setColor("#964B00");
                const digRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("open_digging_modal").setLabel("Request builder").setStyle(ButtonStyle.Primary).setEmoji("⛏️"));
                const digChan = await client.channels.fetch(DIGGING_CHANNEL_ID);
                await digChan.send({ embeds: [digEmbed], components: [digRow] });

                // --- BUILDING HUB (Exactly 25 Items) ---
                const buildEmbed = new EmbedBuilder().setTitle("🧱 Drox Building Services").setDescription("Select a farm below to request a builder.").setColor("#FFD700");
                const buildRow = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId("select_build_service").setPlaceholder("Choose a farm...")
                    .addOptions([
                        { label: "Ikea v1 (264 smokers)", description: "55m", value: "Ikea v1 (55m)" },
                        { label: "Ikea v2 (512 smokers)", description: "90m", value: "Ikea v2 (90m)" },
                        { label: "Ikea v3 (1024 smokers)", description: "145m", value: "Ikea v3 (145m)" },
                        { label: "Ikea v4 (2048 smokers)", description: "200m", value: "Ikea v4 (200m)" },
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
                        { label: "Mcds 240 smoker farm", description: "75m", value: "Mcds farm (75m)" },
                        { label: "Your Schematics", description: "Negotiable price", value: "Custom Schematic" }
                    ])
                );
                const buildChan = await client.channels.fetch(BUILDING_CHANNEL_ID);
                await buildChan.send({ embeds: [buildEmbed], components: [buildRow] });

                // --- APP HUB ---
                const appEmbed = new EmbedBuilder().setTitle("📝 Drox Staff Applications").setDescription("Apply to join the team!").setColor("Green");
                const appRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("start_app").setLabel("Apply Now").setStyle(ButtonStyle.Success));
                const appChan = await client.channels.fetch(APP_HUB_CHANNEL_ID);
                await appChan.send({ embeds: [appEmbed], components: [appRow] });

                await interaction.editReply("✅ All hubs have been respawned successfully!");
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
                    if (!data) return;
                    const winners = data.entrants.sort(() => 0.5 - Math.random()).slice(0, data.winners);
                    
                    const endEmbed = new EmbedBuilder().setTitle("🎊 GIVEAWAY ENDED").setDescription(`Prize: **${prize}**\nWinners: ${winners.length ? winners.map(id => `<@${id}>`).join(", ") : "None"}`).setColor("Grey");
                    const claimRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("claim_gw_prize").setLabel("Claim Prize").setStyle(ButtonStyle.Success));
                    
                    await msg.edit({ embeds: [endEmbed], components: [claimRow] });
                    activeGiveaways.delete(msg.id);
                }, duration);
            }

            if (interaction.commandName === "set_app_questions") {
                const qs = [interaction.options.getString('q1'), interaction.options.getString('q2'), interaction.options.getString('q3'), interaction.options.getString('q4')].filter(q => q);
                appQuestions = qs;
                await interaction.reply(`✅ Updated questions: ${appQuestions.length}`);
            }

            if (interaction.commandName === "staffmove") {
                const user = interaction.options.getUser("user");
                const action = interaction.options.getString("type");
                const role = interaction.options.getRole("role");
                const member = await interaction.guild.members.fetch(user.id);
                if (action === "promote") await member.roles.add(role); else await member.roles.remove(role);
                await interaction.reply(`✅ ${action === "promote" ? "Promoted" : "Demoted"} ${user.tag}`);
            }
        }

        // ==========================================
        // 2. BUTTONS
        // ==========================================
        if (interaction.isButton()) {
            // Digging Button
            if (interaction.customId === "open_digging_modal") {
                const modal = new ModalBuilder().setCustomId("modal_digging").setTitle("Digging Request");
                const blockInput = new TextInputBuilder().setCustomId("dig_count").setLabel("How many blocks should we dig?").setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(blockInput));
                return await interaction.showModal(modal);
            }

            // Giveaway Join
            if (interaction.customId === "join_gw") {
                const data = activeGiveaways.get(interaction.message.id);
                if (!data) return interaction.reply({ content: "Ended.", flags: MessageFlags.Ephemeral });
                if (!data.entrants.includes(interaction.user.id)) data.entrants.push(interaction.user.id);
                return interaction.reply({ content: "✅ Entered!", flags: MessageFlags.Ephemeral });
            }

            // Giveaway Claim (Winner Only)
            if (interaction.customId === "claim_gw_prize") {
                const isWinner = interaction.message.embeds[0].description.includes(interaction.user.id);
                if (!isWinner) return interaction.reply({ content: "❌ You did not win this giveaway!", flags: MessageFlags.Ephemeral });
                
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
                return interaction.reply({ content: `✅ Ticket created: ${ticket}`, flags: MessageFlags.Ephemeral });
            }

            // Application Start
            if (interaction.customId === "start_app") {
                await interaction.reply({ content: "📩 Check your DMs!", flags: MessageFlags.Ephemeral });
                const dm = await interaction.user.createDM();
                let answers = "";
                for (const q of appQuestions) {
                    await dm.send(`**${q}**`);
                    const msg = await dm.awaitMessages({ max: 1, time: 300000, errors: ['time'] }).then(c => c.first().content).catch(() => null);
                    if (!msg) return dm.send("❌ You took too long to answer. Application cancelled.");
                    answers += `**${q}**\n${msg}\n\n`;
                }
                const logChan = await client.channels.fetch(APP_LOG_CHANNEL_ID);
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`app_accept_${interaction.user.id}`).setLabel("Accept").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`app_deny_${interaction.user.id}`).setLabel("Deny").setStyle(ButtonStyle.Danger)
                );
                await logChan.send({ content: `📝 **New App from ${interaction.user.tag}**\n\n${answers}`, components: [row] });
                return dm.send("✅ Application Submitted!");
            }

            // Application Accept/Deny
            if (interaction.customId.startsWith("app_")) {
                if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: "Staff only.", flags: MessageFlags.Ephemeral });
                
                const parts = interaction.customId.split("_");
                const action = parts[1]; 
                const userId = parts[2]; 

                const targetUser = await client.users.fetch(userId);

                if (action === "accept") {
                    await targetUser.send("✅ **Congratulations!** Your application for Drox Services has been **Accepted**. Welcome to the team!");
                    await interaction.update({ content: `✅ Application **Accepted** by ${interaction.user.tag}`, components: [] });
                } else if (action === "deny") {
                    await targetUser.send("❌ **Update:** Your application for Drox Services has been **Denied** at this time.");
                    await interaction.update({ content: `❌ Application **Denied** by ${interaction.user.tag}`, components: [] });
                }
                return;
            }

            // Ticket Controls
            if (interaction.customId === "claim_ticket") {
                if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: "Staff only.", flags: MessageFlags.Ephemeral });
                return interaction.update({ content: `${interaction.message.content}\n\n👤 **Claimed by:** ${interaction.user}`, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger))] });
            }
            if (interaction.customId === "close_ticket") {
                if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: "Staff only.", flags: MessageFlags.Ephemeral });
                await interaction.reply("🔒 Closing ticket in 3 seconds...");
                setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
                return;
            }
        }

        // ==========================================
        // 3. SELECT MENUS (BUILDING)
        // ==========================================
        if (interaction.isStringSelectMenu() && interaction.customId === "select_build_service") {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const selected = interaction.values[0];
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
            await ticket.send({ content: `<@${interaction.user.id}>\n\nYou want the **${selected}**\n\nAn builder is coming soon!`, components: [row] });
            return interaction.editReply(`✅ Ticket created: ${ticket}`);
        }

        // ==========================================
        // 4. MODALS (DIGGING SUBMIT)
        // ==========================================
        if (interaction.isModalSubmit() && interaction.customId === "modal_digging") {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
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
            await ticket.send({ content: `<@${interaction.user.id}>\n\nYou want **${count}** blocks digged out\n\nAnd builder is digging this out soon!`, components: [row] });
            return interaction.editReply(`✅ Ticket created: ${ticket}`);
        }

    } catch (error) {
        console.error("Interaction Error:", error);
    }
});

client.login(process.env.DISCORD_TOKEN);
