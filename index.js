require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, 
    Partials, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, 
    TextInputStyle, AttachmentBuilder 
} = require("discord.js");

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
const APP_VIEWER_ID = "1463979533857456312"; 
const TRANSCRIPT_CHANNEL_ID = "1499498906419990692"; 
const MUTE_PINGS_CHANNEL_ID = "1496222658050785290";
const TICKET_CATEGORY_ID = "1496950777275486429";
const STAFF_ROLE_ID = "1496951778967683072";
const NEW_STAFF_ROLE_ID = "1498572067212103730";
const MARKET_ROLE_ID = "1500770062762639394"; // Role for Market tickets

const GEN_HUB_ID = "1496891644895821865";
const APP_HUB_ID = "1498193257212022835";
const BUILD_HUB_ID = "1497906110219288646";

client.once("ready", () => console.log(`✅ ${client.user.tag} is online!`));

// 1. AUTO-MESSAGE LOGIC
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.channel.id === MUTE_PINGS_CHANNEL_ID) {
        await message.channel.send("# **Mute for no pings**");
    }
});

client.on("interactionCreate", async (interaction) => {
    try {
        // --- SLASH COMMANDS ---
        if (interaction.isChatInputCommand()) {
            const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
            const isWhitelistedUser = interaction.user.id === AUTHORIZED_USER_ID;

            if (!isAdmin && !isWhitelistedUser) {
                return interaction.reply({ content: "🚫 No permission.", ephemeral: true });
            }

            if (interaction.commandName === "setup_hub") {
                await interaction.deferReply({ ephemeral: true });
                
                const genChan = await client.channels.fetch(GEN_HUB_ID);
                const genMenu = new StringSelectMenuBuilder().setCustomId("ticket_gen").setPlaceholder("Choose ticket type...").addOptions(
                    { label: "Giveaways", value: "Giveaways", emoji: "🎉" },
                    { label: "Partnership", value: "Partnership", emoji: "🤝" },
                    { label: "Support", value: "Support", emoji: "🛠️" },
                    { label: "Market", value: "Market", emoji: "🛒" }
                );
                await genChan.send({ components: [new ActionRowBuilder().addComponents(genMenu)] });

                const appChan = await client.channels.fetch(APP_HUB_ID);
                const appEmbed = new EmbedBuilder().setTitle("📝 Staff Apps").setDescription("Click the button below to apply!").setColor("#2ecc71");
                const appBtn = new ButtonBuilder().setCustomId("ticket_app").setLabel("Apply Now").setStyle(ButtonStyle.Success);
                await appChan.send({ embeds: [appEmbed], components: [new ActionRowBuilder().addComponents(appBtn)] });

                const buildChan = await client.channels.fetch(BUILD_HUB_ID);
                const buildMenu = new StringSelectMenuBuilder().setCustomId("ticket_build").setPlaceholder("Choose a farm...").addOptions(
                    { label: "Ikea v1-v4", value: "Ikea-Farm" }, { label: "Mauschu Starter", value: "Mauschu-Starter" },
                    { label: "Mauschu v1-v4", value: "Mauschu-Mid" }, { label: "Mauschu v5-v9", value: "Mauschu-High" },
                    { label: "Fire Azure v1-v3", value: "Fire-Azure" }, { label: "Lox v1-v5", value: "Lox-Farm" },
                    { label: "Mcds 240 Smoker", value: "Mcds-Smoker" }, { label: "Your Schematics", value: "Custom-Schematic" }
                );
                await buildChan.send({ components: [new ActionRowBuilder().addComponents(buildMenu)] });

                return interaction.editReply("✅ Hubs Spawned!");
            }
        }

        // --- BUTTON: APPLY NOW ---
        if (interaction.isButton() && interaction.customId === "ticket_app") {
            const modal = new ModalBuilder().setCustomId("modal_StaffApp").setTitle("Staff Application");
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q1").setLabel("IGN, Bal, Playtime?").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q2").setLabel("Staff Experience?").setStyle(TextInputStyle.Paragraph).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q3").setLabel("Vouches/Scams?").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q4").setLabel("Giveaways per week?").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q5").setLabel("Have you read the rules?").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return interaction.showModal(modal);
        }

        // --- SELECT MENUS ---
        if (interaction.isStringSelectMenu()) {
            const choice = interaction.values[0];
            if (interaction.customId === "ticket_build") {
                await interaction.deferReply({ ephemeral: true });
                const ticket = await createTicket(interaction, choice);
                await ticket.send({ content: `${interaction.user} | <@&${STAFF_ROLE_ID}>`, components: [createTicketButtons(interaction.user.id)] });
                return interaction.editReply(`Ticket opened: ${ticket}`);
            }
            if (interaction.customId === "ticket_gen") {
                let modal = new ModalBuilder().setCustomId(`modal_${choice}`).setTitle(`${choice} Questions`);
                if (choice === "Giveaways") {
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q1").setLabel("Who hosted?").setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q2").setLabel("What did you win?").setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q3").setLabel("What is your IGN?").setStyle(TextInputStyle.Short).setRequired(true))
                    );
                } else if (choice === "Support") {
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q1").setLabel("Need help with?").setStyle(TextInputStyle.Paragraph).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q2").setLabel("IGN and Bal?").setStyle(TextInputStyle.Short).setRequired(true))
                    );
                } else if (choice === "Partnership") {
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q1").setLabel("Member count?").setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q2").setLabel("Read requirements?").setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q3").setLabel("Send your AD").setStyle(TextInputStyle.Paragraph).setRequired(true))
                    );
                } else if (choice === "Market") {
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q1").setLabel("Buying/Selling? Amount?").setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q2").setLabel("Items?").setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q3").setLabel("IGN?").setStyle(TextInputStyle.Short).setRequired(true))
                    );
                }
                return interaction.showModal(modal);
            }
        }

        // --- MODAL SUBMISSIONS ---
        if (interaction.isModalSubmit()) {
            await interaction.deferReply({ ephemeral: true });
            const type = interaction.customId.replace("modal_", "");
            const ticket = await createTicket(interaction, type);

            const embed = new EmbedBuilder().setTitle(`${type} Information`).setColor("Blue");
            interaction.fields.fields.forEach(f => embed.addFields({ name: f.customId, value: f.value }));

            if (type === "StaffApp") {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`accept_${interaction.user.id}`).setLabel("Accept").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`deny_${interaction.user.id}`).setLabel("Deny").setStyle(ButtonStyle.Danger)
                );
                await ticket.send({ content: `New App from ${interaction.user}!\nAttention: <@${APP_VIEWER_ID}>`, embeds: [embed], components: [row] });
            } else {
                const pingRole = type === "Market" ? `<@&${MARKET_ROLE_ID}>` : `<@&${STAFF_ROLE_ID}>`;
                await ticket.send({ content: `${interaction.user} | ${pingRole}`, embeds: [embed], components: [createTicketButtons(interaction.user.id)] });
            }
            return interaction.editReply(`Ticket opened: ${ticket}`);
        }

        // --- BUTTON HANDLERS ---
        if (interaction.isButton()) {
            if (interaction.customId === "close_ticket") {
                await interaction.reply("🔒 Closing...");
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
            }

            if (interaction.customId.startsWith("claim_")) {
                const isMarket = interaction.channel.name.startsWith("market-");
                const requiredRole = isMarket ? MARKET_ROLE_ID : STAFF_ROLE_ID;

                if (!interaction.member.roles.cache.has(requiredRole)) {
                    return interaction.reply({ content: `❌ Only staff with the correct role can claim this.`, ephemeral: true });
                }

                const creatorId = interaction.customId.split("_")[1];
                await interaction.channel.permissionOverwrites.set([
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: creatorId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]);
                return interaction.reply(`✅ Claimed by ${interaction.user}. Locked to you and user.`);
            }

            // ACCEPT / DENY LOGIC
            if (interaction.customId.startsWith("accept_") || interaction.customId.startsWith("deny_")) {
                if (interaction.user.id !== APP_VIEWER_ID && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ content: "❌ Only the Staff Manager can do this.", ephemeral: true });
                }

                await interaction.deferReply({ ephemeral: true });
                const isAccept = interaction.customId.startsWith("accept_");
                const targetId = interaction.customId.split("_")[1];

                try {
                    const messages = await interaction.channel.messages.fetch({ limit: 100 });
                    const transcriptData = messages.reverse().map(m => `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content || "[Embed/Image]"}`).join("\n");
                    const attachment = new AttachmentBuilder(Buffer.from(transcriptData, "utf-8"), { name: `transcript-${targetId}.txt` });

                    const logChan = await client.channels.fetch(TRANSCRIPT_CHANNEL_ID);
                    const logEmbed = new EmbedBuilder()
                        .setTitle(`App Processed: ${isAccept ? "ACCEPTED" : "DENIED"}`)
                        .setDescription(`**User:** <@${targetId}>\n**By:** ${interaction.user}`)
                        .setColor(isAccept ? "Green" : "Red");
                    await logChan.send({ embeds: [logEmbed], files: [attachment] });

                    const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
                    if (targetMember) {
                        if (isAccept) {
                            await targetMember.roles.add([STAFF_ROLE_ID, NEW_STAFF_ROLE_ID]).catch(() => {});
                            await targetMember.send("🎉 Your staff application was **ACCEPTED**!").catch(() => {});
                        } else {
                            await targetMember.send("❌ Your staff application was **DENIED**.").catch(() => {});
                        }
                    }
                    await interaction.editReply("✅ Processed and ticket closing...");
                } catch (e) {
                    await interaction.editReply("⚠️ Processing error occurred.");
                }
                setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
            }
        }
    } catch (e) { console.error(e); }
});

async function createTicket(interaction, type) {
    const overwrites = [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
    ];

    if (type === "StaffApp") {
        overwrites.push({ id: APP_VIEWER_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
    } else if (type === "Market") {
        overwrites.push({ id: MARKET_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
    } else {
        overwrites.push({ id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
    }

    return await interaction.guild.channels.create({
        name: `${type.toLowerCase()}-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID,
        permissionOverwrites: overwrites
    });
}

function createTicketButtons(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`claim_${userId}`).setLabel("Claim").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger)
    );
}

client.login(process.env.DISCORD_TOKEN);
