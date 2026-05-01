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
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent,
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
const FILLED_APPS_CHANNEL_ID = "YOUR_FILLED_APPS_ID_HERE"; // ⚠️ REPLACE THIS ID
const GENERAL_TICKET_CHANNEL_ID = "1496891644895821865";
const STAFF_MOVE_LOG_ID = "1498701312991297546";
const STAFF_PANEL_CHANNEL_ID = "1498708753024028692"; 

let appQuestions = ["Why do you want to join Drox?", "What is your experience?", "How active are you?"];
const activeGiveaways = new Map();
const userStrikes = new Map(); // Note: This resets on bot restart. Use a database for permanent strikes.

// Helper for Ticket Buttons
const getTicketButtons = (claimed = false) => {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger).setEmoji("🔒")
    );
    if (!claimed) {
        row.addComponents(new ButtonBuilder().setCustomId("claim_ticket").setLabel("Claim").setStyle(ButtonStyle.Success).setEmoji("🙋‍♂️"));
    }
    return row;
};

client.once("ready", () => console.log(`✅ Drox Services Bot is online and fully synced!`));

client.on("interactionCreate", async (interaction) => {
    try {
        // ==========================================
        // 1. SLASH COMMANDS
        // ==========================================
        if (interaction.isChatInputCommand()) {
            
            // --- ADMIN ONLY COMMANDS ---
            const adminCommands = ["setup_hub", "staffmove", "say", "strike", "gwcreate"];
            if (adminCommands.includes(interaction.commandName)) {
                if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
                    return interaction.reply({ content: "❌ Access Denied.", flags: MessageFlags.Ephemeral });
                }
            }

            if (interaction.commandName === "say") {
                const msg = interaction.options.getString("message");
                const channel = interaction.options.getChannel("channel") || interaction.channel;
                await channel.send(msg);
                return interaction.reply({ content: "✅ Message sent.", flags: MessageFlags.Ephemeral });
            }

            if (interaction.commandName === "strike") {
                const user = interaction.options.getUser("user");
                const reason = interaction.options.getString("reason") || "No reason provided.";
                const count = (userStrikes.get(user.id) || 0) + 1;
                userStrikes.set(user.id, count);

                const strikeEmbed = new EmbedBuilder()
                    .setTitle("⚠️ Staff Strike")
                    .setDescription(`**Staff:** ${user}\n**Strike Count:** ${count}\n**Reason:** ${reason}\n**Moderator:** ${interaction.user}`)
                    .setColor("Orange").setTimestamp();

                const logChan = await client.channels.fetch(STAFF_MOVE_LOG_ID);
                await logChan.send({ embeds: [strikeEmbed] });
                return interaction.reply(`✅ Striken ${user.tag}. They now have ${count} strike(s).`);
            }

            if (interaction.commandName === "staffmove") {
                const user = interaction.options.getUser("user");
                const action = interaction.options.getString("type");
                const role = interaction.options.getRole("role");
                const member = await interaction.guild.members.fetch(user.id);

                if (action === "promote") await member.roles.add(role);
                else await member.roles.remove(role);

                const logEmbed = new EmbedBuilder()
                    .setTitle("🛡️ Staff Movement")
                    .setDescription(`**User:** ${user}\n**Action:** ${action.toUpperCase()}\n**Role:** ${role}\n**Moderator:** ${interaction.user}`)
                    .setColor(action === "promote" ? "Green" : "Red").setTimestamp();
                
                const logChan = await client.channels.fetch(STAFF_MOVE_LOG_ID);
                await logChan.send({ embeds: [logEmbed] });
                return interaction.reply(`✅ Successfully ${action}d ${user.tag}.`);
            }

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

                // 5. Staff Management
                const staffManageEmbed = new EmbedBuilder()
                    .setTitle("👔 Staff Management")
                    .setDescription("Use the buttons below to view rules or formally retire.")
                    .setColor("DarkGrey");
                const staffRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("view_staff_rules").setLabel("Staff Rules").setStyle(ButtonStyle.Secondary).setEmoji("📜"),
                    new ButtonBuilder().setCustomId("retire_staff").setLabel("Retire").setStyle(ButtonStyle.Danger).setEmoji("🚪")
                );
                await (await client.channels.fetch(STAFF_PANEL_CHANNEL_ID)).send({ embeds: [staffManageEmbed], components: [staffRow] });

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

            // --- TICKET COMMANDS ---
            if (interaction.commandName === "close") {
                if (!interaction.channel.name.includes("ticket") && !interaction.channel.name.includes("-")) return interaction.reply({ content: "You can only use this in a ticket.", flags: MessageFlags.Ephemeral});
                await interaction.reply("🔒 Closing in 3 seconds...");
                setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
            }

            if (interaction.commandName === "rename") {
                if (!interaction.channel.name.includes("ticket") && !interaction.channel.name.includes("-")) return interaction.reply({ content: "You can only use this in a ticket.", flags: MessageFlags.Ephemeral});
                const newName = interaction.options.getString("name");
                await interaction.channel.setName(newName);
                return interaction.reply(`✅ Channel renamed to **${newName}**`);
            }
        }

        // ==========================================
        // 2. BUTTON INTERACTIONS
        // ==========================================
        if (interaction.isButton()) {
            
            // --- STAFF MANAGEMENT ---
            if (interaction.customId === "view_staff_rules") {
                const rulesEmbed = new EmbedBuilder()
                    .setTitle("📜 Drox Official Staff Rules")
                    .setDescription("1. **Professionalism**: Respect in tickets.\n2. **Activity**: Notify Admins of 48h+ leave.\n3. **Claiming**: Only claim if ready.\n4. **Honesty**: No fake reports.\n5. **Confidentiality**: No leaking client info.")
                    .setColor("Blue").setFooter({ text: "Drox Services • Staff Only" });
                return interaction.reply({ embeds: [rulesEmbed], flags: MessageFlags.Ephemeral });
            }

            if (interaction.customId === "retire_staff") {
                if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: "❌ Not a staff member.", flags: MessageFlags.Ephemeral });
                const confirmEmbed = new EmbedBuilder()
                    .setTitle("🚪 Formal Retirement")
                    .setDescription("Are you sure you want to retire from the staff team? This action is permanent.")
                    .setColor("Red");
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("confirm_retire").setLabel("Yes, I'm sure").setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId("cancel_retire").setLabel("No, cancel").setStyle(ButtonStyle.Secondary)
                );
                return interaction.reply({ embeds: [confirmEmbed], components: [row], flags: MessageFlags.Ephemeral });
            }

            if (interaction.customId === "confirm_retire") {
                await interaction.member.roles.remove(STAFF_ROLE_ID);
                const logChan = await client.channels.fetch(STAFF_MOVE_LOG_ID);
                await logChan.send({ embeds: [new EmbedBuilder().setTitle("🚪 Retirement").setDescription(`${interaction.user} has retired.`).setColor("Grey")] });
                return interaction.update({ content: "✅ You have been removed from staff. Goodbye!", embeds: [], components: [] });
            }

            if (interaction.customId === "cancel_retire") {
                return interaction.update({ content: "Retirement cancelled.", embeds: [], components: [] });
            }

            // --- TICKET SYSTEM ---
            if (interaction.customId === "claim_ticket") {
                if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: "Staff only.", flags: MessageFlags.Ephemeral });
                
                // Read original embed and add claimant
                const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                    .addFields({ name: "Claimed By", value: `${interaction.user}`, inline: true })
                    .setColor("Green");

                return interaction.update({ 
                    embeds: [originalEmbed], 
                    components: [getTicketButtons(true)] // Pass true to remove the claim button
                });
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
                
                // Send completed app to Filled Apps Channel
                const filledAppsChan = await client.channels.fetch(FILLED_APPS_CHANNEL_ID);
                
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`app_accept_${interaction.user.id}`).setLabel("Accept").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`app_deny_${interaction.user.id}`).setLabel("Deny").setStyle(ButtonStyle.Danger)
                );

                const appEmbed = new EmbedBuilder()
                    .setTitle(`📝 Application: ${interaction.user.tag}`)
                    .setDescription(answers)
                    .setColor("Yellow");

                await filledAppsChan.send({ embeds: [appEmbed], components: [row] });
                return dm.send("✅ Submitted successfully!");
            }

            if (interaction.customId.startsWith("app_")) {
                if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) return interaction.reply({ content: "Admins only.", flags: MessageFlags.Ephemeral});
                const [_, action, userId] = interaction.customId.split("_");
                const targetUser = await client.users.fetch(userId);
                
                const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor(action === "accept" ? "Green" : "Red")
                    .addFields({ name: "Status", value: action === "accept" ? "✅ Accepted" : "❌ Denied" });

                if (action === "accept") {
                    await targetUser.send("✅ Your application was Accepted!").catch(()=>{});
                    await interaction.update({ embeds: [updatedEmbed], components: [] });
                } else {
                    await targetUser.send("❌ Your application was Denied.").catch(()=>{});
                    await interaction.update({ embeds: [updatedEmbed], components: [] });
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
        // 3. SELECT MENUS (TICKET QUESTIONS)
        // ==========================================
        if (interaction.isStringSelectMenu()) {
            
            // Build / Farm selection creates ticket immediately
            if (interaction.customId === "select_build_service") {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const val = interaction.values[0];
                const ticket = await interaction.guild.channels.create({
                    name: `build-${interaction.user.username}`,
                    type: ChannelType.GuildText, parent: TICKET_CATEGORY_ID,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                    ]
                });
                
                const embed = new EmbedBuilder().setTitle("Building Request").setDescription(`**Farm:** ${val}`).setColor("Gold");
                await ticket.send({ content: `<@${interaction.user.id}> | <@&${STAFF_ROLE_ID}>`, embeds: [embed], components: [getTicketButtons()] });
                return interaction.editReply(`✅ Ticket: ${ticket}`);
            }

            // General Tickets trigger Modals with Questions
            if (interaction.customId === "select_general_ticket") {
                const type = interaction.values[0];
                const modal = new ModalBuilder().setCustomId(`modal_ticket_${type}`).setTitle(`${type}`);

                if (type === "Giveaway Support") {
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q1").setLabel("Who hosted the giveaway?").setStyle(TextInputStyle.Short)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q2").setLabel("What did you win?").setStyle(TextInputStyle.Short)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q3").setLabel("Proof (Paste link or say 'In ticket')").setStyle(TextInputStyle.Paragraph))
                    );
                } else if (type === "General Support") {
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q1").setLabel("What do you need help with?").setStyle(TextInputStyle.Paragraph)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q2").setLabel("What is your IGN?").setStyle(TextInputStyle.Short))
                    );
                } else if (type === "Partnership") {
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q1").setLabel("How many members?").setStyle(TextInputStyle.Short)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q2").setLabel("Read reqs & agree? (Yes/No)").setStyle(TextInputStyle.Short)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q3").setLabel("Send Ad link/text").setStyle(TextInputStyle.Paragraph))
                    );
                }

                return await interaction.showModal(modal);
            }
        }

        // ==========================================
        // 4. MODAL SUBMITS
        // ==========================================
        if (interaction.isModalSubmit()) {
            
            if (interaction.customId === "modal_digging") {
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
                
                const embed = new EmbedBuilder().setTitle("Dig Request").setDescription(`**Amount:** ${interaction.fields.getTextInputValue("dig_count")} blocks`).setColor("#964B00");
                await ticket.send({ content: `<@${interaction.user.id}> | <@&${STAFF_ROLE_ID}>`, embeds: [embed], components: [getTicketButtons()] });
                return interaction.editReply(`✅ Ticket: ${ticket}`);
            }

            if (interaction.customId.startsWith("modal_ticket_")) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const type = interaction.customId.replace("modal_ticket_", "");
                
                const ticket = await interaction.guild.channels.create({
                    name: `${type.split(' ')[0].toLowerCase()}-${interaction.user.username}`,
                    type: ChannelType.GuildText, parent: TICKET_CATEGORY_ID,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                    ]
                });

                let responseText = `**New ${type} Ticket**\n\n`;
                interaction.fields.fields.forEach(f => {
                    responseText += `**${f.customId === "q1" ? "Question 1" : f.customId === "q2" ? "Question 2" : "Question 3"}:**\n${f.value}\n\n`;
                });

                const embed = new EmbedBuilder().setTitle(`${type} Request`).setDescription(responseText).setColor("Blue").setTimestamp();
                await ticket.send({ content: `<@${interaction.user.id}> | <@&${STAFF_ROLE_ID}>`, embeds: [embed], components: [getTicketButtons()] });
                
                return interaction.editReply(`✅ Ticket created: ${ticket}`);
            }
        }

    } catch (err) { console.error(err); }
});

client.login(process.env.DISCORD_TOKEN);
