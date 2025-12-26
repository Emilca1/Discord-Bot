const { SlashCommandBuilder } = require("discord.js");
const { loadJSON, saveJSON, isEconoAdmin } = require("../../utils/economy");
const path = require("path");

const shopFile = path.join(__dirname, "../../data/minecraft/shop.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-boutique-minecraft")
    .setDescription("Gérer les produits de la boutique Minecraft")
    .addStringOption(o =>
      o.setName("action")
        .setDescription("Ajouter ou supprimer un produit")
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
    )
    .addStringOption(o =>
      o.setName("cosmetique")
        .setDescription("Identifiant du cosmétique Minecraft")
        .setRequired(false)
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    if (!isEconoAdmin(guildId, userId)) {
      return interaction.reply({ content: "🚫 Accès refusé.", ephemeral: true });
    }

    const action = interaction.options.getString("action");
    const name = interaction.options.getString("nomproduit");
    const price = interaction.options.getInteger("prix");
    const cosmetic = interaction.options.getString("cosmetique");

    const shop = loadJSON(shopFile);
    if (!shop[guildId]) shop[guildId] = {};

    // ➕ Ajouter
    if (action === "ajouter") {
      if (price === null || price < 0 || !cosmetic) {
        return interaction.reply({
          content: "❌ Prix valide et cosmétique requis.",
          ephemeral: true
        });
      }

      shop[guildId][name] = { price, cosmetic };
      saveJSON(shopFile, shop);

      return interaction.reply(`✅ **${name}** ajouté pour **${price}€** (${cosmetic})`);
    }

    // ➖ Supprimer
    if (action === "supprimer") {
      if (!shop[guildId][name]) {
        return interaction.reply({
          content: "❌ Ce produit n’existe pas.",
          ephemeral: true
        });
      }

      delete shop[guildId][name];
      saveJSON(shopFile, shop);

      return interaction.reply(`🗑️ **${name}** supprimé.`);
    }
  }
};
