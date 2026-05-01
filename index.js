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
const ADMIN_ROLE_ID = "1496951778967683072"; 
const STAFF_ROLE_ID = "1496951778967683072"; 
const TICKET_CATEGORY_ID = "1496950777275486429";

const DIGGING_CHANNEL_ID = "1497905935656554506";
const BUILDING_CHANNEL_ID = "1497906110219288646";
const APP_HUB_CHANNEL_ID = "1498193257212022835";
const APP_LOG_CHANNEL_ID = "1496241235810189453";
const GENERAL_TICKET_CHANNEL_ID = "1496891644895821865";
const STAFF_MOVE_LOG_ID = "1498701312991297546";
const STAFF_PANEL_CHANNEL_ID = "1498708753024028692"; 

let appQuestions = ["Why do you want to join Drox?", "What is your experience?", "How active are you?"];
const activeGiveaways = new Map();

// Helper for Ticket Buttons
const getTicketButtons = () => new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("claim_ticket").setLabel("Claim").setStyle(ButtonStyle.Success).setEmoji("🙋‍♂️"),
    new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger).setEmoji("🔒")
);

client.once("ready", () => console.log(`✅ Drox Services Bot is online and fully synced!`));

client.on("interactionCreate", async (interaction) => {
    try {
        // ==========================================
        // 1. SLASH COMMANDS
        // ==========================================
        if (interaction.isChatInputCommand()) {
            if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
                return interaction.reply({ content: "❌ Access Denied.", flags: MessageFlags.Ephemeral });
            }

            // STAFF MOVE (PROMOTE/DEMOTE)
            if (interaction.commandName === "staffmove") {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                try {
                    const user = interaction.options.getUser("user");
                    const action = interaction.options.getString("type");
                    const role = interaction.options.getRole("role");
                    const member = await interaction.guild.members.fetch(user.id);

                    if (action === "promote") await member.roles.add(role);
                    else await member.roles.remove(role);

                    const logChan = await client.channels.fetch(STAFF_MOVE_LOG_ID);
                    const logEmbed = new EmbedBuilder()
                        .setTitle("🛡️ Staff Movement")
                        .setDescription(`**User:** ${user}\n**Action:** ${action.toUpperCase()}\n**Role:** ${role}\n**Moderator:** ${interaction.user}`)
                        .setColor(action === "promote" ? "Green" : "Red").setTimestamp();
                    
                    await logChan.send({ embeds: [logEmbed] });
                    return interaction.editReply(`✅ Successfully ${action}d ${user.tag}.`);
                } catch (err) {
                    return interaction.editReply(`❌ Failed. Check Bot hierarchy.`);
                }
            }

            // SETUP ALL HUBS
            if (interaction.commandName === "setup_hub") {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                
                // 1. Digging
                const digEmbed = new EmbedBuilder().setTitle("🪏 Digging Services").setDescription("Rates: $900/block dig, $850/block air.").setColor("#964B00");
                const digRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("open_digging_modal").setLabel("Request").setStyle(ButtonStyle.Primary));
                await (await client.channels.fetch(DIGGING_CHANNEL_ID)).send({ embeds: [digEmbed], components: [digRow] });

                // 2. Building
                const buildEmbed = new EmbedBuilder().setTitle("🧱 Building Services").setDescription("Select a farm below.").setColor("#FFD700");
                const buildRow = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId("select_build_service").setPlaceholder("Choose a farm...")
                    .addOptions([
                        { label: "Ikea v1", value: "Ikea v1" }, { label: "Ikea v2", value: "Ikea v2" }, { label: "Ikea v3", value: "Ikea v3" },
                        { label: "Advanced", value: "Advanced" }, { label: "Mauschu v1", value: "Mauschu v1" }, { label: "Mcds 240", value: "Mcds farm" }, { label: "Custom", value: "Custom Schematic" }
                    ])
                );
                await (await client.channels.fetch(BUILDING_CHANNEL_ID)).send({ embeds: [buildEmbed], components: [buildRow] });

                // 3. General Tickets
                const ticketEmbed = new EmbedBuilder().setTitle("🎫 Drox Support Tickets").setDescription("Open a ticket below:").setColor("Blue");
                const ticketRow = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId("select_general_ticket").setPlaceholder("Choose ticket type...")
                    .addOptions([
                        { label: "Giveaways", emoji: "🎉", value: "Giveaway Support" },
                        { label: "Partnership", emoji: "🤝", value: "Partnership" },
                        { label: "Support", emoji: "🛠️", value: "General Support" }
                    ])
                );
                await (await client.channels.fetch(GENERAL_TICKET_CHANNEL_ID)).send({ embeds: [ticketEmbed], components: [ticketRow] });

                // 4. Staff Apps
                const appEmbed = new EmbedBuilder().setTitle("📝 Staff Apps").setDescription("Apply to join the team!").setColor("Green");
                const appRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("start_app").setLabel("Apply Now").setStyle(ButtonStyle.Success));
                await (await client.channels.fetch(APP_HUB_CHANNEL_ID)).send({ embeds: [appEmbed], components: [appRow] });

                // 5. NEW: Staff Management
                const staffManageEmbed = new EmbedBuilder()
                    .setTitle("👔 Staff Management")
                    .setDescription("Use the buttons below to view rules or formally retire.")
                    .setColor("DarkGrey");
                const staffRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("view_staff_rules").setLabel("Staff Rules").setStyle(ButtonStyle.Secondary).setEmoji("📜"),
                    new ButtonBuilder().setCustomId("retire_staff").setLabel("Retire").setStyle(ButtonStyle.Danger).setEmoji("🚪")
                );
                await (await client.channels.fetch(STAFF_PANEL_CHANNEL_ID)).send({ embeds: [staffManageEmbed], components: [staffRow] });

                await interaction.editReply("✅ All hubs (Service, Apps, and Staff Management) setup!");
            }

            // GIVEAWAY CREATE
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
        // 2. BUTTON INTERACTIONS
        // ==========================================
        if (interaction.isButton()) {
            
            // --- STAFF MANAGEMENT BUTTONS ---
            if (interaction.customId === "view_staff_rules") {
                const rulesEmbed = new EmbedBuilder()
                    .setTitle("📜 Drox Official Staff Rules")
                    .setDescription("1. **Professionalism**: Respect in tickets.\n2. **Activity**: Notify Admins of 48h+ leave.\n3. **Claiming**: Only claim if ready.\n4. **Honesty**: No fake reports.\n5. **Confidentiality**: No leaking client info.")
                    .setColor("Blue").setFooter({ text: "Drox Services • Staff Only" });
                return interaction.reply({ embeds: [rulesEmbed], flags: MessageFlags.Ephemeral });
            }

            if (interaction.customId === "retire_staff") {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.editReply("❌ Not a staff member.");
                try {
                    await interaction.member.roles.remove(STAFF_ROLE_ID);
                    const logChan = await client.channels.fetch(STAFF_MOVE_LOG_ID);
                    const retireEmbed = new EmbedBuilder().setTitle("🚪 Staff Retirement").setDescription(`**User:** ${interaction.user} has formally retired.`).setColor("Orange").setTimestamp();
                    await logChan.send({ embeds: [retireEmbed] });
                    return interaction.editReply("✅ You have retired. Thank you!");
                } catch (e) { return interaction.editReply("❌ Error removing role."); }
            }

            // --- TICKET SYSTEM ---
            if (interaction.customId === "claim_ticket") {
                if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: "Staff only.", flags: MessageFlags.Ephemeral });
                return interaction.update({ content: `${interaction.message.content}\n\n👤 **Claimed by:** ${interaction.user}`, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger))] });
            }

            if (interaction.customId === "close_ticket") {
                if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: "Staff only.", flags: MessageFlags.Ephemeral });
                await interaction.reply("🔒 Closing...");
                setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
                return;
            }

            // --- GIVEAWAYS ---
            if (interaction.customId === "join_gw") {
                const data = activeGiveaways.get(interaction.message.id);
                if (!data) return interaction.reply({ content: "Ended.", flags: MessageFlags.Ephemeral });
                if (!data.entrants.includes(interaction.user.id)) data.entrants.push(interaction.user.id);
                return interaction.reply({ content: "✅ Entered!", flags: MessageFlags.Ephemeral });
            }

            // --- APPLICATIONS ---
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

            if (interaction.customId.startsWith("app_")) {
                const [_, action, userId] = interaction.customId.split("_");
                const targetUser = await client.users.fetch(userId);
                if (action === "accept") {
                    await targetUser.send("✅ Accepted!");
                    await interaction.update({ content: `✅ Accepted by ${interaction.user.tag}`, components: [] });
                } else {
                    await targetUser.send("❌ Denied.");
                    await interaction.update({ content: `❌ Denied by ${interaction.user.tag}`, components: [] });
                }
            }

            if (interaction.customId === "open_digging_modal") {
                const modal = new ModalBuilder().setCustomId("modal_digging").setTitle("Dig Request");
                const input = new TextInputBuilder().setCustomId("dig_count").setLabel("Count?").setStyle(TextInputStyle.Short);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return await interaction.showModal(modal);
            }
        }

        // ==========================================
        // 3. SELECT MENUS & MODALS
        // ==========================================
        if (interaction.isStringSelectMenu()) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const val = interaction.values[0];
            const ticket = await interaction.guild.channels.create({
                name: `${val.replace(/\s+/g, '-').toLowerCase()}-${interaction.user.username}`,
                type: ChannelType.GuildText, parent: TICKET_CATEGORY_ID,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });
            await ticket.send({ content: `<@${interaction.user.id}> opened a **${val}** ticket.`, components: [getTicketButtons()] });
            return interaction.editReply(`✅ Ticket: ${ticket}`);
        }

        if (interaction.isModalSubmit() && interaction.customId === "modal_digging") {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const ticket = await interaction.guild.channels.create({
                name: `digging-${interaction.user.username}`,
                type: ChannelType.GuildText, parent: TICKET_CATEGORY_ID,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });
            await ticket.send({ content: `<@${interaction.user.id}> wants **${interaction.fields.getTextInputValue("dig_count")}** blocks digged.`, components: [getTicketButtons()] });
            return interaction.editReply(`✅ Ticket: ${ticket}`);
        }

    } catch (err) { console.error(err); }
});

client.login(process.env.DISCORD_TOKEN);
