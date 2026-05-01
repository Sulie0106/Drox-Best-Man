require("dotenv").config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const commands = [
    new SlashCommandBuilder()
        .setName("setup_hub")
        .setDescription("Spawns the Drox Service hubs and Application menu")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName("setup_tracking")
        .setDescription("Initializes the partner and giveaway leaderboards")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName("staffmove")
        .setDescription("Manage staff promotions and demotions")
        .addUserOption(o => o.setName("user").setDescription("The user").setRequired(true))
        .addStringOption(o => o.setName("type").setDescription("Action").setRequired(true).addChoices({name:"Promote",value:"promote"},{name:"Demote",value:"demote"}))
        .addRoleOption(o => o.setName("role").setDescription("The role").setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName("strike")
        .setDescription("Issue a strike")
        .addUserOption(o => o.setName("user").setDescription("The staff").setRequired(true))
        .addStringOption(o => o.setName("reason").setDescription("Reason"))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName("say")
        .setDescription("Talk as the bot")
        .addStringOption(o => o.setName("message").setDescription("Message").setRequired(true))
        .addChannelOption(o => o.setName("channel").setDescription("Channel"))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName("track_partner")
        .setDescription("Add partner count")
        .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
        .addIntegerOption(o => o.setName("amount").setDescription("Amount").setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
        .setName("track_giveaway")
        .setDescription("Add giveaway stats")
        .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
        .addIntegerOption(o => o.setName("count").setDescription("Count").setRequired(true))
        .addStringOption(o => o.setName("value").setDescription("Value").setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName("close").setDescription("Close ticket"),
    new SlashCommandBuilder().setName("rename").setDescription("Rename ticket").addStringOption(o => o.setName("name").setDescription("New name").setRequired(true)),
    new SlashCommandBuilder()
        .setName("gwcreate")
        .setDescription("Start giveaway")
        .addStringOption(o => o.setName("prize").setDescription("Prize").setRequired(true))
        .addStringOption(o => o.setName("time").setDescription("Time").setRequired(true))
        .addIntegerOption(o => o.setName("winners").setDescription("Winners").setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log("🧹 Clearing old commands...");
        // This line wipes the global duplicates
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
        
        console.log("🚀 Registering fresh guild commands...");
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        console.log("✅ DONE: Restart Discord (Ctrl+R).");
    } catch (error) {
        console.error(error);
    }
})();
