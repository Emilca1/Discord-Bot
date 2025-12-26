const { SlashCommandBuilder } = require("discord.js");
const axios = require("axios");
const config = require("../../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("start-minecraft")
    .setDescription("Démarre le serveur Minecraft"),

  async execute(interaction) {
    const ROLE_ID = config.roles.minecraftAdmin;

    // Vérification du rôle
    if (!interaction.member.roles.cache.has(ROLE_ID)) {
      return interaction.reply({
        content: "❌ Tu n'as pas la permission d'utiliser cette commande.",
        ephemeral: true
      });
    }

    try {
      await axios.post(
        `${config.pterodactyl.panelUrl}/api/client/servers/${config.pterodactyl.serverId}/power`,
        { signal: "start" },
        {
          headers: {
            Authorization: `Bearer ${config.pterodactyl.apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json"
          }
        }
      );

      await interaction.reply("✅ Le serveur Minecraft est en cours de démarrage !");
    } catch (error) {
      console.error("Erreur Pterodactyl :", error.response?.data || error.message);

      await interaction.reply({
        content: "❌ Impossible de démarrer le serveur Minecraft.",
        ephemeral: true
      });
    }
  }
};
