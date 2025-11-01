const { SlashCommandBuilder } = require("discord.js");
const { loadJSON, saveJSON, isEconoAdmin, shopFile } = require("../../utils/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-boutique")
    .setDescription("Gérer les produits de la boutique.")
    .addStringOption(o =>
      o.setName("action")
        .setDescription("ajouter ou supprimer")
        .setRequired(true)
        .addChoices(
          { name: "ajouter", value: "ajouter" },
          { name: "supprimer", value: "supprimer" }
        )
    )
    .addStringOption(o =>
      o.setName("nomproduit")
        .setDescription("Nom du produit")
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName("prix")
        .setDescription("Prix du produit")
        .setRequired(false)
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    if (!isEconoAdmin(guildId, userId)) {
      return interaction.reply({ content: "🚫 Vous n’êtes pas éconoadmin.", ephemeral: true });
    }

    const action = interaction.options.getString("action");
    const name = interaction.options.getString("nomproduit");
    const price = interaction.options.getInteger("prix");

    const shop = loadJSON(shopFile);
    if (!shop[guildId]) shop[guildId] = {};

    if (action === "ajouter") {
      if (price === null || price < 0) {
        return interaction.reply({ content: "❌ Spécifie un prix valide pour le produit.", ephemeral: true });
      }
      shop[guildId][name] = price;
      saveJSON(shopFile, shop);
      return interaction.reply(`🛍️ Produit **${name}** ajouté avec succès pour **${price}€**.`);
    }

    if (action === "supprimer") {
      if (!shop[guildId][name]) {
        return interaction.reply({ content: "❌ Ce produit n’existe pas.", ephemeral: true });
      }
      delete shop[guildId][name];
      saveJSON(shopFile, shop);
      return interaction.reply(`🗑️ Produit **${name}** supprimé.`);
    }

    return interaction.reply({ content: "❌ Action invalide.", ephemeral: true });
  }
};
