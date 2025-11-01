const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
const econoadminsFile = path.join(__dirname, "../../data/economy/econoadmins.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-econoadmin")
    .setDescription("Gérer les administrateurs de l’économie du serveur.")
    .addStringOption(option =>
      option
        .setName("action")
        .setDescription("Action à effectuer")
        .setRequired(true)
        .addChoices(
          { name: "Ajouter", value: "ajouter" },
          { name: "Supprimer", value: "supprimer" },
          { name: "Lister", value: "lister" }
        )
    )
    .addUserOption(option =>
      option
        .setName("joueur")
        .setDescription("Utilisateur à modifier")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const action = interaction.options.getString("action");
    const user = interaction.options.getUser("joueur");

    let data = {};
    if (fs.existsSync(econoadminsFile))
      data = JSON.parse(fs.readFileSync(econoadminsFile, "utf8"));
    if (!data[guildId]) data[guildId] = [];

    const econoadmins = data[guildId];

    if (action === "ajouter") {
      if (!user) return interaction.reply({ content: "❌ Spécifie un utilisateur.", ephemeral: true });
      if (econoadmins.includes(user.id))
        return interaction.reply({ content: `${user} est déjà admin de l’économie.`, ephemeral: true });
      econoadmins.push(user.id);
      fs.writeFileSync(econoadminsFile, JSON.stringify(data, null, 2));
      return interaction.reply(`✅ ${user} a été ajouté comme administrateur de l’économie.`);
    }

    if (action === "supprimer") {
      if (!user) return interaction.reply({ content: "❌ Spécifie un utilisateur.", ephemeral: true });
      if (!econoadmins.includes(user.id))
        return interaction.reply({ content: `${user} n’est pas un admin de l’économie.`, ephemeral: true });
      data[guildId] = econoadmins.filter(id => id !== user.id);
      fs.writeFileSync(econoadminsFile, JSON.stringify(data, null, 2));
      return interaction.reply(`🗑️ ${user} n’est plus administrateur de l’économie.`);
    }

    if (action === "lister") {
      if (econoadmins.length === 0) return interaction.reply("Aucun administrateur de l’économie configuré.");
      const list = econoadmins.map(id => `<@${id}>`).join("\n");
      return interaction.reply(`👑 **Admins de l’économie :**\n${list}`);
    }
  }
};