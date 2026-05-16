require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, 
    Partials, StringSelectMenuBuilder 
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

// ==========================================
// 🛠️ CONFIGURATION & IDs
// ==========================================
const ROLES = {
    staff: "1487093799304954047",
    newStaff: "1489175813398986782",
    market: "1500770062762639394"
};

const CATEGORIES = {
    partnership: "1491159170265907390",
    market: "1491159751290261565",
    support: "1491166812379943175",
    giveaway: "1481711966140764192",
    middleman: "1505224366642954290",
    build: "1491166812379943175"
};

const CHANNELS = {
    appsSubmit: "1488620961753464842",
    logs: "1492509983852466247",
    welcome: "1482451932600729742",
    genHub: "1481692635117785159",
    appHub: "1481691158148157517",
    buildHub: "1481692244884066425",
    diggingHub: "1481692194506145995",
    middlemanHub: "1488143050231517184"
};

const APP_QUESTIONS = {
    staff: ["IGN/Timezone?", "Previous Staff experience?", "Why do you want to join?", "Giveaways per week?", "Read the rules?"],
    builder: ["IGN/Playtime?", "Portfolio links?", "Familiar with WorldEdit?", "Hours a week dedicated to building?"],
    pm: ["IGN/Server history?", "Previous partner experience?", "Strategy for partners?", "Partnerships per week?"]
};

const activeGiveaways = new Map(); 

// ==========================================
// 🔔 EVENTS
// ==========================================
client.once("ready", () => {
    console.log(`\n✅ Bot successfully connected as: ${client.user.tag}\n`);
});

client.on("guildMemberAdd", async (member) => {
    const welcomeChan = await member.guild.channels.fetch(CHANNELS.welcome).catch(() => null);
    if (welcomeChan) {
        welcomeChan.send(`🎉 Welcome to the server, ${member}! Grab a pickaxe, read the rules, and enjoy your stay! ⛏️✨`);
    }
});

// ==========================================
// 🚀 INTERACTION HANDLER
// ==========================================
client.on("interactionCreate", async (interaction) => {
    try {
        if (interaction.isChatInputCommand() || interaction.isStringSelectMenu()) {
            await interaction.deferReply({ ephemeral: true }).catch(() => {});
        } else if (interaction.isButton()) {
            if (!interaction.customId.startsWith("gw_join_")) {
                await interaction.deferReply({ ephemeral: true }).catch(() => {});
            }
        }
    } catch (err) { return; }

    try {
        if (interaction.isChatInputCommand()) {
            
            if (interaction.commandName === "setup_hub") {
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.editReply("🚫 Access denied.");

                const genChan = await client.channels.fetch(CHANNELS.genHub).catch(() => null);
                if (genChan) {
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
                }

                const appChan = await client.channels.fetch(CHANNELS.appHub).catch(() => null);
                if (appChan) {
                    const appBtns = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId("app_staff").setLabel("Staff App").setStyle(ButtonStyle.Primary).setEmoji("🛡️"),
                        new ButtonBuilder().setCustomId("app_builder").setLabel("Builder App").setStyle(ButtonStyle.Success).setEmoji("🔨"),
                        new ButtonBuilder().setCustomId("app_pm").setLabel("Partner Manager").setStyle(ButtonStyle.Secondary).setEmoji("🤝")
                    );
                    await appChan.send({ embeds: [new EmbedBuilder().setTitle("📝 Recruitment").setDescription("Click a button below to apply!").setColor("#2ecc71")], components: [appBtns] });
                }

                const buildChan = await client.channels.fetch(CHANNELS.buildHub).catch(() => null);
                if (buildChan) {
                    const buildBtn = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId("ticket_btn_build").setLabel("Request Build").setStyle(ButtonStyle.Success).setEmoji("🏗️")
                    );
                    await buildChan.send({ embeds: [new EmbedBuilder().setTitle("🏗️ Construction").setDescription("Click below to request a building service.").setColor("#e67e22")], components: [buildBtn] });
                }

                const digChan = await client.channels.fetch(CHANNELS.diggingHub).catch(() => null);
                if (digChan) {
                    const digBtn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("ticket_btn_digging").setLabel("Order Digging").setStyle(ButtonStyle.Primary).setEmoji("⛏️"));
                    await digChan.send({ embeds: [new EmbedBuilder().setTitle("⛏️ Digging Services").setDescription("Need an area cleared? Click below to order!").setColor("#95a5a6")], components: [digBtn] });
                }

                const mmChan = await client.channels.fetch(CHANNELS.middlemanHub).catch(() => null);
                if (mmChan) {
                    const mmBtn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("ticket_btn_middleman").setLabel("Request Middleman").setStyle(ButtonStyle.Primary).setEmoji("⚖️"));
                    await mmChan.send({ embeds: [new EmbedBuilder().setTitle("⚖️ Middleman Services").setDescription("Safe trades are a priority. Click below to request a Middleman.").setColor("#f1c40f")], components: [mmBtn] });
                }

                return interaction.editReply("✅ All 5 Hubs deployed successfully!");
            }

            if (interaction.commandName === "gwcreate") {
                if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.editReply("🚫 No permission.");

                const prize = interaction.options.getString("prize") || "Secret Prize";
                
                const durationStr = interaction.options.getString("duration") || 
                                    interaction.options.getString("time") || 
                                    interaction.options.getString("length") || 
                                    "10m";

                const durationMs = ms(durationStr);
                if (!durationMs) return interaction.editReply(`❌ Invalid time format ("${durationStr}")! Please use formats like \`30s\`, \`10m\`, \`2h\`, or \`1d\`.`);

                const endTimestamp = Math.floor((Date.now() + durationMs) / 1000);
                
                // 🛠️ FIX: Grabbed the configuration variables BEFORE building the Embed
                const winnersCount = interaction.options.getInteger("winners") || 1;

                const gwEmbed = new EmbedBuilder().setTitle(`🎉 GIVEAWAY: ${prize} 🎉`).setDescription(`Click 🎉 to join!\n\n⏳ **Ends:** <t:${endTimestamp}:R>\n👥 **Winners:** ${winnersCount}`).setColor("#FFD700");

                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`gw_join_${interaction.id}`).setLabel("Enter (0)").setStyle(ButtonStyle.Primary).setEmoji("🎉"));

                const gwMessage = await interaction.channel.send({ embeds: [gwEmbed], components: [row] });
                await interaction.editReply("✅ Giveaway deployed!");
                sendLog(interaction.guild, "🎉 Giveaway Started", `**Prize:** ${prize}\n**Host:** ${interaction.user}\n**Duration Input:** ${durationStr}`);

                const entrants = new Set();
                activeGiveaways.set(interaction.id, { messageId: gwMessage.id, channelId: interaction.channel.id, entrants, prize, winnersCount });

                setTimeout(async () => {
                    const currentGw = activeGiveaways.get(interaction.id);
                    if (!currentGw) return;

                    const targetChan = await client.channels.fetch(currentGw.channelId).catch(() => null);
                    if (!targetChan) return;

                    const targetMsg = await targetChan.messages.fetch(currentGw.messageId).catch(() => null);
                    const list = Array.from(currentGw.entrants);

                    if (list.length === 0) {
                        if (targetMsg) await targetMsg.edit({ components: [] });
                        if (targetMsg) await targetMsg.reply("😢 Nobody joined the giveaway!");
                        sendLog(targetChan.guild, "🛑 Giveaway Ended", `**Prize:** ${currentGw.prize}\n**Status:** Failed (No entries)`);
                    } else {
                        const winners = [];
                        const totalWinners = Math.min(currentGw.winnersCount, list.length);
                        for(let i=0; i < totalWinners; i++) winners.push(`<@${list.splice(Math.floor(Math.random() * list.length), 1)[0]}>`);

                        if (targetMsg) {
                            const closedEmbed = EmbedBuilder.from(targetMsg.embeds[0]).setDescription(`🔒 **Giveaway Closed**\n\n🎁 **Prize:** ${currentGw.prize}\n🏆 **Winners:** ${winners.join(", ")}`).setColor("#DD2E44");
                            const claimRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("claim_gw").setLabel("Claim Prize").setStyle(ButtonStyle.Success).setEmoji("🎁"));
                            
                            await targetMsg.edit({ embeds: [closedEmbed], components: [claimRow] });
                            await targetMsg.reply(`🎉 Congrats ${winners.join(", ")}! You won **${currentGw.prize}**! Click the button above to claim it.`);
                            sendLog(targetChan.guild, "🛑 Giveaway Ended", `**Prize:** ${currentGw.prize}\n**Winners:** ${winners.join(", ")}`);
                        }
                    }
                    activeGiveaways.delete(interaction.id);
                }, durationMs);
                return;
            }
            return interaction.editReply(`❌ Missing Logic.`);
        }

        if (interaction.isButton()) {
            const customId = interaction.customId;

            if (customId.startsWith("gw_join_")) {
                const gwId = customId.split("_")[2];
                const gwData = activeGiveaways.get(gwId);
                if (!gwData) return interaction.reply({ content: "❌ Expired.", ephemeral: true });

                if (gwData.entrants.has(interaction.user.id)) {
                    gwData.entrants.delete(interaction.user.id);
                    await interaction.reply({ content: "❌ Removed entry.", ephemeral: true });
                } else {
                    gwData.entrants.add(interaction.user.id);
                    await interaction.reply({ content: "🎉 Entered!", ephemeral: true });
                }
                const updatedRow = new ActionRowBuilder().addComponents(ButtonBuilder.from(interaction.message.components[0].components[0]).setLabel(`Enter (${gwData.entrants.size})`));
                return await interaction.message.edit({ components: [updatedRow] });
            }

            if (customId === "claim_gw") {
                const desc = interaction.message.embeds[0].description;
                if (!desc.includes(interaction.user.id)) {
                    return interaction.editReply("🚫 You are not a winner of this giveaway!");
                }
                
                const ticket = await createTicket(interaction, "gwclaim", CATEGORIES.giveaway);
                await ticket.send({ content: `${interaction.user} | <@&${ROLES.staff}>`, embeds: [new EmbedBuilder().setTitle("🎁 Giveaway Claim").setDescription("Please wait for a staff member to assist you with your prize.")], components: [createTicketButtons(interaction.user.id)] });
                sendLog(interaction.guild, "🎫 Ticket Opened", `**User:** ${interaction.user}\n**Type:** Giveaway Claim\n**Channel:** ${ticket}`);
                return interaction.editReply(`✅ Claim ticket opened: ${ticket}`);
            }

            if (customId.startsWith("ticket_btn_")) {
                const type = customId.split("_")[2];
                let catId = CATEGORIES.support;
                
                if (type === "digging") catId = CATEGORIES.market;
                if (type === "middleman") catId = CATEGORIES.middleman;
                if (type === "build") catId = CATEGORIES.build;

                const ticket = await createTicket(interaction, type, catId);
                await ticket.send({ content: `${interaction.user} | <@&${ROLES.staff}>`, components: [createTicketButtons(interaction.user.id)] });
                sendLog(interaction.guild, "🎫 Ticket Opened", `**User:** ${interaction.user}\n**Type:** ${type}\n**Channel:** ${ticket}`);
                return interaction.editReply(`✅ Ticket opened: ${ticket}`);
            }

            if (customId.startsWith("app_")) {
                const type = customId.split("_")[1];
                try {
                    await interaction.user.send(`✨ Starting your **${type.toUpperCase()}** application...`);
                    await interaction.editReply(`📩 Check DMs to complete application.`);
                    handleDMApplication(interaction.user, type, interaction.guild);
                } catch (dmErr) { return interaction.editReply("❌ DMs are closed!"); }
            }

            if (customId === "close_ticket") {
                await interaction.editReply("🔒 Closing in 3 seconds...");
                sendLog(interaction.guild, "🗑️ Ticket Closed", `**Closed By:** ${interaction.user}\n**Channel:** #${interaction.channel.name}`);
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
            }

            if (customId.startsWith("claim_")) {
                if (!interaction.member.roles.cache.has(ROLES.staff) && !interaction.member.roles.cache.has(ROLES.market)) return interaction.editReply("❌ Unauthorized.");
                const creatorId = customId.split("_")[1];
                await interaction.channel.permissionOverwrites.set([
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: creatorId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]);
                return interaction.editReply(`✅ Claimed by ${interaction.user}`);
            }

            if (customId.startsWith("dec_")) {
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.editReply("❌ Unauthorized.");

                const [ , decision, type, targetId] = customId.split("_");
                const isAccept = decision === "acc";
                const target = await interaction.guild.members.fetch(targetId).catch(() => null);
                
                if (target && isAccept) {
                    await target.roles.add([ROLES.staff, ROLES.newStaff]).catch(() => {});
                    await target.send(`🎉 Your **${type}** application was ACCEPTED!`).catch(() => {});
                } else if (target) {
                    await target.send(`❌ Your **${type}** application was DENIED.`).catch(() => {});
                }

                await interaction.message.edit({ components: [], content: `✅ Application evaluated as **${isAccept ? "ACCEPTED" : "DENIED"}** by ${interaction.user}` });
                sendLog(interaction.guild, "⚖️ Application Evaluated", `**Applicant ID:** ${targetId}\n**Type:** ${type}\n**Result:** ${isAccept ? "ACCEPTED" : "DENIED"}\n**Staff:** ${interaction.user}`);
                return interaction.editReply("✅ Evaluated.");
            }
        }

        if (interaction.isStringSelectMenu()) {
            const choice = interaction.values[0];
            let catId = CATEGORIES.support;
            
            if (choice === "Partnership") catId = CATEGORIES.partnership;
            if (choice === "Market") catId = CATEGORIES.market;
            if (choice === "Giveaways") catId = CATEGORIES.giveaway;

            const ticket = await createTicket(interaction, choice, catId);
            await ticket.send({ content: `${interaction.user} | <@&${ROLES.staff}>`, components: [createTicketButtons(interaction.user.id)] });
            sendLog(interaction.guild, "🎫 Ticket Opened", `**User:** ${interaction.user}\n**Type:** ${choice}\n**Channel:** ${ticket}`);
            return interaction.editReply(`✅ Ticket opened: ${ticket}`);
        }

    } catch (e) {
        return interaction.editReply(`⚠️ Error: ${e.message}`).catch(() => {});
    }
});

// ==========================================
// 🛠️ HELPER FUNCTIONS
// ==========================================
async function handleDMApplication(user, type, guild) {
    try {
        const questions = APP_QUESTIONS[type];
        const answers = [];

        for (const q of questions) {
            await user.send(`**Question:** ${q}`).catch(() => {});
            const filter = m => m.author.id === user.id;
            const collected = await user.dmChannel.awaitMessages({ filter, max: 1, time: 300000, errors: ['time'] }).catch(() => null);
            if (!collected) return user.send("❌ Expired.");
            answers.push({ q, a: collected.first().content });
        }

        const submitChan = await guild.channels.fetch(CHANNELS.appsSubmit).catch(() => null);
        if (!submitChan) return user.send("❌ Server config error: Could not find submission channel.");

        const embed = new EmbedBuilder().setTitle(`${type.toUpperCase()} Application`).setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() }).setColor("Blue").setTimestamp();
        answers.forEach(ans => embed.addFields({ name: ans.q, value: ans.a }));

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`dec_acc_${type}_${user.id}`).setLabel("Accept").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`dec_den_${type}_${user.id}`).setLabel("Deny").setStyle(ButtonStyle.Danger)
        );

        await submitChan.send({ content: `New Application from <@${user.id}>`, embeds: [embed], components: [row] });
        sendLog(guild, "📝 App Submitted", `**User:** ${user.tag}\n**Role:** ${type}`);
        return user.send("✅ Successfully submitted!");
    } catch (err) { console.error(err); }
}

async function createTicket(interaction, type, categoryId) {
    return await interaction.guild.channels.create({
        name: `${type.toLowerCase()}-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: categoryId, 
        permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: ROLES.staff, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ]
    });
}

// Global UI Buttons for Tickets
function createTicketButtons(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`claim_${userId}`).setLabel("Claim").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger)
    );
}

async function sendLog(guild, title, desc) {
    const logChan = await guild.channels.fetch(CHANNELS.logs).catch(() => null);
    if (!logChan) return;
    logChan.send({ embeds: [new EmbedBuilder().setTitle(title).setDescription(desc).setColor("#2F3136").setTimestamp()] });
}

client.login(process.env.DISCORD_TOKEN);
