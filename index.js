require("dotenv").config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, ChannelType, PermissionFlagsBits, Partials 
} = require("discord.js");
const ms = require("ms");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message]
});

// --- CONFIGURATION (Ensure these match your server) ---
const STAFF_ROLE_ID = "1496951778967683072";
const ADMIN_ROLE_ID = "1496951778967683072";
const TICKET_CATEGORY_ID = "1496950777275486429";
const LOG_CHANNEL_ID = "1498701312991297546";
const PARTNER_TRACK_ID = "1499427974825512960";
const GW_TRACK_ID = "1499427843636203610";

// In-memory database (Resets if bot restarts - use a JSON file or DB for permanent storage)
let stats = { partners: {}, giveaways: {} };

client.once("ready", () => {
    console.log(`✅ ${client.user.tag} is online and fully loaded!`);
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options } = interaction;

    // 1. SAY COMMAND
    if (commandName === "say") {
        const msg = options.getString("message");
        const target = options.getChannel("channel") || interaction.channel;
        await target.send(msg);
        return interaction.reply({ content: "Message sent.", ephemeral: true });
    }

    // 2. STRIKE SYSTEM
    if (commandName === "strike") {
        const user = options.getUser("user");
        const reason = options.getString("reason") || "No reason provided.";
        const logChan = await client.channels.fetch(LOG_CHANNEL_ID);
        
        const strikeEmbed = new EmbedBuilder()
            .setTitle("⚠️ Staff Strike Issued")
            .addFields(
                { name: "Staff Member", value: `${user}`, inline: true },
                { name: "Issued By", value: `${interaction.user}`, inline: true },
                { name: "Reason", value: reason }
            )
            .setColor("Red")
            .setTimestamp();

        await logChan.send({ embeds: [strikeEmbed] });
        return interaction.reply(`Successfully issued a strike to ${user.tag}.`);
    }

    // 3. PARTNER TRACKING
    if (commandName === "track_partner") {
        const user = options.getUser("user");
        const amount = options.getInteger("amount");
        
        stats.partners[user.id] = (stats.partners[user.id] || 0) + amount;
        
        const trackChan = await client.channels.fetch(PARTNER_TRACK_ID);
        const embed = new EmbedBuilder()
            .setTitle("🤝 Partner Update")
            .setDescription(`${user} has completed a partnership!`)
            .addFields(
                { name: "New Total", value: `${stats.partners[user.id]}`, inline: true },
                { name: "Added", value: `${amount}`, inline: true }
            )
            .setColor("Blue");

        await trackChan.send({ embeds: [embed] });
        return interaction.reply(`Tracked ${amount} for ${user.tag}.`);
    }

    // 4. GIVEAWAY TRACKING
    if (commandName === "track_giveaway") {
        const user = options.getUser("user");
        const count = options.getInteger("count");
        const value = options.getString("value");

        stats.giveaways[user.id] = { 
            count: (stats.giveaways[user.id]?.count || 0) + count, 
            value: value 
        };

        const gwChan = await client.channels.fetch(GW_TRACK_ID);
        const embed = new EmbedBuilder()
            .setTitle("🎉 Giveaway Tracked")
            .addFields(
                { name: "Host", value: `${user}`, inline: true },
                { name: "Total Hosted", value: `${stats.giveaways[user.id].count}`, inline: true },
                { name: "Total Value", value: value }
            )
            .setColor("Yellow");

        await gwChan.send({ embeds: [embed] });
        return interaction.reply(`Logged giveaway for ${user.tag}.`);
    }

    // 5. TICKET MANAGEMENT (Close/Rename)
    if (commandName === "close") {
        await interaction.reply("🔒 Ticket will close in 5 seconds...");
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }

    if (commandName === "rename") {
        const newName = options.getString("name");
        await interaction.channel.setName(newName);
        return interaction.reply(`Channel renamed to ${newName}`);
    }

    // 6. GIVEAWAY CREATION (Live)
    if (commandName === "gwcreate") {
        const prize = options.getString("prize");
        const time = options.getString("time");
        const winners = options.getInteger("winners");

        const duration = ms(time);
        if (!duration) return interaction.reply("Invalid time format (use 1h, 1d, etc).");

        const embed = new EmbedBuilder()
            .setTitle("🎊 NEW GIVEAWAY 🎊")
            .setDescription(`**Prize:** ${prize}\n**Winners:** ${winners}\n**Ends in:** ${time}`)
            .setFooter({ text: `Hosted by ${interaction.user.tag}` })
            .setColor("Purple")
            .setTimestamp();

        const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
        await msg.react("🎉");

        setTimeout(async () => {
            const reaction = msg.reactions.cache.get("🎉");
            const users = await reaction.users.fetch();
            const entries = users.filter(u => !u.bot).map(u => u);
            
            if (entries.length === 0) return interaction.followUp("No one entered the giveaway.");
            
            const picked = entries.sort(() => 0.5 - Math.random()).slice(0, winners);
            interaction.followUp(`🎉 Congratulations ${picked.join(", ")}! You won the **${prize}**!`);
        }, duration);
    }

    // 7. HUB SPAWNER (Manual trigger)
    if (commandName === "setup_hub") {
        const embed = new EmbedBuilder()
            .setTitle("Drox Service Hub")
            .setDescription("Click a button below to open a ticket or apply!")
            .setColor("DarkButNotBlack");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("open_service").setLabel("Services").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("open_apply").setLabel("Apply Now").setStyle(ButtonStyle.Success)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        return interaction.reply({ content: "Hub Spawned.", ephemeral: true });
    }
});

// --- BUTTON LISTENER FOR TICKET CREATION ---
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === "open_service") {
        const ticket = await interaction.guild.channels.create({
            name: `service-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: TICKET_CATEGORY_ID,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        await ticket.send(`Welcome ${interaction.user}, staff will be with you shortly.`);
        return interaction.reply({ content: `Ticket created: ${ticket}`, ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
