require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, 
    Partials, StringSelectMenuBuilder, ActivityType 
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.MessageContent, // Covers content for BOTH guilds and DMs
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

// --- CONFIG ---
const AUTHORIZED_USER_ID = "1501597756794474497"; 
const APP_VIEWER_ID = "1453824331346874500"; 
const TRANSCRIPT_CHANNEL_ID = "1481710822471241758"; 
const MUTE_PINGS_CHANNEL_ID = "1481693716124012818";
const TICKET_CATEGORY_ID = "1491159170265907390";
const STAFF_ROLE_ID = "1487093799304954047";
const NEW_STAFF_ROLE_ID = "1489175813398986782";
const MARKET_ROLE_ID = "1500770062762639394"; 

const GEN_HUB_ID = "1481692635117785159";
const APP_HUB_ID = "1481691158148157517";
const BUILD_HUB_ID = "1481692244884066425";

const APP_QUESTIONS = {
    staff: [
        "What is your IGN, Balance, and total Playtime?",
        "Do you have previous Staff experience?",
        "Why do you want to join our staff team?",
        "How many giveaways can you host per week?",
        "Have you read and understood all server rules?"
    ],
    builder: [
        "What is your IGN and Playtime?",
        "Please provide links to portfolio/screenshots of your builds.",
        "Are you familiar with WorldEdit?",
        "How many hours a week can you dedicate to building?"
    ],
    pm: [
        "What is your IGN and server history?",
        "How many servers have you partnered with before?",
        "What is your strategy for finding partners?",
        "How many partnerships can you complete per week?"
    ]
};

const activeGiveaways = new Map(); 

client.once("ready", () => {
    console.log(`\n=================================`);
    console.log(`✅ Bot successfully connected as: ${client.user.tag}`);
    console.log(`=================================\n`);
});

// --- INTERACTION HANDLER ---
client.on("interactionCreate", async (interaction) => {
    try {
        if (interaction.isChatInputCommand() || interaction.isButton() || interaction.isStringSelectMenu()) {
            console.log(`[🚀 Interaction Received] Type: ${interaction.type} | ID: ${interaction.customId || interaction.commandName} from ${interaction.user.tag}`);
            await interaction.deferReply({ ephemeral: true }).catch(() => {});
        }
    } catch (err) {
        console.error("❌ Failed to defer interaction:", err);
        return;
    }

    try {
        // --- SLASH COMMANDS ---
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === "setup_hub") {
                const isAdmin = interaction.member?.permissions.has(PermissionFlagsBits.Administrator);
                const isWhitelisted = interaction.user.id === AUTHORIZED_USER_ID;
                if (!isAdmin && !isWhitelisted) {
                    return interaction.editReply("🚫 You do not have permission to use this command.");
                }

                console.log("[⚙️ Setup] Fetching channels...");
                const genChan = await client.channels.fetch(GEN_HUB_ID).catch(() => null);
                const appChan = await client.channels.fetch(APP_HUB_ID).catch(() => null);
                const buildChan = await client.channels.fetch(BUILD_HUB_ID).catch(() => null);

                if (!genChan || !appChan || !buildChan) {
                    return interaction.editReply("❌ Setup failed. One or more Hub Channel IDs are incorrect or invisible to the bot.");
                }

                // Setup Gen Hub
                const genMenu = new StringSelectMenuBuilder().setCustomId("ticket_gen").setPlaceholder("Select Ticket Category...").addOptions(
                    { label: "Giveaways", value: "Giveaways", emoji: "🎉" },
                    { label: "Partnership", value: "Partnership", emoji: "🤝" },
                    { label: "Support", value: "Support", emoji: "🛠️" },
                    { label: "Market", value: "Market", emoji: "🛒" }
                );
                await genChan.send({ 
                    embeds: [new EmbedBuilder().setTitle("🎫 Support Center").setDescription("Select a category below to open a ticket.").setColor("#5865F2")],
                    components: [new ActionRowBuilder().addComponents(genMenu)] 
                });

                // Setup App Hub
                const appBtns = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("app_staff").setLabel("Staff App").setStyle(ButtonStyle.Primary).setEmoji("🛡️"),
                    new ButtonBuilder().setCustomId("app_builder").setLabel("Builder App").setStyle(ButtonStyle.Success).setEmoji("🔨"),
                    new ButtonBuilder().setCustomId("app_pm").setLabel("Partner Manager").setStyle(ButtonStyle.Secondary).setEmoji("🤝")
                );
                await appChan.send({ 
                    embeds: [new EmbedBuilder().setTitle("📝 Recruitment").setDescription("Click a button below to apply! The bot will DM you.").setColor("#2ecc71")], 
                    components: [appBtns] 
                });

                // Setup Build Hub
                const buildMenu = new StringSelectMenuBuilder().setCustomId("ticket_build").setPlaceholder("Select Farm...").addOptions(
                    { label: "Ikea v1-v4", value: "Ikea-Farm" },
                    { label: "Mauschu Starter", value: "Mauschu-Starter" },
                    { label: "Mauschu v1-v4", value: "Mauschu-Mid" }
                );
                await buildChan.send({ 
                    embeds: [new EmbedBuilder().setTitle("🏗️ Construction").setDescription("Select a farm schematic to request a build.").setColor("#e67e22")],
                    components: [new ActionRowBuilder().addComponents(buildMenu)] 
                });

                return interaction.editReply("✅ All Hubs deployed successfully!");
            }
        }

        // --- BUTTONS ---
        if (interaction.isButton()) {
            let customId = interaction.customId;
            if (customId === "ticket_app") customId = "app_staff";

            if (customId.startsWith("app_")) {
                const type = customId.split("_")[1];
                console.log(`[📝 App] Attempting to send DM to ${interaction.user.tag} for ${type} app...`);

                try {
                    await interaction.user.send(`✨ Starting your **${type.toUpperCase()}** application...`);
                    await interaction.editReply(`📩 DMs opened! Please check your Direct Messages to complete the application.`);
                    
                    handleDMApplication(interaction.user, type, interaction.guild);
                } catch (dmErr) {
                    console.log(`[❌ App] Could not DM user ${interaction.user.tag}`);
                    return interaction.editReply("❌ I couldn't DM you! Please go to Server Settings -> Privacy Settings -> Enable 'Allow Direct Messages from server members'.");
                }
            }

            if (customId === "close_ticket") {
                await interaction.editReply("🔒 Closing ticket in 3 seconds...");
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
            }

            if (customId.startsWith("claim_")) {
                const isMarket = interaction.channel.name.startsWith("market-");
                const roleReq = isMarket ? MARKET_ROLE_ID : STAFF_ROLE_ID;
                if (!interaction.member.roles.cache.has(roleReq)) return interaction.editReply("❌ You do not have the required staff role to claim this ticket.");

                const creatorId = customId.split("_")[1];
                await interaction.channel.permissionOverwrites.set([
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: creatorId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]);
                return interaction.editReply(`✅ Ticket successfully claimed by ${interaction.user}`);
            }

            if (customId.startsWith("dec_")) {
                const [ , decision, type, targetId] = customId.split("_");
                if (interaction.user.id !== APP_VIEWER_ID && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.editReply("❌ Unauthorized.");
                }

                const isAccept = decision === "acc";
                const target = await interaction.guild.members.fetch(targetId).catch(() => null);
                
                if (target && isAccept) {
                    await target.roles.add([STAFF_ROLE_ID, NEW_STAFF_ROLE_ID]).catch(() => {});
                    await target.send(`🎉 Congratulations! Your **${type}** application was accepted.`).catch(() => {});
                } else if (target) {
                    await target.send(`❌ Sorry, your **${type}** application was denied.`).catch(() => {});
                }

                await interaction.editReply(`✅ Application processed as **${isAccept ? "ACCEPTED" : "DENIED"}**.`);
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
            }
        }

        // --- SELECT MENUS ---
        if (interaction.isStringSelectMenu()) {
            const choice = interaction.values[0];
            console.log(`[🎫 Ticket] Creating ticket for ${interaction.user.tag} (${choice})...`);
            const ticket = await createTicket(interaction, choice);
            await ticket.send({ 
                content: `${interaction.user} | <@&${STAFF_ROLE_ID}>`, 
                components: [createTicketButtons(interaction.user.id)] 
            });
            return interaction.editReply(`✅ Ticket opened successfully: ${ticket}`);
        }

    } catch (e) {
        console.error("❌ CRITICAL PROCESSING ERROR:", e);
        return interaction.editReply(`⚠️ An internal error occurred: ${e.message}`).catch(() => {});
    }
});

// --- DM HANDLER ---
async function handleDMApplication(user, type, guild) {
    try {
        const questions = APP_QUESTIONS[type];
        const answers = [];

        for (const q of questions) {
            await user.send(`**Question:** ${q}`).catch(() => {});
            const filter = m => m.author.id === user.id;
            const collected = await user.dmChannel.awaitMessages({ filter, max: 1, time: 300000, errors: ['time'] }).catch(() => null);

            if (!collected) {
                return user.send("❌ Application closed due to inactivity (5-minute timeout).");
            }
            answers.push({ q, a: collected.first().content });
        }

        console.log(`[📝 App] Creating channel for ${user.tag}'s application submission...`);
        const ticket = await guild.channels.create({
            name: `app-${type}-${user.username}`,
            type: ChannelType.GuildText,
            parent: TICKET_CATEGORY_ID,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: APP_VIEWER_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        }).catch((err) => {
            console.error("❌ Could not create application channel. Missing Permissions or Category ID invalid:", err);
            return null;
        });

        if (!ticket) {
            return user.send("❌ Server configuration error: Unable to submit your application. Please notify an administrator.");
        }

        const embed = new EmbedBuilder().setTitle(`${type.toUpperCase()} Application Submission`).setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() }).setColor("Blue").setTimestamp();
        answers.forEach(ans => embed.addFields({ name: ans.q, value: ans.a }));

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`dec_acc_${type}_${user.id}`).setLabel("Accept").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`dec_den_${type}_${user.id}`).setLabel("Deny").setStyle(ButtonStyle.Danger)
        );

        await ticket.send({ content: `<@${APP_VIEWER_ID}> | New applicant waiting for review.`, embeds: [embed], components: [row] });
        return user.send("✅ Your application has been successfully submitted to the staff team!");
    } catch (err) {
        console.error("Error in handleDMApplication process:", err);
    }
}

// --- HELPERS ---
async function createTicket(interaction, type) {
    return await interaction.guild.channels.create({
        name: `${type.toLowerCase()}-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID,
        permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ]
    });
}

function createTicketButtons(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`claim_${userId}`).setLabel("Claim").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger)
    );
}

client.login(process.env.DISCORD_TOKEN);
