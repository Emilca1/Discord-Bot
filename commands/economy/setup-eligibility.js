const { SlashCommandBuilder } = require("discord.js");
const { loadJSON, saveJSON, isEconoAdmin, configFile } = require("../../utils/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-eligibility")
    .setDescription("Configurer les rôles pouvant utiliser le système d’économie.")
    .addStringOption(opt =>
      opt.setName("action")
        .setDescription("ajouter ou supprimer")
        .setRequired(true)
        .addChoices({ name: "ajouter", value: "ajouter" }, { name: "supprimer", value: "supprimer" })
    )
    .addRoleOption(opt => opt.setName("rôle").setDescription("Rôle à modifier").setRequired(true)),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    if (!isEconoAdmin(guildId, userId))
      return interaction.reply({ content: "🚫 Vous n’êtes pas éconoadmin.", ephemeral: true });

    const action = interaction.options.getString("action");
    const role = interaction.options.getRole("rôle");

    const config = loadJSON(configFile);
    if (!config[guildId]) config[guildId] = {};
    if (!config[guildId].eligibility) config[guildId].eligibility = [];

    const roles = config[guildId].eligibility;

    if (action === "ajouter") {
      if (!roles.includes(role.id)) roles.push(role.id);
      saveJSON(configFile, config);
      return interaction.reply(`✅ ${role} ajouté à la liste des rôles éligibles.`);
    }

    if (action === "supprimer") {
      config[guildId].eligibility = roles.filter(r => r !== role.id);
      saveJSON(configFile, config);
      return interaction.reply(`🗑️ ${role} retiré de la liste des rôles éligibles.`);
    }
  }
};
