require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, 
    Partials, StringSelectMenuBuilder, ActivityType 
} = require("discord.js");
const ms = require("ms"); // For parsing giveaway times (e.g., "1h", "30m")

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

// --- CONFIG ---
const AUTHORIZED_USER_ID = "1501597756794474497"; 
const APP_VIEWER_ID = "1453824331346874500"; 
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

// Global map to hold active giveaway data
const activeGiveaways = new Map(); 

client.once("ready", () => {
    console.log(`\n=================================`);
    console.log(`✅ Bot successfully connected as: ${client.user.tag}`);
    console.log(`=================================\n`);
});

// --- INTERACTION HANDLER ---
client.on("interactionCreate", async (interaction) => {
    
    // 1. SMART ACKNOWLEDGEMENT
    try {
        if (interaction.isChatInputCommand() || interaction.isStringSelectMenu()) {
            await interaction.deferReply({ ephemeral: true }).catch(() => {});
        } else if (interaction.isButton()) {
            // Giveaway join buttons need immediate page updates, not standard ephemerals
            if (!interaction.customId.startsWith("gw_join_")) {
                await interaction.deferReply({ ephemeral: true }).catch(() => {});
            }
        }
    } catch (err) {
        console.error("❌ Failed to acknowledge interaction:", err);
        return;
    }

    try {
        // --- SLASH COMMANDS ---
        if (interaction.isChatInputCommand()) {
            
            // --- SETUP HUB COMMAND ---
            if (interaction.commandName === "setup_hub") {
                const isAdmin = interaction.member?.permissions.has(PermissionFlagsBits.Administrator);
                const isWhitelisted = interaction.user.id === AUTHORIZED_USER_ID;
                if (!isAdmin && !isWhitelisted) return interaction.editReply("🚫 Access denied.");

                const genChan = await client.channels.fetch(GEN_HUB_ID).catch(() => null);
                const appChan = await client.channels.fetch(APP_HUB_ID).catch(() => null);
                const buildChan = await client.channels.fetch(BUILD_HUB_ID).catch(() => null);

                if (!genChan || !appChan || !buildChan) return interaction.editReply("❌ Hub setup failed. Check channel IDs.");

                // Gen Hub
                const genMenu = new StringSelectMenuBuilder().setCustomId("ticket_gen").setPlaceholder("Select Ticket Category...").addOptions(
                    { label: "Giveaways", value: "Giveaways", emoji: "🎉" }, { label: "Partnership", value: "Partnership", emoji: "🤝" },
                    { label: "Support", value: "Support", emoji: "🛠️" }, { label: "Market", value: "Market", emoji: "🛒" }
                );
                await genChan.send({ 
                    embeds: [new EmbedBuilder().setTitle("🎫 Support Center").setDescription("Select a category below to open a ticket.").setColor("#5865F2")],
                    components: [new ActionRowBuilder().addComponents(genMenu)] 
                });

                // App Hub
                const appBtns = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("app_staff").setLabel("Staff App").setStyle(ButtonStyle.Primary).setEmoji("🛡️"),
                    new ButtonBuilder().setCustomId("app_builder").setLabel("Builder App").setStyle(ButtonStyle.Success).setEmoji("🔨"),
                    new ButtonBuilder().setCustomId("app_pm").setLabel("Partner Manager").setStyle(ButtonStyle.Secondary).setEmoji("🤝")
                );
                await appChan.send({ 
                    embeds: [new EmbedBuilder().setTitle("📝 Recruitment").setDescription("Click a button below to apply!").setColor("#2ecc71")], 
                    components: [appBtns] 
                });

                // Build Hub
                const buildMenu = new StringSelectMenuBuilder().setCustomId("ticket_build").setPlaceholder("Select Farm...").addOptions(
                    { label: "Ikea v1-v4", value: "Ikea-Farm" }, { label: "Mauschu Starter", value: "Mauschu-Starter" }, { label: "Mauschu v1-v4", value: "Mauschu-Mid" }
                );
                await buildChan.send({ 
                    embeds: [new EmbedBuilder().setTitle("🏗️ Construction").setDescription("Select a farm schematic to request a build.").setColor("#e67e22")],
                    components: [new ActionRowBuilder().addComponents(buildMenu)] 
                });

                return interaction.editReply("✅ All Hubs deployed successfully!");
            }

            // --- GIVEAWAY CREATE COMMAND (/gwcreate) ---
            if (interaction.commandName === "gwcreate") {
                // Ensure caller has Manage Messages or Admin
                if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                    return interaction.editReply("🚫 You need 'Manage Messages' permission to host giveaways.");
                }

                // Safely grab arguments from slash options
                const prize = interaction.options.getString("prize") || "Secret Prize";
                const durationStr = interaction.options.getString("duration") || "10m";
                const winnersCount = interaction.options.getInteger("winners") || 1;

                const durationMs = ms(durationStr);
                if (!durationMs) return interaction.editReply("❌ Invalid time format! Use formats like `10m`, `2h`, or `1d`.");

                const endTimestamp = Math.floor((Date.now() + durationMs) / 1000);

                const gwEmbed = new EmbedBuilder()
                    .setTitle(`🎉 GIVEAWAY: ${prize} 🎉`)
                    .setDescription(`Click the 🎉 button below to join the draw!\n\n⏳ **Ends:** <t:${endTimestamp}:R> (<t:${endTimestamp}:F>)\n👥 **Winners:** ${winnersCount}\n🗣️ **Hosted by:** ${interaction.user}`)
                    .setColor("#FFD700")
                    .setFooter({ text: "Good luck everyone!" });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`gw_join_${interaction.id}`).setLabel("Enter (0)").setStyle(ButtonStyle.Primary).setEmoji("🎉")
                );

                // Send public announcement message into the channel
                const gwMessage = await interaction.channel.send({ embeds: [gwEmbed], components: [row] });
                await interaction.editReply("✅ Giveaway successfully deployed!");

                // Store state tracking data
                const entrants = new Set();
                activeGiveaways.set(interaction.id, {
                    messageId: gwMessage.id,
                    channelId: interaction.channel.id,
                    entrants: entrants,
                    prize: prize,
                    winnersCount: winnersCount
                });

                // End Timer
                setTimeout(async () => {
                    const currentGw = activeGiveaways.get(interaction.id);
                    if (!currentGw) return;

                    const targetChan = await client.channels.fetch(currentGw.channelId).catch(() => null);
                    if (!targetChan) return activeGiveaways.delete(interaction.id);

                    const targetMsg = await targetChan.messages.fetch(currentGw.messageId).catch(() => null);
                    const list = Array.from(currentGw.entrants);

                    if (list.length === 0) {
                        if (targetMsg) {
                            await targetMsg.edit({ components: [] });
                            await targetMsg.reply("😢 The giveaway ended, but nobody joined!");
                        }
                    } else {
                        // Pick random distinct winners
                        const winners = [];
                        const totalWinners = Math.min(currentGw.winnersCount, list.length);
                        
                        for(let i=0; i < totalWinners; i++) {
                            const index = Math.floor(Math.random() * list.length);
                            winners.push(`<@${list.splice(index, 1)[0]}>`);
                        }

                        if (targetMsg) {
                            const closedEmbed = EmbedBuilder.from(targetMsg.embeds[0])
                                .setDescription(`🔒 **Giveaway Closed**\n\n🎁 **Prize:** ${currentGw.prize}\n🏆 **Winners:** ${winners.join(", ")}`)
                                .setColor("#DD2E44");
                            await targetMsg.edit({ embeds: [closedEmbed], components: [] });
                            await targetMsg.reply(`🎉 Congratulations to our winner(s): ${winners.join(", ")}! You won **${currentGw.prize}**!`);
                        }
                    }
                    activeGiveaways.delete(interaction.id);
                }, durationMs);
                return;
            }

            // --- CATCH UNREGISTERED COMMANDS ---
            // If the code reaches here, it means you registered a command on Discord developers site but haven't written code for it yet.
            return interaction.editReply(`❌ The command \`/${interaction.commandName}\` is registered but lacks logic in your bot script.`);
        }

        // --- BUTTONS ---
        if (interaction.isButton()) {
            const customId = interaction.customId;

            // Handle Giveaway Entrants
            if (customId.startsWith("gw_join_")) {
                const gwId = customId.split("_")[2];
                const gwData = activeGiveaways.get(gwId);
                
                if (!gwData) return interaction.reply({ content: "❌ This giveaway has already expired.", ephemeral: true });

                if (gwData.entrants.has(interaction.user.id)) {
                    gwData.entrants.delete(interaction.user.id);
                    await interaction.reply({ content: "❌ Removed your entry from the giveaway.", ephemeral: true });
                } else {
                    gwData.entrants.add(interaction.user.id);
                    await interaction.reply({ content: "🎉 You have entered the giveaway!", ephemeral: true });
                }

                // Update original display counter on button string dynamically
                const updatedRow = new ActionRowBuilder().addComponents(
                    ButtonBuilder.from(interaction.message.components[0].components[0])
                        .setLabel(`Enter (${gwData.entrants.size})`)
                );
                return await interaction.message.edit({ components: [updatedRow] });
            }

            // Application Open Buttons
            if (customId.startsWith("app_")) {
                const type = customId.split("_")[1];
                try {
                    await interaction.user.send(`✨ Starting your **${type.toUpperCase()}** application...`);
                    await interaction.editReply(`📩 Please check your Direct Messages to complete the application.`);
                    handleDMApplication(interaction.user, type, interaction.guild);
                } catch (dmErr) {
                    return interaction.editReply("❌ Your Direct Messages are closed! Turn them on under Server Settings -> Privacy.");
                }
            }

            // Ticket Closing
            if (customId === "close_ticket") {
                await interaction.editReply("🔒 Closing ticket channel shortly...");
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
            }

            // Ticket Claiming
            if (customId.startsWith("claim_")) {
                const isMarket = interaction.channel.name.startsWith("market-");
                const roleReq = isMarket ? MARKET_ROLE_ID : STAFF_ROLE_ID;
                if (!interaction.member.roles.cache.has(roleReq)) return interaction.editReply("❌ Unauthorized staff tier.");

                const creatorId = customId.split("_")[1];
                await interaction.channel.permissionOverwrites.set([
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: creatorId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]);
                return interaction.editReply(`✅ Ticket claimed by ${interaction.user}`);
            }

            // Application Decisions
            if (customId.startsWith("dec_")) {
                const [ , decision, type, targetId] = customId.split("_");
                if (interaction.user.id !== APP_VIEWER_ID && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.editReply("❌ Action unauthorized.");
                }

                const isAccept = decision === "acc";
                const target = await interaction.guild.members.fetch(targetId).catch(() => null);
                
                if (target && isAccept) {
                    await target.roles.add([STAFF_ROLE_ID, NEW_STAFF_ROLE_ID]).catch(() => {});
                    await target.send(`🎉 Your **${type}** application was accepted!`).catch(() => {});
                } else if (target) {
                    await target.send(`❌ Your **${type}** application was declined.`).catch(() => {});
                }

                await interaction.editReply(`✅ Application evaluated: **${isAccept ? "ACCEPTED" : "DENIED"}**.`);
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
            }
        }

        // --- SELECT MENUS ---
        if (interaction.isStringSelectMenu()) {
            const choice = interaction.values[0];
            const ticket = await createTicket(interaction, choice);
            await ticket.send({ 
                content: `${interaction.user} | <@&${STAFF_ROLE_ID}>`, 
                components: [createTicketButtons(interaction.user.id)] 
            });
            return interaction.editReply(`✅ Ticket opened: ${ticket}`);
        }

    } catch (e) {
        console.error("❌ Execution Error:", e);
        return interaction.editReply(`⚠️ An unexpected error occurred: ${e.message}`).catch(() => {});
    }
});

// --- DM APPLICATIONS PROCESSOR ---
async function handleDMApplication(user, type, guild) {
    try {
        const questions = APP_QUESTIONS[type];
        const answers = [];

        for (const q of questions) {
            await user.send(`**Question:** ${q}`).catch(() => {});
            const filter = m => m.author.id === user.id;
            const collected = await user.dmChannel.awaitMessages({ filter, max: 1, time: 300000, errors: ['time'] }).catch(() => null);

            if (!collected) return user.send("❌ Application expired due to inactivity.");
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
        }).catch(() => null);

        if (!ticket) return user.send("❌ Error submitting application. Contact server management.");

        const embed = new EmbedBuilder().setTitle(`${type.toUpperCase()} Application Submission`).setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() }).setColor("Blue").setTimestamp();
        answers.forEach(ans => embed.addFields({ name: ans.q, value: ans.a }));

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`dec_acc_${type}_${user.id}`).setLabel("Accept").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`dec_den_${type}_${user.id}`).setLabel("Deny").setStyle(ButtonStyle.Danger)
        );

        await ticket.send({ content: `<@${APP_VIEWER_ID}> | New applicant awaiting verification.`, embeds: [embed], components: [row] });
        return user.send("✅ Your application has been successfully filed!");
    } catch (err) {
        console.error(err);
    }
}

// --- HELPER WRAPPERS ---
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
