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

client.once("ready", () => console.log(`✅ ${client.user.tag} is online and ready!`));

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
                
                // General Hub
                const genChan = await client.channels.fetch(GEN_HUB_ID);
                const genMenu = new StringSelectMenuBuilder().setCustomId("ticket_gen").setPlaceholder("Choose ticket type...").addOptions(
                    { label: "Giveaways", value: "Giveaways", emoji: "🎉" },
                    { label: "Partnership", value: "Partnership", emoji: "🤝" },
                    { label: "Support", value: "Support", emoji: "🛠️" },
                    { label: "Market", value: "Market", emoji: "🛒" }
                );
                await genChan.send({ components: [new ActionRowBuilder().addComponents(genMenu)] });

                // Application Hub
                const appChan = await client.channels.fetch(APP_HUB_ID);
                const appEmbed = new EmbedBuilder().setTitle("📝 Staff Apps").setDescription("Click the button below to apply for the staff team!").setColor("#2ecc71");
                const appBtn = new ButtonBuilder().setCustomId("ticket_app").setLabel("Apply Now").setStyle(ButtonStyle.Success);
                await appChan.send({ embeds: [appEmbed], components: [new ActionRowBuilder().addComponents(appBtn)] });

                // Building Hub
                const buildChan = await client.channels.fetch(BUILD_HUB_ID);
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
                await buildChan.send({ components: [new ActionRowBuilder().addComponents(buildMenu)] });

                return interaction.editReply("✅ All Hubs Spawned!");
            }
            // (Keep your other slash command logic like close/rename here if needed)
        }

        // --- 3. STAFF APP BUTTON HANDLER (Fixes your error) ---
        if (interaction.isButton() && interaction.customId === "ticket_app") {
            const modal = new ModalBuilder().setCustomId("modal_StaffApp").setTitle("Staff Application");
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q1").setLabel("What is your IGN, Bal, and playtime?").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q2").setLabel("What is your experience in being staff?").setStyle(TextInputStyle.Paragraph).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q3").setLabel("How many Vouches/Scam do you have?").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q4").setLabel("How many giveaways can you host a week?").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q5").setLabel("Have you read the rules?").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return interaction.showModal(modal);
        }

        // --- 4. HUB SELECT MENU HANDLERS ---
        if (interaction.isStringSelectMenu()) {
            const choice = interaction.values[0];
            
            // Build Tickets (No questions asked)
            if (interaction.customId === "ticket_build") {
                await interaction.deferReply({ ephemeral: true });
                const ticket = await createTicket(interaction, choice);
                await ticket.send({ 
                    content: `${interaction.user} | <@&${STAFF_ROLE_ID}>`, 
                    components: [createTicketButtons(interaction.user.id)] 
                });
                return interaction.editReply(`Ticket opened: ${ticket}`);
            }

            // General Tickets (Ask questions via Modal)
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
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q1").setLabel("What do you need help with?").setStyle(TextInputStyle.Paragraph).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q2").setLabel("What is your IGN and bal?").setStyle(TextInputStyle.Short).setRequired(true))
                    );
                } else if (choice === "Partnership") {
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q1").setLabel("How many members?").setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q2").setLabel("Have you read our requirements?").setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("q3").setLabel("Send your AD").setStyle(TextInputStyle.Paragraph).setRequired(true))
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
        }

        // --- 5. MODAL SUBMISSIONS ---
        if (interaction.isModalSubmit()) {
            await interaction.deferReply({ ephemeral: true });
            const type = interaction.customId.replace("modal_", "");
            const ticket = await createTicket(interaction, type);

            const embed = new EmbedBuilder().setTitle(`${type} Ticket Information`).setColor("Blue");
            interaction.fields.fields.forEach(f => embed.addFields({ name: f.customId, value: f.value }));

            // Special logic for Staff Apps (Accept/Deny) vs regular (Claim/Close)
            if (type === "StaffApp") {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`accept_${interaction.user.id}`).setLabel("Accept").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`deny_${interaction.user.id}`).setLabel("Deny").setStyle(ButtonStyle.Danger)
                );
                await ticket.send({ content: `New Application from ${interaction.user}!\n<@&${STAFF_ROLE_ID}>`, embeds: [embed], components: [row] });
            } else {
                await ticket.send({ content: `${interaction.user} | <@&${STAFF_ROLE_ID}>`, embeds: [embed], components: [createTicketButtons(interaction.user.id)] });
            }
            
            return interaction.editReply(`Ticket opened: ${ticket}`);
        }

        // --- 6. BUTTON HANDLERS (Claim, Close, Accept, Deny) ---
        if (interaction.isButton()) {
            // Close
            if (interaction.customId === "close_ticket") {
                await interaction.reply("🔒 Closing ticket...");
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
            }

            // Claim (Makes channel visible ONLY to claimer and creator)
            if (interaction.customId.startsWith("claim_")) {
                if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: "❌ Staff only.", ephemeral: true });
                const creatorId = interaction.customId.split("_")[1];
                await interaction.channel.permissionOverwrites.set([
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: creatorId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]);
                return interaction.reply(`✅ Ticket claimed by ${interaction.user}. Access restricted to you and the user.`);
            }

            // Accept/Deny Staff
            if (interaction.customId.startsWith("accept_") || interaction.customId.startsWith("deny_")) {
                if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: "❌ Staff only.", ephemeral: true });
                const isAccept = interaction.customId.startsWith("accept_");
                const targetId = interaction.customId.split("_")[1];
                const target = await interaction.guild.members.fetch(targetId);

                if (isAccept) {
                    await target.roles.add([STAFF_ROLE_ID, NEW_STAFF_ROLE_ID]);
                    await target.send("🎉 Your staff application was ACCEPTED!").catch(() => {});
                } else {
                    await target.send("❌ Your staff application was DENIED.").catch(() => {});
                }
                
                await interaction.reply(`Application ${isAccept ? "Accepted" : "Denied"}. Closing...`);
                return setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
            }
        }

    } catch (e) { console.error("Interaction Error:", e); }
});

// Helper: Create Ticket Channel
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

// Helper: Create Claim/Close Buttons
function createTicketButtons(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`claim_${userId}`).setLabel("Claim").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger)
    );
}

client.login(process.env.DISCORD_TOKEN);
