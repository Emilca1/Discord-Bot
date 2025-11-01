const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

const codesPath = path.join(__dirname, "../../data/codes.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list-codes")
    .setDescription("Affiche la liste de tous les codes configurés (admin uniquement).")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!fs.existsSync(codesPath)) {
      return interaction.reply({ content: "⚠️ Aucun code n’a encore été configuré.", ephemeral: true });
    }

    const codes = JSON.parse(fs.readFileSync(codesPath, "utf8"));
    const entries = Object.entries(codes);

    if (entries.length === 0) {
      return interaction.reply({ content: "📭 Aucun code configuré pour le moment.", ephemeral: true });
    }

    let message = "📜 **Liste des codes configurés :**\n\n";
    for (const [channelId, data] of entries) {
      message += `🏷️ Salon : <#${channelId}>\n🔑 Code : \`${data.code}\`\n🎭 Rôle : <@&${data.roleId}>\n\n`;
    }

    await interaction.reply({ content: message, ephemeral: true });
  }
};
