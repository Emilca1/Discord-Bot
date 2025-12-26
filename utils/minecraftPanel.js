const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

module.exports = function buildPanel(status) {
  const statusMap = {
    running: "🟢 En ligne",
    offline: "🔴 Hors ligne",
    starting: "🟠 Démarrage",
    stopping: "🟠 Arrêt"
  };

  const embed = new EmbedBuilder()
    .setTitle("🟩 Serveur Minecraft")
    .setDescription(`**Statut :** ${statusMap[status] || "Inconnu"}`)
    .setColor(
      status === "running" ? 0x2ecc71 :
      status === "offline" ? 0xe74c3c :
      0xf39c12
    )
    .setTimestamp();

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("mc_start")
      .setLabel("Démarrer")
      .setStyle(ButtonStyle.Success)
      .setDisabled(status === "running" || status === "starting"),

    new ButtonBuilder()
      .setCustomId("mc_stop")
      .setLabel("Arrêter")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(status === "offline" || status === "stopping")
  );

  return { embed, buttons };
};
