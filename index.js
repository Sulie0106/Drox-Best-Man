require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, 
    Partials, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, 
    TextInputStyle, AttachmentBuilder 
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

// --- CONFIG (Updated with your new IDs) ---
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

// Giveaway Storage
const activeGiveaways = new Map(); 

client.once("ready", () => {
    console.log(`✅ 𝓒𝓾𝓻𝓻𝓸𝓹𝓽𝓲𝓸𝓷 𝓪𝓷𝓭 𝓭𝓸𝓻𝓪 𝓫𝓸𝓽 is online and ready for action!`);
});

// --- 1. AUTO-MESSAGE LOGIC ---
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.channel.id === MUTE_PINGS_CHANNEL_ID) {
        await message.channel.send("# **Mute for no pings**");
    }
});

client.on("interactionCreate", async (interaction) => {
    try {
        // --- 2. SLASH COMMANDS HANDLER ---
        if (interaction.isChatInputCommand()) {
            const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
            const isWhitelistedUser = interaction.user.id === AUTHORIZED_USER_ID;

            if (!isAdmin && !isWhitelistedUser) {
                return interaction.reply({ content: "🚫 You do not have permission to use this command.", ephemeral: true });
            }

            // Command: /setup_hub
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

            // Command: /gwcreate
            if (interaction.commandName === "gwcreate") {
                const prize = interaction.options.getString("prize");
                const timeStr = interaction.options.getString("time");
                const winnerCount = interaction.options.getInteger("winners");
                const durationMs = ms(timeStr);

                if (!durationMs) return interaction.reply({ content: "❌ Invalid time format!", ephemeral: true });

                const endsAt = Math.floor((Date.now() + durationMs) / 1000);
                const embed = new EmbedBuilder()
                    .setTitle("🎉 **GIVEAWAY** 🎉")
                    .setDescription(`**Prize:** ${prize}\n**Winners:** ${winnerCount}\n**Ends:** <t:${endsAt}:R>\n**Hosted by:** ${interaction.user}`)
                    .setColor("Gold");

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("gw_join").setLabel("Join Giveaway").setStyle(ButtonStyle.Success)
                );

                const msg = await interaction.channel.send({ embeds: [embed], components: [row] });
                activeGiveaways.set(msg.id, { prize, winners: winnerCount, entrants: new Set(), hostId: interaction.user.id });

                setTimeout(async () => {
                    const data = activeGiveaways.get(msg.id);
                    if (!data) return;
                    activeGiveaways.delete(msg.id);

                    const entrants = Array.from(data.entrants);
                    if (entrants.length === 0) return msg.edit({ content: "❌ Giveaway ended. No entrants.", embeds: [], components: [] });

                    const winnersArr = [];
                    for (let i = 0; i < Math.min(data.winners, entrants.length); i++) {
                        const randomIdx = Math.floor(Math.random() * entrants.length);
                        winnersArr.push(entrants.splice(randomIdx, 1)[0]);
                    }

                    const winnersMention = winnersArr.map(w => `<@${w}>`).join(", ");
                    const winEmbed = new EmbedBuilder()
                        .setTitle("🎉 **GIVEAWAY ENDED** 🎉")
                        .setDescription(`**Prize:** ${data.prize}\n**Winner(s):** ${winnersMention}\n**Hosted by:** <@${data.hostId}>`)
                        .setColor("Purple");

                    const claimRow = new ActionRowBuilder();
                    winnersArr.forEach((wID, index) => {
                        claimRow.addComponents(
                            new ButtonBuilder().setCustomId(`gw_claim_${wID}`).setLabel(`Claim (Winner ${index + 1})`).setStyle(ButtonStyle.Primary)
                        );
                    });

                    await msg.edit({ embeds: [winEmbed], components: [claimRow] });
                    await msg.reply(`Congratulations ${winnersMention}! Click the button above to claim!`);
                }, durationMs);

                return interaction.reply({ content: "✅ Giveaway started!", ephemeral: true });
            }

            // Command: /close
            if (interaction.commandName === "close") {
                if (!interaction.channel.name.includes("-")) return interaction.reply({ content: "❌ Not a ticket channel.", ephemeral: true });
                await interaction.reply("🔒 Closing ticket...");
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
            }

            // Command: /rename
            if (interaction.commandName === "rename") {
                const newName = interaction.options.getString("name");
                await interaction.channel.setName(newName);
                return interaction.reply(`✅ Renamed to **${newName}**`);
            }
        }

        // --- 3. BUTTON HANDLERS ---
        if (interaction.isButton()) {
            if (interaction.customId === "gw_join") {
                const data = activeGiveaways.get(interaction.message.id);
                if (!data) return interaction.reply({ content: "❌ Ended.", ephemeral: true });
                if (data.entrants.has(interaction.user.id)) return interaction.reply({ content: "⚠️ Already joined!", ephemeral: true });
                data.entrants.add(interaction.user.id);
                return interaction.reply({ content: "✅ Joined!", ephemeral: true });
            }

            if (interaction.customId.startsWith("gw_claim_")) {
                const winnerId = interaction.customId.split("_")[2];
                if (interaction.user.id !== winnerId) return interaction.reply({ content: "❌ Not your prize!", ephemeral: true });

                await interaction.deferReply({ ephemeral: true });
                const ticket = await createTicket(interaction, "Giveaway-Claim");
                await ticket.send({ 
                    content: `${interaction.user} | <@&${STAFF_ROLE_ID}>`, 
                    embeds: [new EmbedBuilder().setTitle("🎁 Prize Claim").setDescription(`${interaction.user} is here to claim.`).setColor("Green")],
                    components: [createTicketButtons(interaction.user.id)] 
                });
                return interaction.editReply(`✅ Ticket created: ${ticket}`);
            }

            if (interaction.customId === "close_ticket") {
                await interaction.reply("🔒 Closing...");
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
            }

            if (interaction.customId.startsWith("claim_")) {
                const isMarket = interaction.channel.name.startsWith("market-");
                const requiredRole = isMarket ? MARKET_ROLE_ID : STAFF_ROLE_ID;
                if (!interaction.member.roles.cache.has(requiredRole)) return interaction.reply({ content: "❌ Unauthorized staff.", ephemeral: true });

                const creatorId = interaction.customId.split("_")[1];
                await interaction.channel.permissionOverwrites.set([
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: creatorId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]);
                return interaction.reply(`✅ Claimed by ${interaction.user}`);
            }

            if (interaction.customId === "ticket_app") {
                const modal = new ModalBuilder().setCustomId("modal_StaffApp").setTitle("Staff Application");
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q1").setLabel("IGN, Bal, Playtime?").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q2").setLabel("Staff Experience?").setStyle(TextInputStyle.Paragraph).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q3").setLabel("Vouches/Scams?").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q4").setLabel("Giveaways per week?").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q5").setLabel("Read the rules?").setStyle(TextInputStyle.Short).setRequired(true))
                );
                return interaction.showModal(modal);
            }

            if (interaction.customId.startsWith("accept_") || interaction.customId.startsWith("deny_")) {
                if (interaction.user.id !== APP_VIEWER_ID && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ content: "❌ Unauthorized.", ephemeral: true });
                }
                await interaction.deferReply({ ephemeral: true });
                const isAccept = interaction.customId.startsWith("accept_");
                const targetId = interaction.customId.split("_")[1];

                const messages = await interaction.channel.messages.fetch({ limit: 100 });
                const transcriptData = messages.reverse().map(m => `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}`).join("\n");
                const attachment = new AttachmentBuilder(Buffer.from(transcriptData, "utf-8"), { name: `transcript-${targetId}.txt` });

                const logChan = await client.channels.fetch(TRANSCRIPT_CHANNEL_ID);
                await logChan.send({ 
                    embeds: [new EmbedBuilder().setTitle(`App: ${isAccept ? "ACCEPTED" : "DENIED"}`).setDescription(`**User:** <@${targetId}>\n**By:** ${interaction.user}`).setColor(isAccept ? "Green" : "Red")],
                    files: [attachment]
                });

                const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
                if (targetMember) {
                    if (isAccept) await targetMember.roles.add([STAFF_ROLE_ID, NEW_STAFF_ROLE_ID]).catch(() => {});
                    await targetMember.send(`Your application was ${isAccept ? "ACCEPTED" : "DENIED"}.`).catch(() => {});
                }
                await interaction.editReply("✅ Processed.");
                setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
            }
        }

        // --- 4. SELECT MENUS & 5. MODALS ---
        if (interaction.isStringSelectMenu()) {
            const choice = interaction.values[0];
            if (interaction.customId === "ticket_build") {
                await interaction.deferReply({ ephemeral: true });
                const ticket = await createTicket(interaction, choice);
                await ticket.send({ content: `${interaction.user} | <@&${STAFF_ROLE_ID}>`, components: [createTicketButtons(interaction.user.id)] });
                return interaction.editReply(`Opened: ${ticket}`);
            }
            if (interaction.customId === "ticket_gen") {
                let modal = new ModalBuilder().setCustomId(`modal_${choice}`).setTitle(`${choice} Details`);
                if (choice === "Giveaways") {
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q1").setLabel("Who hosted?").setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q2").setLabel("What did you win?").setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q3").setLabel("IGN?").setStyle(TextInputStyle.Short).setRequired(true))
                    );
                } else if (choice === "Support") {
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q1").setLabel("Help needed?").setStyle(TextInputStyle.Paragraph).setRequired(true)));
                } else if (choice === "Market") {
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q1").setLabel("Buying/Selling?").setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q2").setLabel("Item?").setStyle(TextInputStyle.Short).setRequired(true))
                    );
                } else if (choice === "Partnership") {
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q1").setLabel("Member Count?").setStyle(TextInputStyle.Short).setRequired(true)));
                }
                return interaction.showModal(modal);
            }
        }

        if (interaction.isModalSubmit()) {
            await interaction.deferReply({ ephemeral: true });
            const type = interaction.customId.replace("modal_", "");
            const ticket = await createTicket(interaction, type);
            const embed = new EmbedBuilder().setTitle(`${type} Ticket`).setColor("Blue");
            interaction.fields.fields.forEach(f => embed.addFields({ name: f.customId, value: f.value }));

            if (type === "StaffApp") {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`accept_${interaction.user.id}`).setLabel("Accept").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`deny_${interaction.user.id}`).setLabel("Deny").setStyle(ButtonStyle.Danger)
                );
                await ticket.send({ content: `Staff App: ${interaction.user} | <@${APP_VIEWER_ID}>`, embeds: [embed], components: [row] });
            } else {
                const role = type === "Market" ? MARKET_ROLE_ID : STAFF_ROLE_ID;
                await ticket.send({ content: `${interaction.user} | <@&${role}>`, embeds: [embed], components: [createTicketButtons(interaction.user.id)] });
            }
            return interaction.editReply(`Opened: ${ticket}`);
        }
    } catch (e) { console.error(e); }
});

// --- HELPERS ---
async function createTicket(interaction, type) {
    const overwrites = [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
    ];
    if (type === "StaffApp") overwrites.push({ id: APP_VIEWER_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
    else if (type === "Market") overwrites.push({ id: MARKET_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
    else overwrites.push({ id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });

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
