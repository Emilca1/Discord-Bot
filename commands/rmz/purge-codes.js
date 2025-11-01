const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

const codesPath = path.join(__dirname, "../../data/codes.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("purge-codes")
    .setDescription("Supprime tous les codes configurés (admin uniquement).")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!fs.existsSync(codesPath)) {
      return interaction.reply({ content: "⚠️ Aucun fichier de codes n’existe encore.", ephemeral: true });
    }

    fs.writeFileSync(codesPath, JSON.stringify({}, null, 2));

    await interaction.reply({
      content: "🧹 Tous les codes ont été supprimés avec succès !",
      ephemeral: true
    });
  }
};
