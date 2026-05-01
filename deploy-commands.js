require("dotenv").config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const commands = [
    new SlashCommandBuilder()
        .setName("setup_hub")
        .setDescription("Sets up all the hubs (Digging, Building, Tickets, Apps, Staff Panel)")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

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
        .setName("say")
        .setDescription("Speak as the bot")
        .addStringOption(option => option.setName("message").setDescription("The message to send").setRequired(true))
        .addChannelOption(option => option.setName("channel").setDescription("Channel to send it in (optional)"))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName("strike")
        .setDescription("Issue a strike to a staff member")
        .addUserOption(option => option.setName("user").setDescription("The staff member").setRequired(true))
        .addStringOption(option => option.setName("reason").setDescription("Reason for the strike").setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName("gwcreate")
        .setDescription("Create a giveaway")
        .addStringOption(option => option.setName("prize").setDescription("What are you giving away?").setRequired(true))
        .addStringOption(option => option.setName("time").setDescription("Duration (e.g., 1h, 30m, 1d)").setRequired(true))
        .addIntegerOption(option => option.setName("winners").setDescription("Number of winners").setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName("close")
        .setDescription("Closes the current ticket channel"),

    new SlashCommandBuilder()
        .setName("rename")
        .setDescription("Renames the current ticket channel")
        .addStringOption(option => option.setName("name").setDescription("The new channel name").setRequired(true))
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`⏳ Started refreshing ${commands.length} application (/) commands.`);
        
        // Deploys to a specific server for instant updates. 
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );

        console.log(`✅ Successfully reloaded application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();
