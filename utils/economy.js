const fs = require("fs");
const path = require("path");
const baseDir = path.join(__dirname, "../data/economy");

const econoadminsFile = path.join(baseDir, "econoadmins.json");
const balancesFile = path.join(baseDir, "balances.json");
const configFile = path.join(baseDir, "config.json");
const shopFile = path.join(baseDir, "shop.json");
function loadJSON(file) {
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function saveJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}


function isUserEligible(guild, userId) {
  const config = loadJSON(configFile);
  const guildConfig = config[guild.id];
  if (!guildConfig || !guildConfig.eligibility || guildConfig.eligibility.length === 0) {
    // Aucun rôle requis → tout le monde est éligible
    return true;
  }

  const member = guild.members.cache.get(userId);
  if (!member) return false;

  // Vérifie si le membre possède au moins un des rôles éligibles
  return member.roles.cache.some(role => guildConfig.eligibility.includes(role.id));
}


function isEconoAdmin(guildId, userId) {
  const data = loadJSON(econoadminsFile);
  return data[guildId]?.includes(userId) || false;
}

function ensureUserData(balances, guildId, userId) {
  if (!balances[guildId]) balances[guildId] = {};
  if (!balances[guildId][userId]) balances[guildId][userId] = { money: 0, items: {} };
  return balances;
}

module.exports = {
  loadJSON,
  saveJSON,
  isEconoAdmin,
  ensureUserData,
  econoadminsFile,
  balancesFile,
  configFile,
  shopFile,
  isUserEligible
};