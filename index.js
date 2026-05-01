require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, ChannelType, PermissionFlagsBits, Partials 
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message]
});

// --- CONFIGURATION ---
const STAFF_ROLE_ID = "1496951778967683072";
const ADMIN_ROLE_ID = "1496951778967683072"; // Same as staff based on your earlier prompt
const LOG_CHANNEL_ID = "1498701312991297546";
const PARTNER_TRACK_ID = "1499427974825512960";
const GIVEAWAY_TRACK_ID = "1499427843636203610";

let stats = { partners: {}, giveaways: {} };

// --- HELPER: LEADERBOARD UPDATE ---
async function updateLeaderboards() {
    try {
        const pChan = await client.channels.fetch(PARTNER_TRACK_ID);
        const gChan = await client.channels.fetch(GIVEAWAY_TRACK_ID);

        const pEmbed = new EmbedBuilder().setTitle("Partner Leaderboard").setColor("Blue")
            .setDescription(Object.entries(stats.partners).map(([id, c]) => `<@${id}>: ${c} invites`).join("\n") || "No data");
        
        const gEmbed = new EmbedBuilder().setTitle("Giveaway Leaderboard").setColor("Yellow")
            .setDescription(Object.entries(stats.giveaways).map(([id, d]) => `<@${id}>: ${d.count} Gws (${d.value})`).join("\n") || "No data");

        await pChan.send({ embeds: [pEmbed] });
        await gChan.send({ embeds: [gEmbed] });
    } catch (e) { console.error("Leaderboard error:", e); }
}

client.once("ready", () => console.log(`✅ ${client.user.tag} is online!`));

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options } = interaction;

    // 1. SAY
    if (commandName === "say") {
        const msg = options.getString("message");
        const target = options.getChannel("channel") || interaction.channel;
        await target.send(msg);
        return interaction.reply({ content: "Sent!", ephemeral: true });
    }

    // 2. CLOSE TICKET
    if (commandName === "close") {
        await interaction.reply("🔒 Closing channel...");
        setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
    }

    // 3. RENAME
    if (commandName === "rename") {
        const name = options.getString("name");
        await interaction.channel.setName(name);
        return interaction.reply({ content: `Renamed to ${name}`, ephemeral: true });
    }

    // 4. TRACK PARTNER
    if (commandName === "track_partner") {
        const user = options.getUser("user");
        stats.partners[user.id] = (stats.partners[user.id] || 0) + options.getInteger("amount");
        await updateLeaderboards();
        return interaction.reply(`Updated partners for ${user.tag}`);
    }

    // 5. TRACK GIVEAWAY
    if (commandName === "track_giveaway") {
        const user = options.getUser("user");
        stats.giveaways[user.id] = { count: options.getInteger("count"), value: options.getString("value") };
        await updateLeaderboards();
        return interaction.reply(`Updated giveaways for ${user.tag}`);
    }

    // 6. STRIKE
    if (commandName === "strike") {
        const user = options.getUser("user");
        const log = await client.channels.fetch(LOG_CHANNEL_ID);
        await log.send(`⚠️ **STRIKE** | User: ${user} | Admin: ${interaction.user} | Reason: ${options.getString("reason") || "None"}`);
        return interaction.reply(`Strike issued to ${user.tag}`);
    }

    // 7. STAFFMOVE
    if (commandName === "staffmove") {
        const user = options.getMember("user");
        const role = options.getRole("role");
        const type = options.getString("type");
        if (type === "promote") await user.roles.add(role);
        else await user.roles.remove(role);
        return interaction.reply(`Success: ${type} ${user.user.tag}`);
    }

    // 8. GWCREATE
    if (commandName === "gwcreate") {
        const prize = options.getString("prize");
        const winners = options.getInteger("winners");
        const embed = new EmbedBuilder().setTitle("🎉 GIVEAWAY").setDescription(`Prize: **${prize}**\nWinners: **${winners}**\nHosted by: ${interaction.user}`).setColor("Purple");
        await interaction.reply({ embeds: [embed] });
    }

    // 9 & 10. SETUP COMMANDS (Placeholders for your Hub/Tracking logic)
    if (commandName === "setup_hub" || commandName === "setup_tracking") {
        return interaction.reply("Feature initialized!");
    }
});

client.login(process.env.DISCORD_TOKEN);
