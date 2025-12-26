const axios = require("axios");
const getServerStatus = require("../utils/pteroStatus");
const buildPanel = require("../utils/minecraftPanel");
const config = require("../config.json");

module.exports = {
  customIds: ["mc_start", "mc_stop"],

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(config.roles.minecraftAdmin)) {
      return interaction.reply({
        content: "❌ Accès refusé.",
        ephemeral: true
      });
    }

    const signal = interaction.customId === "mc_start" ? "start" : "stop";

    await interaction.deferUpdate();

    await axios.post(
      `${config.pterodactyl.panelUrl}/api/client/servers/${config.pterodactyl.serverId}/power`,
      { signal },
      {
        headers: {
          Authorization: `Bearer ${config.pterodactyl.apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json"
        }
      }
    );

    setTimeout(async () => {
      const status = await getServerStatus();
      const panel = buildPanel(status);

      await interaction.editReply({
        embeds: [panel.embed],
        components: [panel.buttons]
      });
    }, 3000);
  }
};
