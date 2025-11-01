const fs = require("fs");
const path = require("path");

const bannedUsersFile = path.join(__dirname, "../data/bannedUsers.json");
const adminConfigFile = path.join(__dirname, "../data/adminConfig.json");

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    if (!fs.existsSync(bannedUsersFile)) return;

    const bannedUsers = JSON.parse(fs.readFileSync(bannedUsersFile, "utf8"));
    if (!bannedUsers.includes(member.id)) return;

    // Charger la config du serveur
    if (!fs.existsSync(adminConfigFile)) return;
    const config = JSON.parse(fs.readFileSync(adminConfigFile, "utf8"));
    const guildConfig = config[member.guild.id];
    if (!guildConfig || !guildConfig.goulagRole) {
      console.warn(`[GOULAG] Aucun rôle goulag configuré pour ${member.guild.name}.`);
      return;
    }

    const goulagRoleId = guildConfig.goulagRole;

    try {
      await member.roles.add(goulagRoleId);
      console.log(`🔒 ${member.user.tag} est revenu et a récupéré le rôle goulag (${goulagRoleId}).`);
    } catch (err) {
      console.error(`❌ Impossible d'ajouter le rôle goulag à ${member.user.tag} :`, err);
    }
  }
};
