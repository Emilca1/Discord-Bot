const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { loadJSON, balancesFile, isUserEligible, isEconoAdmin } = require("../../utils/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("inventaire")
    .setDescription("Afficher ton inventaire et ton argent.")
    .addUserOption(option =>
      option
        .setName("joueur")
        .setDescription("Voir l'inventaire d'un autre joueur (éconoadmin uniquement)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const guild = interaction.guild;
    const guildId = guild.id;
    const userId = interaction.user.id;

    // Vérification si on veut voir l'inventaire d'un autre joueur
    let targetUser = interaction.options.getUser("joueur") || interaction.user;

    // Si cible différente, vérifier si l'utilisateur est éconoadmin
    if (targetUser.id !== userId && !isEconoAdmin(guildId, userId)) {
      return interaction.reply({
        content: "🚫 Vous devez être éconoadmin pour voir l'inventaire d'un autre joueur.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Vérification des rôles éligibles si on consulte son propre inventaire
    if (targetUser.id === userId && !(await isUserEligible(guild, userId))) {
      return interaction.reply({
        content: "🚫 Tu n’as pas le rôle requis pour utiliser le système d’économie.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Charger les balances
    const balances = loadJSON(balancesFile);
    const userData = balances[guildId]?.[targetUser.id];

    if (!userData) {
      return interaction.reply({
        content: `💼 ${targetUser.id === userId ? "Tu" : targetUser.username} n’a encore rien gagné !`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // Afficher argent + objets
    const items =
      Object.entries(userData.items || {})
        .map(([name, qty]) => `• **${name}** ×${qty}`)
        .join("\n") || "Aucun objet";

    await interaction.reply({
      content: `💰 **Argent :** ${userData.money}€\n🎒 **Objets :**\n${items}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
