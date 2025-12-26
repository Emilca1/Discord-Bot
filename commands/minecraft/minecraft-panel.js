const { SlashCommandBuilder } = require("discord.js");
const getServerStatus = require("../../utils/pteroStatus");
const buildPanel = require("../../utils/minecraftPanel");
const config = require("../../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("minecraft-panel")
    .setDescription("Affiche le panneau de contrôle Minecraft"),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(config.roles.minecraftAdmin)) {
      return interaction.reply({
        content: "❌ Accès refusé.",
        ephemeral: true
      });
    }

    const status = await getServerStatus();
    const panel = buildPanel(status);

    await interaction.reply({
      embeds: [panel.embed],
      components: [panel.buttons]
    });
  }
};
