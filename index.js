require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
    new SlashCommandBuilder().setName("setup_hub").setDescription("Spawns all ticket and application hubs"),
    new SlashCommandBuilder().setName("gwcreate").setDescription("Start a giveaway with real-time timer")
        .addStringOption(o => o.setName("prize").setDescription("Prize name").setRequired(true))
        .addStringOption(o => o.setName("time").setDescription("Duration (1h, 30m, etc)").setRequired(true))
        .addIntegerOption(o => o.setName("winners").setDescription("Number of winners").setRequired(true)),
    new SlashCommandBuilder().setName("close").setDescription("Close current ticket"),
    new SlashCommandBuilder().setName("strike").setDescription("Strike a staff member")
        .addUserOption(o => o.setName("user").setRequired(true))
        .addStringOption(o => o.setName("reason")),
    new SlashCommandBuilder().setName("track_partner").setDescription("Track partner stats")
        .addUserOption(o => o.setName("user").setRequired(true))
        .addIntegerOption(o => o.setName("amount").setRequired(true))
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log("🧹 Refreshing slash commands...");
        await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
        console.log("✅ Commands registered!");
    } catch (e) { console.error(e); }
})();
