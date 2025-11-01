const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

const configFile = path.join(__dirname, "../../data/adminConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("permsadmin")
    .setDescription("Gère les rôles autorisés à utiliser les commandes d'administration.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option
        .setName("action")
        .setDescription("Action à effectuer")
        .setRequired(true)
        .addChoices(
          { name: "ajouter un rôle", value: "add" },
          { name: "supprimer un rôle", value: "remove" },
          { name: "lister les rôles", value: "list" }
        )
    )
    .addRoleOption(option =>
      option
        .setName("role")
        .setDescription("Le rôle à ajouter ou supprimer (non requis pour 'lister').")
        .setRequired(false)
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const action = interaction.options.getString("action");
    const role = interaction.options.getRole("role");

    // Charger ou initialiser la configuration
    let data = {};
    if (fs.existsSync(configFile)) {
      data = JSON.parse(fs.readFileSync(configFile, "utf8"));
    }
    if (!data[guildId]) data[guildId] = { adminChannel: null, adminRoles: [] };

    const guildData = data[guildId];
    const roles = new Set(guildData.adminRoles);

    switch (action) {
      case "add":
        if (!role) {
          return interaction.reply({ content: "❌ Vous devez spécifier un rôle à ajouter.", ephemeral: true });
        }
        if (roles.has(role.id)) {
          return interaction.reply({ content: `⚠️ Le rôle ${role} est déjà autorisé.`, ephemeral: true });
        }
        roles.add(role.id);
        guildData.adminRoles = Array.from(roles);
        fs.writeFileSync(configFile, JSON.stringify(data, null, 2));
        await interaction.reply(`✅ Le rôle ${role} a été ajouté à la liste des rôles d'administration.`);
        break;

      case "remove":
        if (!role) {
          return interaction.reply({ content: "❌ Vous devez spécifier un rôle à retirer.", ephemeral: true });
        }
        if (!roles.has(role.id)) {
          return interaction.reply({ content: `⚠️ Le rôle ${role} n'est pas dans la liste.`, ephemeral: true });
        }
        roles.delete(role.id);
        guildData.adminRoles = Array.from(roles);
        fs.writeFileSync(configFile, JSON.stringify(data, null, 2));
        await interaction.reply(`❎ Le rôle ${role} a été retiré de la liste d'administration.`);
        break;

      case "list":
        if (!roles.size) {
          return interaction.reply("⚠️ Aucun rôle d'administration n'a encore été défini.");
        }
        const roleList = Array.from(roles).map(id => `<@&${id}>`).join(", ");
        await interaction.reply(`🛡️ Rôles d'administration actuels : ${roleList}`);
        break;

      default:
        await interaction.reply({ content: "❌ Action invalide.", ephemeral: true });
        break;
    }
  }
};
