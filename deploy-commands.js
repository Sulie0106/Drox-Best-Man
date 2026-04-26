require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  // 1. Setup Hub
  new SlashCommandBuilder()
    .setName("setup_hub")
    .setDescription("Spawns the Drox Service and Application menu"),

  // 2. Staff Movement
  new SlashCommandBuilder()
    .setName("staffmove")
    .setDescription("Manage staff promotions and demotions")
    .addUserOption(o => o.setName("user").setDescription("The user").setRequired(true))
    .addStringOption(o => o.setName("type").setDescription("Action").setRequired(true).addChoices(
        { name: "Promote", value: "promote" },
        { name: "Demote", value: "demote" }
    ))
    .addRoleOption(o => o.setName("role").setDescription("The role").setRequired(true)),

  // 3. Giveaway Create
  new SlashCommandBuilder()
    .setName("gwcreate")
    .setDescription("Start a giveaway")
    .addStringOption(o => o.setName("prize").setDescription("What is the prize?").setRequired(true))
    .addStringOption(o => o.setName("time").setDescription("Duration (e.g. 10m, 1h, 1d)").setRequired(true))
    .addIntegerOption(o => o.setName("winners").setDescription("Number of winners").setRequired(true)),

].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("⏳ Registering Drox Services commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log("✅ Commands registered!");
  } catch (error) {
    console.error(error);
  }
})();