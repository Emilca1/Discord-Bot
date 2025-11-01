const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const bannedUsersFile = path.join(__dirname, "../../data/bannedUsers.json");
const adminConfigFile = path.join(__dirname, "../../data/adminConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("goulag")
    .setDescription("Envoie ou fait revenir un utilisateur du goulag, ou liste les bannis.")
    .addStringOption(option =>
      option
        .setName("action")
        .setDescription("Action à effectuer (envoyer, revenir ou lister)")
        .setRequired(true)
        .addChoices(
          { name: "Envoyer au goulag", value: "send" },
          { name: "Faire revenir du goulag", value: "release" },
          { name: "Lister les bannis", value: "list" }
        )
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("L’utilisateur concerné (non requis pour lister)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const action = interaction.options.getString("action");
    const targetUser = interaction.options.getUser("user");
    const guild = interaction.guild;

    // Charger la configuration admin
    let config = {};
    if (fs.existsSync(adminConfigFile))
      config = JSON.parse(fs.readFileSync(adminConfigFile, "utf8"));
    const guildConfig = config[guildId] || { adminRoles: [], adminChannel: null, goulagRole: null };

    // Vérifier les permissions admin
    const memberRoles = interaction.member?.roles?.cache.map(r => r.id) || [];
    const isAdmin = guildConfig.adminRoles.some(roleId => memberRoles.includes(roleId));
    if (!isAdmin) {
      return interaction.reply({
        content: "🚫 Vous n’avez pas la permission d’utiliser cette commande.",
        ephemeral: true
      });
    }

    // Charger la liste des bannis
    let bannedUsers = [];
    if (fs.existsSync(bannedUsersFile)) {
      bannedUsers = JSON.parse(fs.readFileSync(bannedUsersFile, "utf8"));
    }

    // ---- ACTION : LISTER ----
    if (action === "list") {
      if (bannedUsers.length === 0) {
        return interaction.reply({
          content: "✅ Aucun utilisateur n’est actuellement au goulag.",
          ephemeral: true
        });
      }

      const members = await Promise.all(
        bannedUsers.map(id => guild.members.fetch(id).catch(() => null))
      );
      const memberList = members
        .filter(m => m)
        .map(m => `• ${m} (${m.id})`)
        .join("\n");

      return interaction.reply({
        content: `🚫 **Joueurs actuellement au goulag :**\n${memberList}`,
        ephemeral: true
      });
    }

    // Pour send ou release, on a besoin d'un utilisateur
    if (!targetUser) {
      return interaction.reply({
        content: "❌ Vous devez spécifier un utilisateur pour cette action.",
        ephemeral: true
      });
    }

    const member = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      return interaction.reply({
        content: "❌ Impossible de trouver cet utilisateur.",
        ephemeral: true
      });
    }

    // Vérifier que le rôle goulag est défini
    if (!guildConfig.goulagRole) {
      return interaction.reply({
        content: "⚠️ Aucun rôle de goulag n’a été défini. Utilisez `/setup-goulagrole <rôle>` pour le configurer.",
        ephemeral: true
      });
    }
    const goulagRoleId = guildConfig.goulagRole;

    // ---- ACTION : ENVOYER AU GOULAG ----
    if (action === "send") {
      if (!bannedUsers.includes(member.id)) {
        bannedUsers.push(member.id);
        fs.writeFileSync(bannedUsersFile, JSON.stringify(bannedUsers, null, 2));
      }

      // Retirer tous les rôles sauf @everyone
      const rolesToRemove = member.roles.cache.filter(role => role.id !== guild.id);
      for (const role of rolesToRemove.values()) {
        await member.roles.remove(role).catch(() => {});
      }

      // Ajouter le rôle goulag
      await member.roles.add(goulagRoleId).catch(() => {});

      await interaction.reply(`🚫 ${member} a été envoyé au goulag.`);

      // Log dans le salon admin
      if (guildConfig.adminChannel) {
        const logChannel = guild.channels.cache.get(guildConfig.adminChannel);
        if (logChannel)
          logChannel.send(`⚠️ ${interaction.user} a envoyé ${member} (${member.id}) au goulag.`);
      }
    }

    // ---- ACTION : FAIRE REVENIR ----
    else if (action === "release") {
      if (!bannedUsers.includes(member.id)) {
        return interaction.reply({
          content: "⚠️ Cet utilisateur n’est pas actuellement au goulag.",
          ephemeral: true
        });
      }

      // Retirer le rôle goulag
      await member.roles.remove(goulagRoleId).catch(() => {});

      // Supprimer du fichier
      bannedUsers = bannedUsers.filter(id => id !== member.id);
      fs.writeFileSync(bannedUsersFile, JSON.stringify(bannedUsers, null, 2));

      await interaction.reply(`✅ ${member} a été libéré du goulag.`);

      // Log dans le salon admin
      if (guildConfig.adminChannel) {
        const logChannel = guild.channels.cache.get(guildConfig.adminChannel);
        if (logChannel)
          logChannel.send(`🕊️ ${interaction.user} a libéré ${member} (${member.id}) du goulag.`);
      }
    }
  }
};
