require("dotenv").config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const commands = [
    // --- HUB SETUP ---
    new SlashCommandBuilder()
        .setName("setup_hub")
        .setDescription("Sets up the service, application, and staff management hubs")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName("setup_tracking")
        .setDescription("Initializes the partner and giveaway leaderboards in tracking channels")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // --- STAFF MANAGEMENT ---
    new SlashCommandBuilder()
        .setName("staffmove")
        .setDescription("Promote or demote a staff member")
        .addUserOption(option => option.setName("user").setDescription("The user to modify").setRequired(true))
        .addStringOption(option => 
            option.setName("type")
            .setDescription("Promote or Demote")
            .setRequired(true)
            .addChoices({ name: "Promote", value: "promote" }, { name: "Demote", value: "demote" })
        )
        .addRoleOption(option => option.setName("role").setDescription("The role to add or remove").setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName("strike")
        .setDescription("Issue a strike to a staff member")
        .addUserOption(option => option.setName("user").setDescription("The staff member").setRequired(true))
        .addStringOption(option => option.setName("reason").setDescription("Reason for the strike").setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName("say")
        .setDescription("Speak as the bot")
        .addStringOption(option => option.setName("message").setDescription("The message to send").setRequired(true))
        .addChannelOption(option => option.setName("channel").setDescription("Channel to send it in (optional)"))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // --- TRACKING COMMANDS ---
    new SlashCommandBuilder()
        .setName("track_partner")
        .setDescription("Manually add a partner count to a user")
        .addUserOption(option => option.setName("user").setDescription("The user to track").setRequired(true))
        .addIntegerOption(option => option.setName("amount").setDescription("Amount of invites to add").setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName("track_giveaway")
        .setDescription("Manually add giveaway stats to a user")
        .addUserOption(option => option.setName("user").setDescription("The user to track").setRequired(true))
        .addIntegerOption(option => option.setName("count").setDescription("Number of giveaways").setRequired(true))
        .addStringOption(option => option.setName("value").setDescription("Total prize value (e.g. 50M)").setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // --- TICKET COMMANDS ---
    new SlashCommandBuilder()
        .setName("close")
        .setDescription("Closes the current ticket channel"),

    new SlashCommandBuilder()
        .setName("rename")
        .setDescription("Renames the current ticket channel")
        .addStringOption(option => option.setName("name").setDescription("The new channel name").setRequired(true)),

    // --- GIVEAWAY SYSTEM ---
    new SlashCommandBuilder()
        .setName("gwcreate")
        .setDescription("Start a giveaway")
        .addStringOption(option => option.setName("prize").setDescription("What is being given away?").setRequired(true))
        .addStringOption(option => option.setName("time").setDescription("Duration (e.g., 1h, 30m, 1d)").setRequired(true))
        .addIntegerOption(option => option.setName("winners").setDescription("Number of winners").setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`⏳ Refreshing ${commands.length} application (/) commands...`);
        
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );

        console.log(`✅ Successfully reloaded application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();
