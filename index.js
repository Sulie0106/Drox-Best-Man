require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits, 
    Partials, MessageFlags 
} = require("discord.js");
const ms = require("ms");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

// 🛠️ --- CONFIGURATION ---
const ADMIN_ROLE_ID = "1496951778967683072"; 
const STAFF_ROLE_ID = "1496951778967683072"; 
const TICKET_CATEGORY_ID = "1496950777275486429";
const STAFF_MOVE_LOG_ID = "1498701312991297546";

// TRACKING CHANNELS
const GIVEAWAY_TRACKING_ID = "1499427843636203610";
const PARTNER_TRACKING_ID = "1499427974825512960";

// HUB CHANNELS
const DIGGING_CHANNEL_ID = "1497905935656554506";
const BUILDING_CHANNEL_ID = "1497906110219288646";
const APP_HUB_CHANNEL_ID = "1498193257212022835";
const FILLED_APPS_CHANNEL_ID = "1499498906419990692"; 
const GENERAL_TICKET_CHANNEL_ID = "1496891644895821865";
const STAFF_PANEL_CHANNEL_ID = "1498708753024028692"; 

// Memory Storage (Reset on restart - suggest DB for future)
const stats = {
    partners: {}, // { userId: count }
    giveaways: {} // { userId: { count: 0, value: "0M" } }
};

// Helper to Update Leaderboards
async function updateLeaderboards() {
    try {
        // Partner Leaderboard
        const pChan = await client.channels.fetch(PARTNER_TRACKING_ID);
        const pSorted = Object.entries(stats.partners).sort((a,b) => b[1] - a[1]);
        const pDesc = pSorted.map(([id, count], i) => `${i+1}. <@${id}> - **${count}**`).join("\n") || "No partners tracked yet.";
        
        const pEmbed = new EmbedBuilder()
            .setTitle("🤝 Partner Invites")
            .setDescription(`Users with the most tracked partner invites.\n\n${pDesc}`)
            .setColor("Blue");
        
        // Giveaway Leaderboard
        const gChan = await client.channels.fetch(GIVEAWAY_TRACKING_ID);
        const gSorted = Object.entries(stats.giveaways).sort((a,b) => b[1].count - a[1].count);
        const gDesc = gSorted.map(([id, data]) => `<@${id}> - **${data.count} giveaways** - **${data.value}**`).join("\n") || "No giveaways tracked yet.";

        const gEmbed = new EmbedBuilder()
            .setTitle("🎉 Giveaway Tracking")
            .setDescription(`Users with the most hosted giveaways.\n\n${gDesc}`)
            .setColor("Yellow");

        // Clear and Resend (Simple method)
        await pChan.bulkDelete(5).catch(() => {});
        await pChan.send({ embeds: [pEmbed] });
        await gChan.bulkDelete(5).catch(() => {});
        await gChan.send({ embeds: [gEmbed] });
    } catch (e) { console.error("Leaderboard Error:", e); }
}

client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options, member } = interaction;

        if (commandName === "setup_tracking") {
            await interaction.reply("Initializing leaderboards...");
            await updateLeaderboards();
        }

        if (commandName === "track_partner") {
            const user = options.getUser("user");
            const amount = options.getInteger("amount");
            stats.partners[user.id] = (stats.partners[user.id] || 0) + amount;
            await updateLeaderboards();
            return interaction.reply(`✅ Added ${amount} to ${user.tag}'s partner count.`);
        }

        if (commandName === "track_giveaway") {
            const user = options.getUser("user");
            const count = options.getInteger("count");
            const value = options.getString("value");
            stats.giveaways[user.id] = { 
                count: (stats.giveaways[user.id]?.count || 0) + count,
                value: value
            };
            await updateLeaderboards();
            return interaction.reply(`✅ Tracked ${count} giveaways for ${user.tag}.`);
        }

        // ... [Include your existing commands: staffmove, say, strike, close, rename, setup_hub, gwcreate] ...
        // Note: Inside gwcreate, add logic to update stats.giveaways automatically!
    }

    // --- BUTTONS ---
    if (interaction.isButton()) {
        if (interaction.customId === "claim_ticket") {
            if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) return interaction.reply({ content: "Staff only.", flags: MessageFlags.Ephemeral });
            
            // If it's a partner ticket, track it!
            if (interaction.channel.name.includes("partner")) {
                stats.partners[interaction.user.id] = (stats.partners[interaction.user.id] || 0) + 1;
                await updateLeaderboards();
            }

            const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .addFields({ name: "Claimed By", value: `${interaction.user}`, inline: true })
                .setColor("Green");

            return interaction.update({ embeds: [originalEmbed], components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("close_ticket").setLabel("Close").setStyle(ButtonStyle.Danger).setEmoji("🔒")
                )
            ]});
        }
        // ... [Include your other buttons: start_app, confirm_retire, etc.] ...
    }
});

client.login(process.env.DISCORD_TOKEN);
