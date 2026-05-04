require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, 
    Partials, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require("discord.js");
const ms = require("ms");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User]
});

// --- CONFIG ---
const AUTHORIZED_USER_ID = "1453824331346874500";
const TICKET_CATEGORY_ID = "1496950777275486429";
const STAFF_ROLE_ID = "1496951778967683072";
const NEW_STAFF_ROLE_ID = "1498572067212103730"; // The extra role for accepted apps
const GEN_HUB_ID = "1496891644895821865";
const APP_HUB_ID = "1498193257212022835";
const BUILD_HUB_ID = "1497906110219288646";

let giveawayWinners = new Map();

client.once("ready", () => console.log(`✅ ${client.user.tag} is online and secured!`));

client.on("interactionCreate", async (interaction) => {
    try {
        // --- 1. SLASH COMMANDS ---
        if (interaction.isChatInputCommand()) {
            const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
            const isWhitelistedUser = interaction.user.id === AUTHORIZED_USER_ID;

            if (!isAdmin && !isWhitelistedUser) {
                return interaction.reply({ content: "🚫 You do not have permission to use commands.", ephemeral: true });
            }

            await interaction.deferReply({ ephemeral: true });

            if (interaction.commandName === "setup_hub") {
                // General
                const genChan = await client.channels.fetch(GEN_HUB_ID);
                const genMenu = new StringSelectMenuBuilder().setCustomId("ticket_gen").setPlaceholder("Choose ticket type...").addOptions(
                    { label: "Giveaways", value: "Giveaways", emoji: "🎉" },
                    { label: "Partnership", value: "Partnership", emoji: "🤝" },
                    { label: "Support", value: "Support", emoji: "🛠️" }
                );
                await genChan.send({ components: [new ActionRowBuilder().addComponents(genMenu)] });

                // Apps
                const appChan = await client.channels.fetch(APP_HUB_ID);
                const appEmbed = new EmbedBuilder().setTitle("📝 Staff Apps").setDescription("Apply to join the team!").setColor("#2ecc71");
                const appBtn = new ButtonBuilder().setCustomId("ticket_app").setLabel("Apply Now").setStyle(ButtonStyle.Success);
                await appChan.send({ embeds: [appEmbed], components: [new ActionRowBuilder().addComponents(appBtn)] });

                // Build
                const buildChan = await client.channels.fetch(BUILD_HUB_ID);
                const buildEmbed = new EmbedBuilder().setTitle("🧱 Building Services").setDescription("Select a farm below.").setColor("#f1c40f");
                const buildMenu = new StringSelectMenuBuilder().setCustomId("ticket_build").setPlaceholder("Choose a farm...").addOptions(
                    { label: "Ikea v1-v4", value: "Ikea-Farm" },
                    { label: "Mauschu Starter", value: "Mauschu-Starter" },
                    { label: "Mauschu v1-v4", value: "Mauschu-Mid" },
                    { label: "Mauschu v5-v9", value: "Mauschu-High" },
                    { label: "Fire Azure v1-v3", value: "Fire-Azure" },
                    { label: "Lox v1-v5", value: "Lox-Farm" },
                    { label: "Mcds 240 Smoker", value: "Mcds-Smoker" },
                    { label: "Your Schematics", value: "Custom-Schematic" }
                );
                await buildChan.send({ embeds: [buildEmbed], components: [new ActionRowBuilder().addComponents(buildMenu)] });

                return interaction.editReply("Hubs spawned!");
            }

            if (interaction.commandName === "gwcreate") {
                const prize = interaction.options.getString("prize");
                const duration = ms(interaction.options.getString("time"));
                const winnersCount = interaction.options.getInteger("winners");

                if (!duration) return interaction.editReply("❌ Invalid time format!");

                const endUnix = Math.floor((Date.now() + duration) / 1000);
                const embed = new EmbedBuilder()
                    .setTitle("🎊 NEW GIVEAWAY 🎊")
                    .setDescription(`**Prize:** ${prize}\n**Winners:** ${winnersCount}\n**Ends:** <t:${endUnix}:R>`)
                    .setColor("#9b59b6").setFooter({ text: "React with 🎉 to enter!" });

                const msg = await interaction.channel.send({ embeds: [embed] });
                await msg.react("🎉");
                await interaction.editReply("Giveaway started!");

                setTimeout(async () => {
                    const fetched = await interaction.channel.messages.fetch(msg.id);
                    const users = await fetched.reactions.cache.get("🎉").users.fetch();
                    const entries = users.filter(u => !u.bot).map(u => u);

                    if (entries.length === 0) return interaction.channel.send(`Giveaway ended with no entries.`);

                    const winners = entries.sort(() => 0.5 - Math.random()).slice(0, winnersCount);
                    giveawayWinners.set(msg.id, winners.map(w => w.id));

                    const endEmbed = new EmbedBuilder()
                        .setTitle("🎊 GIVEAWAY ENDED 🎊")
                        .setDescription(`**Prize:** ${prize}\n**Winners:** ${winners.join(", ")}\n\nClick to claim!`)
                        .setColor("#34495e");

                    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`claim_${msg.id}`).setLabel("Claim Prize").setStyle(ButtonStyle.Success));
                    await msg.edit({ embeds: [endEmbed], components: [row] });
                    interaction.channel.send(`🎉 Congratulations ${winners.join(", ")}! You won **${prize}**!`);
                }, duration);
            }

            if (interaction.commandName === "close") {
                await interaction.editReply("🔒 Closing in 3s...");
                setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
            }
            if (interaction.commandName === "rename") {
                const newName = interaction.options.getString("name");
                await interaction.channel.setName(newName);
                return interaction.editReply(`Channel renamed to ${newName}`);
            }
        }

        // --- 2. MODAL FOR APPLICATION ---
        if (interaction.isButton() && interaction.customId === "ticket_app") {
            const modal = new ModalBuilder().setCustomId("staff_app_modal").setTitle("Staff Application");

            const q1 = new TextInputBuilder().setCustomId("q1").setLabel("What is your IGN, Bal, and playtime?").setStyle(TextInputStyle.Short).setRequired(true);
            const q2 = new TextInputBuilder().setCustomId("q2").setLabel("What is your experience in being staff?").setStyle(TextInputStyle.Paragraph).setRequired(true);
            const q3 = new TextInputBuilder().setCustomId("q3").setLabel("How many Vouches/Scams do you have?").setStyle(TextInputStyle.Short).setRequired(true);
            const q4 = new TextInputBuilder().setCustomId("q4").setLabel("How many giveaways can you host a week?").setStyle(TextInputStyle.Short).setRequired(true);
            const q5 = new TextInputBuilder().setCustomId("q5").setLabel("Have you read the rules?").setStyle(TextInputStyle.Short).setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(q1),
                new ActionRowBuilder().addComponents(q2),
                new ActionRowBuilder().addComponents(q3),
                new ActionRowBuilder().addComponents(q4),
                new ActionRowBuilder().addComponents(q5)
            );
            return interaction.showModal(modal);
        }

        // --- 3. MODAL SUBMISSION (Creates App Ticket) ---
        if (interaction.isModalSubmit() && interaction.customId === "staff_app_modal") {
            await interaction.deferReply({ ephemeral: true });

            const ticket = await interaction.guild.channels.create({
                name: `staff-app-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: TICKET_CATEGORY_ID,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            const appEmbed = new EmbedBuilder()
                .setTitle(`New Staff Application: ${interaction.user.tag}`)
                .setColor("Orange")
                .addFields(
                    { name: "1. IGN, Bal, Playtime", value: interaction.fields.getTextInputValue("q1") },
                    { name: "2. Experience", value: interaction.fields.getTextInputValue("q2") },
                    { name: "3. Vouches/Scams", value: interaction.fields.getTextInputValue("q3") },
                    { name: "4. Giveaways per week", value: interaction.fields.getTextInputValue("q4") },
                    { name: "5. Read rules?", value: interaction.fields.getTextInputValue("q5") }
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`accept_${interaction.user.id}`).setLabel("Accept").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`deny_${interaction.user.id}`).setLabel("Deny").setStyle(ButtonStyle.Danger)
            );

            await ticket.send({ content: `Application submitted by ${interaction.user}!\n<@&${STAFF_ROLE_ID}>`, embeds: [appEmbed], components: [row] });
            return interaction.editReply(`Application submitted successfully! Check ${ticket}`);
        }

        // --- 4. ACCEPT / DENY BUTTONS ---
        if (interaction.isButton() && (interaction.customId.startsWith("accept_") || interaction.customId.startsWith("deny_"))) {
            // Check if clicker has Staff role or is Admin
            if (!interaction.member.roles.cache.has(STAFF_ROLE_ID) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: "❌ Only Staff can accept or deny applications.", ephemeral: true });
            }

            const isAccept = interaction.customId.startsWith("accept_");
            const targetUserId = interaction.customId.split("_")[1];
            
            await interaction.reply(`Application ${isAccept ? "Accepted ✅" : "Denied ❌"}. Messaging user and closing ticket in 5s...`);

            try {
                const targetMember = await interaction.guild.members.fetch(targetUserId);
                if (isAccept) {
                    await targetMember.roles.add([STAFF_ROLE_ID, NEW_STAFF_ROLE_ID]);
                    await targetMember.send("🎉 **Congratulations!** Your staff application has been ACCEPTED! You have been granted the Staff roles in the server.").catch(()=>{});
                } else {
                    await targetMember.send("❌ **Update on your application:** Unfortunately, your staff application has been DENIED at this time.").catch(()=>{});
                }
            } catch (err) {
                console.error("Failed to message or role user:", err);
            }

            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
            return;
        }

        // --- 5. REGULAR TICKETS (General/Build/Giveaway) ---
        if (interaction.isButton() || interaction.isStringSelectMenu()) {
            let panelName = "";

            if (interaction.customId.startsWith("claim_")) {
                const msgId = interaction.customId.split("_")[1];
                if (!giveawayWinners.get(msgId)?.includes(interaction.user.id)) {
                    return interaction.reply({ content: "❌ You are not a winner!", ephemeral: true });
                }
                panelName = "Giveaway-claim";
            } else if (interaction.customId === "ticket_gen") panelName = interaction.values[0];
            else if (interaction.customId === "ticket_build") panelName = interaction.values[0];

            if (panelName) {
                const ticket = await interaction.guild.channels.create({
                    name: `${panelName}-${interaction.user.username}`,
                    type: ChannelType.GuildText,
                    parent: TICKET_CATEGORY_ID,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                    ]
                });
                await ticket.send(`Welcome ${interaction.user}! You opened a **${panelName}** ticket.`);
                return interaction.reply({ content: `Ticket opened: ${ticket}`, ephemeral: true });
            }
        }

    } catch (error) {
        console.error("Interaction Error:", error);
    }
});

client.login(process.env.DISCORD_TOKEN);
