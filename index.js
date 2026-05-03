require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, 
    Partials, StringSelectMenuBuilder 
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

// --- IDs ---
const TICKET_CATEGORY_ID = "1496950777275486429";
const STAFF_ROLE_ID = "1496951778967683072";
const GEN_HUB_ID = "1496891644895821865";
const APP_HUB_ID = "1498193257212022835";
const BUILD_HUB_ID = "1497906110219288646";

let giveawayWinners = new Map();

client.once("ready", () => console.log(`✅ ${client.user.tag} is online!`));

client.on("interactionCreate", async (interaction) => {
    try {
        // --- SLASH COMMAND HANDLER ---
        if (interaction.isChatInputCommand()) {
            // Instant defer to prevent "Application did not respond"
            await interaction.deferReply({ ephemeral: true });

            if (interaction.commandName === "setup_hub") {
                // 1. General Hub (Select Menu)
                const genChan = await client.channels.fetch(GEN_HUB_ID);
                const genMenu = new StringSelectMenuBuilder()
                    .setCustomId("ticket_gen")
                    .setPlaceholder("Choose ticket type...")
                    .addOptions(
                        { label: "Giveaways", value: "Giveaways", emoji: "🎉" },
                        { label: "Partnership", value: "Partnership", emoji: "🤝" },
                        { label: "Support", value: "Support", emoji: "🛠️" }
                    );
                await genChan.send({ components: [new ActionRowBuilder().addComponents(genMenu)] });

                // 2. Staff Apps (Button)
                const appChan = await client.channels.fetch(APP_HUB_ID);
                const appEmbed = new EmbedBuilder().setTitle("📝 Staff Apps").setDescription("Apply to join the team!").setColor("#2ecc71");
                const appBtn = new ButtonBuilder().setCustomId("ticket_app").setLabel("Apply Now").setStyle(ButtonStyle.Success);
                await appChan.send({ embeds: [appEmbed], components: [new ActionRowBuilder().addComponents(appBtn)] });

                // 3. Building Services (Select Menu)
                const buildChan = await client.channels.fetch(BUILD_HUB_ID);
                const buildEmbed = new EmbedBuilder().setTitle("🧱 Building Services").setDescription("Select a farm below.").setColor("#f1c40f");
                const buildMenu = new StringSelectMenuBuilder()
                    .setCustomId("ticket_build")
                    .setPlaceholder("Choose a farm...")
                    .addOptions(
                        { label: "Ikea v1-v4 (55m-200m)", value: "Ikea-Farm" },
                        { label: "Mauschu Starter (25m-85m)", value: "Mauschu-Starter" },
                        { label: "Mauschu v1-v4 (100m-255m)", value: "Mauschu-Mid" },
                        { label: "Mauschu v5-v9 (300m-650m)", value: "Mauschu-High" },
                        { label: "Fire Azure v1-v3 (180m-650m)", value: "Fire-Azure" },
                        { label: "Lox v1-v5 (50m-230m)", value: "Lox-Farm" },
                        { label: "Mcds 240 Smoker (75m)", value: "Mcds-Smoker" },
                        { label: "Your Schematics", value: "Custom-Schematic" }
                    );
                await buildChan.send({ embeds: [buildEmbed], components: [new ActionRowBuilder().addComponents(buildMenu)] });

                return interaction.editReply("All hubs spawned successfully.");
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
                    .setColor("#9b59b6")
                    .setFooter({ text: "React with 🎉 to enter!" });

                const msg = await interaction.channel.send({ embeds: [embed] });
                await msg.react("🎉");
                await interaction.editReply("Giveaway started!");

                setTimeout(async () => {
                    const fetched = await interaction.channel.messages.fetch(msg.id);
                    const users = await fetched.reactions.cache.get("🎉").users.fetch();
                    const entries = users.filter(u => !u.bot).map(u => u);

                    if (entries.length === 0) return interaction.channel.send(`The giveaway for **${prize}** ended with no entries.`);

                    const winners = entries.sort(() => 0.5 - Math.random()).slice(0, winnersCount);
                    giveawayWinners.set(msg.id, winners.map(w => w.id));

                    const endEmbed = new EmbedBuilder()
                        .setTitle("🎊 GIVEAWAY ENDED 🎊")
                        .setDescription(`**Prize:** ${prize}\n**Winners:** ${winners.join(", ")}\n\nClick the button to claim!`)
                        .setColor("#34495e");

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`claim_${msg.id}`).setLabel("Claim Prize").setStyle(ButtonStyle.Success)
                    );

                    await msg.edit({ embeds: [endEmbed], components: [row] });
                    interaction.channel.send(`🎉 Congratulations ${winners.join(", ")}! You won **${prize}**!`);
                }, duration);
            }

            if (interaction.commandName === "close") {
                await interaction.editReply("🔒 Closing ticket in 3s...");
                setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
            }
        }

        // --- BUTTON & MENU HANDLER ---
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
            else if (interaction.customId === "ticket_app") panelName = "Staff-App";

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
