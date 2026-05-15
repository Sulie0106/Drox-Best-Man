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
        GatewayIntentBits.GuildMembers, // MUST BE ENABLED IN DEV PORTAL
        GatewayIntentBits.MessageContent, // MUST BE ENABLED IN DEV PORTAL
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageContent // NEW: Required for DM apps
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

// --- CONFIG (Double check these!) ---
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

// --- DEBUG STARTUP CHECK ---
client.once("ready", async () => {
    console.log(`\n✨ ${client.user.tag} is checking systems...`);
    
    const ids = [
        { name: "Transcript Channel", id: TRANSCRIPT_CHANNEL_ID },
        { name: "App Hub", id: APP_HUB_ID },
        { name: "Ticket Category", id: TICKET_CATEGORY_ID }
    ];

    for (const item of ids) {
        const found = await client.channels.fetch(item.id).catch(() => null);
        if (!found) console.log(`❌ ERROR: ${item.name} (ID: ${item.id}) NOT FOUND!`);
        else console.log(`✅ FOUND: ${item.name}`);
    }
    
    console.log("🚀 Bot is ready for action!\n");
});

client.on("interactionCreate", async (interaction) => {
    // 1. ALWAYS try-catch the whole interaction
    try {
        if (interaction.isChatInputCommand()) {
            // Defer immediately so Discord knows we are working
            await interaction.deferReply({ ephemeral: true });

            if (interaction.commandName === "setup_hub") {
                const appChan = await client.channels.fetch(APP_HUB_ID);
                
                const appEmbed = new EmbedBuilder()
                    .setTitle("🛡️ Recruitment Center")
                    .setDescription("Select the role you wish to apply for. The bot will DM you to start.")
                    .setColor("#2ecc71");

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("start_app_staff").setLabel("Staff").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId("start_app_builder").setLabel("Builder").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId("start_app_pm").setLabel("Partner Manager").setStyle(ButtonStyle.Secondary)
                );

                await appChan.send({ embeds: [appEmbed], components: [row] });
                return interaction.editReply("✅ Hub Setup Complete!");
            }
        }

        if (interaction.isButton()) {
            if (interaction.customId.startsWith("start_app_")) {
                const type = interaction.customId.split("_")[2];
                
                // Send DM first. If it fails, we catch it immediately.
                try {
                    await interaction.user.send(`👋 Hello! You started a **${type}** application. Question 1: What is your IGN and timezone?`);
                    return interaction.reply({ content: "📩 Check your DMs!", ephemeral: true });
                } catch (dmErr) {
                    return interaction.reply({ content: "❌ Your DMs are closed! Open them to apply.", ephemeral: true });
                }
            }
        }
    } catch (err) {
        console.error("CRITICAL INTERACTION ERROR:", err);
        // Fallback for the "Application did not respond" error
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: `❌ Error: ${err.message}` }).catch(() => {});
        } else {
            await interaction.reply({ content: `❌ Error: ${err.message}`, ephemeral: true }).catch(() => {});
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
