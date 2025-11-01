const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { isEconoAdmin } = require("../../utils/economy");
const configFile = path.join(__dirname, "../../data/economy/config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-daily")
    .setDescription("Configurer les gains journaliers possibles.")
    .addIntegerOption(opt => opt.setName("min").setDescription("Gain minimum").setRequired(true))
    .addIntegerOption(opt => opt.setName("max").setDescription("Gain maximum").setRequired(true)),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    if (!isEconoAdmin(guildId, interaction.user.id))
      return interaction.reply({ content: "🚫 Vous n’êtes pas administrateur de l’économie.", ephemeral: true });

    const min = interaction.options.getInteger("min");
    const max = interaction.options.getInteger("max");

    let config = {};
    if (fs.existsSync(configFile)) config = JSON.parse(fs.readFileSync(configFile, "utf8"));
    if (!config[guildId]) config[guildId] = {};

    config[guildId].daily = { min, max };
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

    await interaction.reply(`✅ Daily configuré entre **${min}€** et **${max}€**.`);
  }
};