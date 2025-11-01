const { SlashCommandBuilder } = require("discord.js");
const { loadJSON, saveJSON, isEconoAdmin } = require("../../utils/economy");
const path = require("path");
const fs = require("fs");

const caisseFile = path.join(__dirname, "../../data/casino/caisse.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-caisseprice")
    .setDescription("Définir le prix d'une caisse")
    .addIntegerOption(option =>
      option
        .setName("prix")
        .setDescription("Prix d'ouverture de la caisse")
        .setRequired(true)
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    if (!isEconoAdmin(guildId, interaction.user.id)) {
      return interaction.reply({ content: "🚫 Vous n'êtes pas éconoadmin.", ephemeral: true });
    }

    const price = interaction.options.getInteger("prix");
    let data = {};
    if (fs.existsSync(caisseFile)) data = loadJSON(caisseFile);

    if (!data[guildId]) data[guildId] = { price: 0, lots: [] };
    data[guildId].price = price;

    saveJSON(caisseFile, data);
    await interaction.reply(`✅ Prix de la caisse défini à ${price}€.`);
  }
};
