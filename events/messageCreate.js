const { loadJSON, saveJSON, balancesFile, configFile, ensureUserData, isUserEligible } = require("../utils/economy");
const { randomInt } = require("crypto");

module.exports = {
  name: "messageCreate",
  async execute(message) {
    if (!message.guild || message.author.bot) return;

    const guild = message.guild;
    const guildId = guild.id;
    const userId = message.author.id;

    // Vérifier éligibilité
    if (!isUserEligible(guild, userId)) return;

    // Charger balances
    const balances = loadJSON(balancesFile);
    ensureUserData(balances, guildId, userId);

    // Charger config message
    const msgConfigData = loadJSON(configFile);
    const msgConfig = msgConfigData[guildId];
    if (!msgConfig) return; // Pas de configuration -> rien à faire

    const minGain = msgConfig.min || 1;
    const maxGain = msgConfig.max || 5;

    // Ajouter argent aléatoire
    const gain = randomInt(minGain, maxGain + 1);
    balances[guildId][userId].money += gain;

    // Sauvegarder
    saveJSON(balancesFile, balances);

    // Debug console
    console.log(`💬 ${message.author} a gagné ${gain}€ pour son message.`);
  }
};
