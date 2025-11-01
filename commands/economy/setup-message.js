const { SlashCommandBuilder } = require("discord.js");
const { loadJSON, saveJSON, isEconoAdmin, configFile } = require("../../utils/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-message")
    .setDescription("Configurer les gains par message")
    .addIntegerOption(o => o.setName("min").setDescription("Gain minimum").setRequired(true))
    .addIntegerOption(o => o.setName("max").setDescription("Gain maximum").setRequired(true)),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    if (!isEconoAdmin(guildId, interaction.user.id))
      return interaction.reply({ content: "🚫 Vous n’êtes pas éconoadmin.", ephemeral: true });

    const min = interaction.options.getInteger("min");
    const max = interaction.options.getInteger("max");
    if (min > max) return interaction.reply({ content: "❌ Min ne peut pas être supérieur à Max.", ephemeral: true });

    const data = loadJSON(configFile);
    data[guildId] = { min, max };
    saveJSON(configFile, data);

    await interaction.reply(`💬 Gains par message configurés entre ${min}€ et ${max}€.`);
  }
};
