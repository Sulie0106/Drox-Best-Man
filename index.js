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

// 🛠️ --- CONFIGURATION (ALL IDS UPDATED) ---
const ADMIN_ROLE_ID = "1496951778967683072"; 
const STAFF_ROLE_ID = "1496951778967683072"; 
const TICKET_CATEGORY_ID = "1496950777275486429";

const DIGGING_CHANNEL_ID = "1497905935656554506";
const BUILDING_CHANNEL_ID = "1497906110219288646";
const APP_HUB_CHANNEL_ID = "1498193257212022835";
const APP_LOG_CHANNEL_ID = "1496241235810189453";
const GENERAL_TICKET_CHANNEL_ID = "1496891644895821865";
const STAFF_MOVE_LOG_ID = "1498701312991297546";

let appQuestions = ["Why do you want to join Drox?", "What is your experience?", "How active are you?"];
const activeGiveaways = new Map();

// Helper for Ticket Buttons
const getTicketButtons = () => new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("claim_ticket").setLabel("Claim").setStyle(ButtonStyle.Success).setEmoji("🙋‍♂️"),
    new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger).setEmoji("🔒")
);

client.once("ready", () => console.log(`✅ Drox Services Bot is online and IDs are synced!`));

client.on("interactionCreate", async (interaction) => {
    try {
        // ==========================================
        // 1. SLASH COMMANDS
        // ==========================================
        if (interaction.isChatInputCommand()) {
            if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
                return interaction.reply({ content: "❌ Access Denied.", flags: MessageFlags.Ephemeral });
            }

            // STAFF MOVE (PROMOTE/DEMOTE) - FIXED ERROR HERE
            if (interaction.commandName === "staffmove") {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                
                const user = interaction.options.getUser("user");
                const action = interaction.options.getString("type"); // "promote" or "demote"
                const role = interaction.options.getRole("role");
                const member = await interaction.guild.members.fetch(user.id);

                if (action === "promote") {
                    await member.roles.add(role);
                } else {
                    await member.roles.remove(role);
                }

                // Send to Staff Logs
                const logChan = await client.channels.fetch(STAFF_MOVE_LOG_ID);
                const logEmbed = new EmbedBuilder()
                    .setTitle("🛡️ Staff Movement")
                    .setDescription(`**User:** ${user}\n**Action:** ${action.toUpperCase()}\n**Role:** ${role}\n**Moderator:** ${interaction.user}`)
                    .setColor(action === "promote" ? "Green" : "Red")
                    .setTimestamp();
                
                await logChan.send({ embeds: [logEmbed] });
                return interaction.editReply(`✅ Successfully ${action}d ${user.tag}.`);
            }

            if (interaction.commandName === "setup_hub") {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                
                // Digging
                const digEmbed = new EmbedBuilder().setTitle("🪏 Digging Services").setDescription("Rates: $900/block dig, $850/block air.").setColor("#964B00");
                const digRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("open_digging_modal").setLabel("Request").setStyle(ButtonStyle.Primary));
                await (await client.channels.fetch(DIGGING_CHANNEL_ID)).send({ embeds: [digEmbed], components: [digRow] });

                // Building
                const buildEmbed = new EmbedBuilder().setTitle("🧱 Building Services").setDescription("Select a farm below.").setColor("#FFD700");
                const buildRow = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId("select_build_service").setPlaceholder("Choose a farm...")
                    .addOptions([
                        { label: "Ikea v1", value: "Ikea v1" }, { label: "Ikea v2", value: "Ikea v2" }, { label: "Ikea v3", value: "Ikea v3" }, { label: "Ikea v4", value: "Ikea v4" },
                        { label: "Intermidiate", value: "Intermidiate" }, { label: "Advanced", value: "Advanced" }, { label: "Mauschu v1", value: "Mauschu v1" },
                        { label: "Mauschu v2", value: "Mauschu v2" }, { label: "Mauschu v3", value: "Mauschu v3" }, { label: "Mauschu v4", value: "Mauschu v4" },
                        { label: "Mauschu v5", value: "Mauschu v5" }, { label: "Mauschu v6", value: "Mauschu v6" }, { label: "Mauschu v7", value: "Mauschu v7" },
                        { label: "Mauschu v8", value: "Mauschu v8" }, { label: "Mauschu v9", value: "Mauschu v9" }, { label: "Fire Azure v1", value: "Fire Azure v1" },
                        { label: "Fire Azure v2", value: "Fire Azure v2" }, { label: "Fire Azure v3", value: "Fire Azure v3" }, { label: "Lox v1", value: "Lox v1" },
                        { label: "Lox v2", value: "Lox v2" }, { label: "Lox v3", value: "Lox v3" }, { label: "Lox v4", value: "Lox v4" }, { label: "Lox v5", value: "Lox v5" },
                        { label: "Mcds 240", value: "Mcds farm" }, { label: "Custom", value: "Custom Schematic" }
                    ])
                );
                await (await client.channels.fetch(BUILDING_CHANNEL_ID)).send({ embeds: [buildEmbed], components: [buildRow] });

                // General Tickets
                const ticketEmbed = new EmbedBuilder().setTitle("🎫 Drox Support Tickets").setDescription("Open a ticket for any of the following:").setColor("Blue");
                const ticketRow = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId("select_general_ticket").setPlaceholder("Choose ticket type...")
                    .addOptions([
                        { label: "Giveaways", emoji: "🎉", value: "Giveaway Support" },
                        { label: "Partnership", emoji: "🤝", value: "Partnership" },
                        { label: "Market", emoji: "🛒", value: "Market" },
                        { label: "Report", emoji: "🚫", value: "Report" },
                        { label: "Support", emoji: "🛠️", value: "General Support" }
                    ])
                );
                await (await client.channels.fetch(GENERAL_TICKET_CHANNEL_ID)).send({ embeds: [ticketEmbed], components: [ticketRow] });

                // Apps
                const appEmbed = new EmbedBuilder().setTitle("📝 Staff Apps").setDescription("Apply now!").setColor("Green");
                const appRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("start_app").setLabel("Apply Now").setStyle(ButtonStyle.Success));
                await (await client.channels.fetch(APP_HUB_CHANNEL_ID)).send({ embeds: [appEmbed], components: [appRow] });

                await interaction.editReply("✅ All hubs setup!");
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
        // 2. BUTTONS
        // ==========================================
        if (interaction.isButton()) {
            
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

            if (interaction.customId === "claim_gw_prize") {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const isWinner = interaction.message.embeds[0].description.includes(interaction.user.id);
                if (!isWinner) return interaction.editReply("❌ Not a winner!");

                const ticket = await interaction.guild.channels.create({
                    name: `claim-${interaction.user.username}`,
                    type: ChannelType.GuildText, parent: TICKET_CATEGORY_ID,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                    ]
                });
                await ticket.send({ content: `🏆 <@${interaction.user.id}> here to claim their prize!`, components: [getTicketButtons()] });
                return interaction.editReply(`✅ Ticket: ${ticket}`);
            }

            if (interaction.customId === "join_gw") {
                const data = activeGiveaways.get(interaction.message.id);
                if (!data) return interaction.reply({ content: "Ended.", flags: MessageFlags.Ephemeral });
                if (!data.entrants.includes(interaction.user.id)) data.entrants.push(interaction.user.id);
                return interaction.reply({ content: "✅ Entered!", flags: MessageFlags.Ephemeral });
            }

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
