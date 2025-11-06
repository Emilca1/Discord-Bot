// commands/economy/daily.js
const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const {
  balancesFile,
  configFile,
  isUserEligible,
  loadJSON,
  saveJSON,
  ensureUserData,
} = require("../../utils/economy");

function getTodayDateString() {
  const now = new Date();
  return now.toISOString().split("T")[0]; // "2025-11-04"
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Réclame ton gain journalier."),

  async execute(interaction) {
    const guild = interaction.guild;
    const guildId = guild.id;
    const userId = interaction.user.id;

    // Vérification des rôles éligibles
    if (!isUserEligible(guild, userId)) {
      return interaction.reply({
        content: "🚫 Tu n’as pas le rôle requis pour utiliser le système d’économie.",
        ephemeral: true,
      });
    }

    // Charger la config
    if (!fs.existsSync(configFile))
      return interaction.reply("⚙️ Le système d’économie n’est pas configuré.");

    const config = loadJSON(configFile);
    const guildConfig = config[guildId];
    if (!guildConfig || !guildConfig.daily)
      return interaction.reply("⚠️ Le daily n’est pas encore configuré.");

    const { min, max } = guildConfig.daily;
    const gain = Math.floor(Math.random() * (max - min + 1)) + min;

    // Charger les balances
    const balances = loadJSON(balancesFile);
    ensureUserData(balances, guildId, userId);

    const today = getTodayDateString();
    const userData = balances[guildId][userId];

    // Si déjà réclamé aujourd'hui
    if (userData.lastDailyDate === today) {
      return interaction.reply("⏳ Tu as déjà pris ton daily aujourd’hui, reviens demain !");
    }

    // Ajouter l’argent
    userData.money += gain;
    userData.lastDailyDate = today; // Remplace l’ancien timestamp
    saveJSON(balancesFile, balances);

    await interaction.reply(`💸 Tu as gagné **${gain}€** aujourd’hui !`);
    console.log(`📩 ${interaction.user.tag} a gagné ${gain}€ avec son daily.`);
  },
};
