const { SlashCommandBuilder } = require("discord.js");
const { loadJSON, saveJSON, isEconoAdmin } = require("../../utils/economy");
const path = require("path");

const repartitionFile = path.join(__dirname, "../../data/minecraft/repartition.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-boutique-minecraft-inv")
    .setDescription("Gestion de la répartition des gains de la boutique Minecraft")
    .addStringOption(o =>
      o.setName("action")
        .setDescription("Ajouter ou supprimer une répartition (vide = afficher)")
        .setRequired(false)
        .addChoices(
          { name: "ajouter", value: "ajouter" },
          { name: "supprimer", value: "supprimer" }
        )
    )
    .addUserOption(o =>
      o.setName("utilisateur")
        .setDescription("Utilisateur concerné par la répartition")
        .setRequired(false)
    )
    .addIntegerOption(o =>
      o.setName("pourcentage")
        .setDescription("Pourcentage des gains attribués")
        .setRequired(false)
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    if (!isEconoAdmin(guildId, userId)) {
      return interaction.reply({ content: "🚫 Accès refusé.", ephemeral: true });
    }

    const action = interaction.options.getString("action");
    const target = interaction.options.getUser("utilisateur");
    const percent = interaction.options.getInteger("pourcentage");

    const repartition = loadJSON(repartitionFile);
    if (!repartition[guildId]) repartition[guildId] = {};

    // 📊 Affichage de la répartition
    if (!action) {
      const list =
        Object.entries(repartition[guildId])
          .map(([id, p]) => `<@${id}> → ${p}%`)
          .join("\n") || "Aucune répartition configurée.";

      return interaction.reply({ content: list, ephemeral: true });
    }

    // ➕ Ajouter
    if (action === "ajouter") {
      if (!target || percent === null) {
        return interaction.reply({
          content: "❌ Utilisateur et pourcentage requis.",
          ephemeral: true
        });
      }

      if (percent < 0 || percent > 100) {
        return interaction.reply({
          content: "❌ Le pourcentage doit être compris entre 0 et 100.",
          ephemeral: true
        });
      }

      repartition[guildId][target.id] = percent;
      saveJSON(repartitionFile, repartition);

      return interaction.reply(`✅ **${percent}%** des gains iront vers <@${target.id}>`);
    }

    // ➖ Supprimer
    if (action === "supprimer") {
      if (!target) {
        return interaction.reply({
          content: "❌ Utilisateur requis.",
          ephemeral: true
        });
      }

      delete repartition[guildId][target.id];
      saveJSON(repartitionFile, repartition);

      return interaction.reply("🗑️ Répartition supprimée.");
    }
  }
};
