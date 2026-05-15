require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, 
    Partials, StringSelectMenuBuilder, AttachmentBuilder, ActivityType 
} = require("discord.js");
const ms = require("ms");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User]
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
    console.log(`✅ ${client.user.tag} is online!`);
    client.user.setActivity("Applications", { type: ActivityType.Watching });
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.channel.id === MUTE_PINGS_CHANNEL_ID) {
        await message.channel.send("# **Mute for no pings**").catch(() => {});
    }
});

client.on("interactionCreate", async (interaction) => {
    try {
        // --- SLASH COMMANDS ---
        if (interaction.isChatInputCommand()) {
            const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
            const isWhitelisted = interaction.user.id === AUTHORIZED_USER_ID;

            if (!isAdmin && !isWhitelisted) return interaction.reply({ content: "🚫 Restricted access.", ephemeral: true });

            if (interaction.commandName === "setup_hub") {
                await interaction.deferReply({ ephemeral: true });
                
                try {
                    // Gen Hub
                    const genChan = await client.channels.fetch(GEN_HUB_ID);
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

                    // App Hub
                    const appChan = await client.channels.fetch(APP_HUB_ID);
                    const appBtns = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId("app_staff").setLabel("Staff App").setStyle(ButtonStyle.Primary).setEmoji("🛡️"),
                        new ButtonBuilder().setCustomId("app_builder").setLabel("Builder App").setStyle(ButtonStyle.Success).setEmoji("🔨"),
                        new ButtonBuilder().setCustomId("app_pm").setLabel("Partner Manager").setStyle(ButtonStyle.Secondary).setEmoji("🤝")
                    );
                    await appChan.send({ 
                        embeds: [new EmbedBuilder().setTitle("📝 Recruitment").setDescription("Click a button to apply via DMs.").setColor("#2ecc71")], 
                        components: [appBtns] 
                    });

                    // Build Hub
                    const buildChan = await client.channels.fetch(BUILD_HUB_ID);
                    const buildMenu = new StringSelectMenuBuilder().setCustomId("ticket_build").setPlaceholder("Select Farm...").addOptions(
                        { label: "Ikea v1-v4", value: "Ikea-Farm" }, { label: "Mauschu Starter", value: "Mauschu-Starter" },
                        { label: "Mauschu v1-v4", value: "Mauschu-Mid" }
                    );
                    await buildChan.send({ 
                        embeds: [new EmbedBuilder().setTitle("🏗️ Construction").setDescription("Select a farm to request a build.").setColor("#e67e22")],
                        components: [new ActionRowBuilder().addComponents(buildMenu)] 
                    });

                    return interaction.editReply("✅ Hubs setup successfully.");
                } catch (err) {
                    return interaction.editReply(`❌ Setup failed. Check if IDs are correct and Bot has access. Error: ${err.message}`);
                }
            }
        }

        // --- BUTTONS ---
        if (interaction.isButton()) {
            if (interaction.customId.startsWith("app_")) {
                const type = interaction.customId.split("_")[1];
                // We attempt to DM first to see if they are blocked
                try {
                    await interaction.user.send(`✨ Starting your **${type}** application...`);
                    await interaction.reply({ content: "📩 Check your DMs!", ephemeral: true });
                    return handleDMApplication(interaction.user, type, interaction.guild);
                } catch (err) {
                    return interaction.reply({ content: "❌ I couldn't DM you! Please enable 'Allow Direct Messages from server members' in your Privacy Settings.", ephemeral: true });
                }
            }

            if (interaction.customId === "close_ticket") {
                await interaction.reply("🔒 Closing...");
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
            }

            if (interaction.customId.startsWith("claim_")) {
                const isMarket = interaction.channel.name.startsWith("market-");
                const roleReq = isMarket ? MARKET_ROLE_ID : STAFF_ROLE_ID;
                if (!interaction.member.roles.cache.has(roleReq)) return interaction.reply({ content: "❌ Unauthorized.", ephemeral: true });

                const creatorId = interaction.customId.split("_")[1];
                await interaction.channel.permissionOverwrites.set([
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: creatorId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]);
                return interaction.reply(`✅ Claimed by ${interaction.user}`);
            }

            if (interaction.customId.startsWith("dec_")) {
                const [ , decision, type, targetId] = interaction.customId.split("_");
                await interaction.deferUpdate(); // Acknowledge button immediately
                
                const isAccept = decision === "acc";
                const target = await interaction.guild.members.fetch(targetId).catch(() => null);
                
                if (target && isAccept) {
                    await target.roles.add([STAFF_ROLE_ID, NEW_STAFF_ROLE_ID]).catch(() => {});
                    await target.send(`🎉 Congratulations! Your **${type}** app was accepted.`).catch(() => {});
                } else if (target) {
                    await target.send(`❌ Sorry, your **${type}** application was denied.`).catch(() => {});
                }

                return setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
            }
        }

        // --- SELECT MENUS ---
        if (interaction.isStringSelectMenu()) {
            await interaction.deferReply({ ephemeral: true });
            const choice = interaction.values[0];
            const ticket = await createTicket(interaction, choice);
            await ticket.send({ 
                content: `${interaction.user} | <@&${STAFF_ROLE_ID}>`, 
                components: [createTicketButtons(interaction.user.id)] 
            });
            return interaction.editReply(`✅ Ticket: ${ticket}`);
        }

    } catch (e) {
        console.error(e);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: "⚠️ An internal error occurred.", ephemeral: true }).catch(() => {});
        }
    }
});

async function handleDMApplication(user, type, guild) {
    const questions = APP_QUESTIONS[type];
    const answers = [];

    for (const q of questions) {
        await user.send(`**Question:** ${q}`).catch(() => {});
        const filter = m => m.author.id === user.id;
        const collected = await user.dmChannel.awaitMessages({ filter, max: 1, time: 300000, errors: ['time'] }).catch(() => null);

        if (!collected) return user.send("❌ Timed out. Application cancelled.");
        answers.push({ q, a: collected.first().content });
    }

    const ticket = await guild.channels.create({
        name: `app-${type}-${user.username}`,
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID,
        permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: APP_VIEWER_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ]
    });

    const embed = new EmbedBuilder().setTitle(`${type.toUpperCase()} App: ${user.tag}`).setColor("Blue");
    answers.forEach(ans => embed.addFields({ name: ans.q, value: ans.a }));

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`dec_acc_${type}_${user.id}`).setLabel("Accept").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`dec_den_${type}_${user.id}`).setLabel("Deny").setStyle(ButtonStyle.Danger)
    );

    await ticket.send({ content: `<@${APP_VIEWER_ID}>`, embeds: [embed], components: [row] });
    return user.send("✅ Application submitted!");
}

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
