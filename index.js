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

// 🛠️ --- CONFIGURATION (FILL THESE IN!) ---
const ADMIN_ROLE_ID = "1496951778967683072"; 
const DIGGING_CHANNEL_ID = "1497905935656554506";
const BUILDING_CHANNEL_ID = "1497906110219288646";
const APP_HUB_CHANNEL_ID = "1498193257212022835";
const APP_LOG_CHANNEL_ID = "1496241235810189453";

// ⚠️ IMPORTANT: Replace these with your actual IDs!
const TICKET_CATEGORY_ID = "1496950777275486429"; 
const STAFF_ROLE_ID = "1496951778967683072";     

let appQuestions = ["Why do you want to join Drox?", "What is your experience?", "How active are you?"];
const activeGiveaways = new Map();

client.once("ready", () => console.log(`✅ Drox Services Bot is online!`));

client.on("interactionCreate", async (interaction) => {
    try {
        // ==========================================
        // 1. SLASH COMMANDS (ADMIN ROLE ONLY)
        // ==========================================
        if (interaction.isChatInputCommand()) {
            if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
                return interaction.reply({ content: "❌ You don't have the Admin role.", flags: MessageFlags.Ephemeral });
            }

            if (interaction.commandName === "setup_hub") {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                
                // Digging Hub
                const digEmbed = new EmbedBuilder().setTitle("🪏 Drox Digging Services").setDescription("Rates:\n• $900/block dig\n• $850/block air\n• 7.5m for good cords").setColor("#964B00");
                const digRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("open_digging_modal").setLabel("Request builder").setStyle(ButtonStyle.Primary));
                await (await client.channels.fetch(DIGGING_CHANNEL_ID)).send({ embeds: [digEmbed], components: [digRow] });

                // Building Hub (Full 25 Options)
                const buildEmbed = new EmbedBuilder().setTitle("🧱 Drox Building Services").setDescription("Select a farm below.").setColor("#FFD700");
                const buildRow = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId("select_build_service").setPlaceholder("Choose a farm...")
                    .addOptions([
                        { label: "Ikea v1", description: "55m", value: "Ikea v1" }, { label: "Ikea v2", description: "90m", value: "Ikea v2" },
                        { label: "Ikea v3", description: "145m", value: "Ikea v3" }, { label: "Ikea v4", description: "200m", value: "Ikea v4" },
                        { label: "Intermidiate farm", description: "70m", value: "Intermidiate farm" }, { label: "Advanced farm", description: "85m", value: "Advanced farm" },
                        { label: "Mauschu v1", description: "100m", value: "Mauschu v1" }, { label: "Mauschu v2", description: "155m", value: "Mauschu v2" },
                        { label: "Mauschu v3", description: "205m", value: "Mauschu v3" }, { label: "Mauschu v4", description: "255m", value: "Mauschu v4" },
                        { label: "Mauschu v5", description: "300m", value: "Mauschu v5" }, { label: "Mauschu v6", description: "370m", value: "Mauschu v6" },
                        { label: "Mauschu v7", description: "500m", value: "Mauschu v7" }, { label: "Mauschu v8", description: "575m", value: "Mauschu v8" },
                        { label: "Mauschu v9", description: "650m", value: "Mauschu v9" }, { label: "Fire Azure v1", description: "180m", value: "Fire Azure v1" },
                        { label: "Fire Azure v2", description: "240m", value: "Fire Azure v2" }, { label: "Fire Azure v3", description: "650m", value: "Fire Azure v3" },
                        { label: "Lox v1", description: "50m", value: "Lox v1" }, { label: "Lox v2", description: "85m", value: "Lox v2" },
                        { label: "Lox v3", description: "135m", value: "Lox v3" }, { label: "Lox v4", description: "170m", value: "Lox v4" },
                        { label: "Lox v5", description: "230m", value: "Lox v5" }, { label: "Mcds 240 smoker", description: "75m", value: "Mcds farm" },
                        { label: "Your Schematics", description: "Negotiable", value: "Custom" }
                    ])
                );
                await (await client.channels.fetch(BUILDING_CHANNEL_ID)).send({ embeds: [buildEmbed], components: [buildRow] });

                // Application Hub
                const appEmbed = new EmbedBuilder().setTitle("📝 Staff Apps").setDescription("Apply to Drox!").setColor("Green");
                const appRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("start_app").setLabel("Apply Now").setStyle(ButtonStyle.Success));
                await (await client.channels.fetch(APP_HUB_CHANNEL_ID)).send({ embeds: [appEmbed], components: [appRow] });

                await interaction.editReply("✅ Hubs setup!");
            }

            if (interaction.commandName === "gwcreate") {
                const prize = interaction.options.getString("prize");
                const duration = ms(interaction.options.getString("time"));
                const winners = interaction.options.getInteger("winners");
                const endTime = Math.floor((Date.now() + duration) / 1000);
                
                const embed = new EmbedBuilder().setTitle("🎉 GIVEAWAY").setDescription(`Prize: **${prize}**\nEnds: <t:${endTime}:R>`).setColor("Gold");
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("join_gw").setLabel("Join!").setStyle(ButtonStyle.Primary));

                const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
                activeGiveaways.set(msg.id, { prize, winners, entrants: [] });

                setTimeout(async () => {
                    const data = activeGiveaways.get(msg.id);
                    const winnerList = data.entrants.sort(() => 0.5 - Math.random()).slice(0, data.winners);
                    const endEmbed = new EmbedBuilder().setTitle("🎊 ENDED").setDescription(`Prize: **${prize}**\nWinners: ${winnerList.length ? winnerList.map(id => `<@${id}>`).join(", ") : "None"}`).setColor("Grey");
                    await msg.edit({ embeds: [endEmbed], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("claim_gw_prize").setLabel("Claim Prize").setStyle(ButtonStyle.Success))] });
                }, duration);
            }
        }

        // ==========================================
        // 2. BUTTONS & ACTIONS
        // ==========================================
        if (interaction.isButton()) {
            
            // --- CLAIM GIVEAWAY PRIZE (FIXED VERSION) ---
            if (interaction.customId === "claim_gw_prize") {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const isWinner = interaction.message.embeds[0].description.includes(interaction.user.id);
                if (!isWinner) return interaction.editReply("❌ Only winners can claim!");

                if (TICKET_CATEGORY_ID.includes("PASTE")) return interaction.editReply("❌ Admin: Set Category ID in code.");

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

                await ticket.send(`🏆 <@${interaction.user.id}> won the giveaway! Claiming prize... <@&${STAFF_ROLE_ID}>`);
                return interaction.editReply(`✅ Ticket opened: ${ticket}`);
            }

            // Join Giveaway
            if (interaction.customId === "join_gw") {
                const data = activeGiveaways.get(interaction.message.id);
                if (!data) return interaction.reply({ content: "Ended.", flags: MessageFlags.Ephemeral });
                if (!data.entrants.includes(interaction.user.id)) data.entrants.push(interaction.user.id);
                return interaction.reply({ content: "✅ Entered!", flags: MessageFlags.Ephemeral });
            }

            // Start Staff Application
            if (interaction.customId === "start_app") {
                await interaction.reply({ content: "📩 Check DMs!", flags: MessageFlags.Ephemeral });
                const dm = await interaction.user.createDM();
                let answers = "";
                for (const q of appQuestions) {
                    await dm.send(`**${q}**`);
                    const msg = await dm.awaitMessages({ max: 1, time: 300000 }).then(c => c.first().content).catch(() => null);
                    if (!msg) return;
                    answers += `**${q}**\n${msg}\n\n`;
                }
                const logChan = await client.channels.fetch(APP_LOG_CHANNEL_ID);
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`app_accept_${interaction.user.id}`).setLabel("Accept").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`app_deny_${interaction.user.id}`).setLabel("Deny").setStyle(ButtonStyle.Danger)
                );
                await logChan.send({ content: `📝 **App from ${interaction.user.tag}**\n\n${answers}`, components: [row] });
                return dm.send("✅ Submitted!");
            }

            // App Review (Accept/Deny)
            if (interaction.customId.startsWith("app_")) {
                const [_, action, userId] = interaction.customId.split("_");
                const targetUser = await client.users.fetch(userId);
                if (action === "accept") {
                    await targetUser.send("✅ You were accepted to Drox!");
                    await interaction.update({ content: `✅ Accepted by ${interaction.user.tag}`, components: [] });
                } else {
                    await targetUser.send("❌ You were denied.");
                    await interaction.update({ content: `❌ Denied by ${interaction.user.tag}`, components: [] });
                }
            }

            // Digging Modal
            if (interaction.customId === "open_digging_modal") {
                const modal = new ModalBuilder().setCustomId("modal_digging").setTitle("Digging Request");
                const input = new TextInputBuilder().setCustomId("dig_count").setLabel("Block count?").setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return await interaction.showModal(modal);
            }

            // Ticket Claim/Close
            if (interaction.customId === "claim_ticket") {
                return interaction.update({ content: `${interaction.message.content}\n\n👤 **Claimed by:** ${interaction.user}`, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger))] });
            }
            if (interaction.customId === "close_ticket") {
                await interaction.reply("Closing...");
                setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
            }
        }

        // ==========================================
        // 3. SELECT MENUS & MODALS
        // ==========================================
        if (interaction.isStringSelectMenu() && interaction.customId === "select_build_service") {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const ticket = await interaction.guild.channels.create({
                name: `build-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: TICKET_CATEGORY_ID,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("claim_ticket").setLabel("Claim").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger));
            await ticket.send({ content: `<@${interaction.user.id}> wants **${interaction.values[0]}**!`, components: [row] });
            return interaction.editReply(`✅ Ticket: ${ticket}`);
        }

        if (interaction.isModalSubmit() && interaction.customId === "modal_digging") {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const ticket = await interaction.guild.channels.create({
                name: `dig-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: TICKET_CATEGORY_ID,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("claim_ticket").setLabel("Claim").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger));
            await ticket.send({ content: `<@${interaction.user.id}> wants **${interaction.fields.getTextInputValue("dig_count")}** blocks digged!`, components: [row] });
            return interaction.editReply(`✅ Ticket: ${ticket}`);
        }

    } catch (e) { console.error(e); }
});

client.login(process.env.DISCORD_TOKEN);
