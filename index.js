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
const MUTE_PINGS_CHANNEL_ID = "1496222658050785290";
const TICKET_CATEGORY_ID = "1496950777275486429";
const STAFF_ROLE_ID = "1496951778967683072";
const NEW_STAFF_ROLE_ID = "1498572067212103730";
const GEN_HUB_ID = "1496891644895821865";
const APP_HUB_ID = "1498193257212022835";
const BUILD_HUB_ID = "1497906110219288646";

let giveawayWinners = new Map();

client.once("ready", () => console.log(`✅ ${client.user.tag} is online!`));

// --- 1. AUTO-MESSAGE LOGIC ---
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.channel.id === MUTE_PINGS_CHANNEL_ID) {
        await message.channel.send("# **Mute for no pings**");
    }
});

client.on("interactionCreate", async (interaction) => {
    try {
        // --- 2. SLASH COMMANDS ---
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
                return interaction.editReply("Hub spawned!");
            }
            // (Other slash commands like close/rename/gwcreate go here - keep existing logic)
        }

        // --- 3. MODAL TRIGGER LOGIC (General Hub) ---
        if (interaction.isStringSelectMenu() && interaction.customId === "ticket_gen") {
            const choice = interaction.values[0];
            let modal = new ModalBuilder().setCustomId(`modal_${choice}`).setTitle(`${choice} Application`);

            if (choice === "Giveaways") {
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q1").setLabel("Who hosted?").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q2").setLabel("What did you win?").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q3").setLabel("What is your IGN?").setStyle(TextInputStyle.Short).setRequired(true))
                );
            } else if (choice === "Support") {
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q1").setLabel("What do you need help with?").setStyle(TextInputStyle.Paragraph).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q2").setLabel("What is your IGN and Bal?").setStyle(TextInputStyle.Short).setRequired(true))
                );
            } else if (choice === "Partnership") {
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q1").setLabel("How many members?").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q2").setLabel("Have you read our requirements?").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q3").setLabel("Send your AD in the ticket").setStyle(TextInputStyle.Paragraph).setPlaceholder("Paste AD here...").setRequired(true))
                );
            } else if (choice === "Market") {
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q1").setLabel("Selling or Buying? And how much?").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q2").setLabel("What are you buying or selling?").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q3").setLabel("What is your IGN?").setStyle(TextInputStyle.Short).setRequired(true))
                );
            }
            return interaction.showModal(modal);
        }

        // --- 4. MODAL SUBMISSION (Ticket Creation) ---
        if (interaction.isModalSubmit() && interaction.customId.startsWith("modal_")) {
            const type = interaction.customId.replace("modal_", "");
            await interaction.deferReply({ ephemeral: true });

            const ticket = await interaction.guild.channels.create({
                name: `${type.toLowerCase()}-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: TICKET_CATEGORY_ID,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            const embed = new EmbedBuilder().setTitle(`${type} Ticket`).setColor("Blue").setDescription(`Ticket opened by ${interaction.user}`);
            interaction.fields.fields.forEach(f => embed.addFields({ name: f.customId, value: f.value }));

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`claim_${interaction.user.id}`).setLabel("Claim").setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger)
            );

            await ticket.send({ content: `${interaction.user} | <@&${STAFF_ROLE_ID}>`, embeds: [embed], components: [buttons] });
            return interaction.editReply(`Ticket created: ${ticket}`);
        }

        // --- 5. CLAIM & CLOSE LOGIC ---
        if (interaction.isButton()) {
            // Close Ticket
            if (interaction.customId === "close_ticket") {
                await interaction.reply("🔒 Closing ticket...");
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
            }

            // Claim Ticket
            if (interaction.customId.startsWith("claim_")) {
                if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
                    return interaction.reply({ content: "❌ Staff only.", ephemeral: true });
                }

                const creatorId = interaction.customId.split("_")[1];
                
                // Update permissions: Only creator and the claiming staff can see
                await interaction.channel.permissionOverwrites.set([
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: creatorId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]);

                return interaction.reply(`✅ This ticket has been claimed by ${interaction.user}. Other staff are now hidden from this channel.`);
            }
        }

    } catch (e) { console.error(e); }
});

client.login(process.env.DISCORD_TOKEN);
