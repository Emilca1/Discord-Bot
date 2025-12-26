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
    )
    .addBooleanOption(o =>
      o.setName("equipable")
        .setDescription("Équipable sur la tête ? (oui/non)")
        .setRequired(false)
    )
    .addStringOption(o =>
      o.setName("objetminecraft")
        .setDescription("Nom de l'objet Minecraft (ex: netherite_helmet, netherite_sword)")
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
    const equipable = interaction.options.getBoolean("equipable") || false;
    const objetMinecraft = interaction.options.getString("objetminecraft") || "netherite_helmet";

    let shop = loadJSON(shopFile) || {};

    if (action === "ajouter") {
      shop[name] = {
        price,
        cosmetic,
        equipable,
        objetMinecraft
      };
      saveJSON(shopFile, shop);
      return interaction.reply({ content: `✅ Produit "${name}" ajouté/édité.`, ephemeral: true });
    } else if (action === "supprimer") {
      if (shop[name]) {
        delete shop[name];
        saveJSON(shopFile, shop);
        return interaction.reply({ content: `🗑️ Produit "${name}" supprimé.`, ephemeral: true });
      } else {
        return interaction.reply({ content: `❌ Produit "${name}" introuvable.`, ephemeral: true });
      }
    }
  }
};