const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const codesPath = path.join(__dirname, "../../data/codes.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("code")
    .setDescription("Entre le code trouvé dans ce salon pour débloquer ton rôle.")
    .addStringOption(option =>
      option
        .setName("code")
        .setDescription("Le code trouvé pendant l'escape game.")
        .setRequired(true)
    ),

  async execute(interaction) {
    const userCode = interaction.options.getString("code");
    const channelId = interaction.channel.id;

    if (!fs.existsSync(codesPath)) {
      return interaction.reply({
        content: "⚠️ Aucun code n’a encore été configuré.",
        ephemeral: true
      });
    }

    const codes = JSON.parse(fs.readFileSync(codesPath, "utf8"));
    const entry = codes[channelId];

    if (!entry) {
      return interaction.reply({
        content: `❌ Aucun code n’est configuré pour ce salon.`,
        ephemeral: true
      });
    }

    if (entry.code !== userCode) {
      return interaction.reply({
        content: "🚫 Code incorrect ! Réessaie...",
        ephemeral: true
      });
    }

    const role = await interaction.guild.roles.fetch(entry.roleId);
    if (!role) {
      return interaction.reply({
        content: "⚠️ Le rôle associé à ce code n’existe plus sur le serveur.",
        ephemeral: true
      });
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (member.roles.cache.has(role.id)) {
      return interaction.reply({
        content: `🧙 Tu as déjà le rôle **${role.name}** !`,
        ephemeral: true
      });
    }

    await member.roles.add(role);
    await interaction.reply({
      content: `🎉 Bravo ${interaction.user.username} ! Le code est correct. Tu viens de recevoir le rôle **${role.name}** !`,
      ephemeral: true
    });
  }
};
