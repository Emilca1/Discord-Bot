const { loadJSON, saveJSON, balancesFile, configFile, ensureUserData, isUserEligible } = require("../utils/economy");
const { randomInt } = require("crypto");

const voiceTimers = {}; // { [guildId]: { [userId]: timestamp } }

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState) {
    const guild = newState.guild;
    if (!guild) return;
    const guildId = guild.id;
    const userId = newState.id;

    // Récupérer le membre
    const member = await guild.members.fetch(userId);

    // Vérifier éligibilité via economy.js
    if (!isUserEligible(guild, userId)) return;

    // Début d'activité
    if (!oldState.channel && newState.channel) {
      console.log(`🔊 ${member} a rejoint un vocal dans le serveur ${guild.name}.`);
      if (!voiceTimers[guildId]) voiceTimers[guildId] = {};
      voiceTimers[guildId][userId] = Date.now();
      return;
    }

    // Fin d'activité
    if (oldState.channel && !newState.channel) {
      console.log(`🔈 ${member} a quitté un vocal dans le serveur ${guild.name}.`);

      if (!voiceTimers[guildId] || !voiceTimers[guildId][userId]) {
        console.log(`❌ Aucun timestamp trouvé pour ${member}, skip.`);
        return;
      }

      const timeSpent = Math.floor((Date.now() - voiceTimers[guildId][userId]) / 60000); // minutes
      delete voiceTimers[guildId][userId]; // reset

      console.log(`⏱ Temps passé en vocal : ${timeSpent} minute(s)`);

      // Charger balances
      const balances = loadJSON(balancesFile);
      ensureUserData(balances, guildId, userId);

      // Charger config vocale
      const configData = loadJSON(configFile);
      const guildConfig = configData[guildId];
      if (!guildConfig || !guildConfig.vocal) {
        console.log(`❌ Pas de configuration vocale pour le serveur ${guild.name}`);
        return;
      }

      const minGain = guildConfig.vocal.min || 1;
      const maxGain = guildConfig.vocal.max || 5;

      // Calcul du gain
      const totalGain = Array.from({ length: timeSpent }, () => randomInt(minGain, maxGain + 1))
                             .reduce((a, b) => a + b, 0);

      balances[guildId][userId].money += totalGain;
      saveJSON(balancesFile, balances);

      console.log(`🎤 ${member} a gagné ${totalGain}€ en vocal (${timeSpent} minutes).`);
    }
  }
};
