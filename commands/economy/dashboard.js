// commands/economy/dashboard.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const fs = require("fs");
const {
  balancesFile,
  isUserEligible,
  loadJSON,
} = require("../../utils/economy");

const USERS_PER_PAGE = 15;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dashboard")
    .setDescription("Affiche le classement de tous les utilisateurs par argent (ordre croissant).")
    .addIntegerOption((option) =>
      option
        .setName("page")
        .setDescription("Numéro de la page à afficher")
        .setMinValue(1)
        .setRequired(false)
    ),

  async execute(interaction) {
    const guild = interaction.guild;
    const guildId = guild.id;
    const userId = interaction.user.id;

    // Vérification des rôles éligibles
    if (!isUserEligible(guild, userId)) {
      return interaction.reply({
        content:
          "🚫 Tu n'as pas le rôle requis pour utiliser le système d'économie.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Defer la réponse pour éviter le timeout de 3s
    await interaction.deferReply();

    // Charger les balances
    if (!fs.existsSync(balancesFile)) {
      return interaction.editReply("⚠️ Aucune donnée d'économie trouvée.");
    }

    const balances = loadJSON(balancesFile);
    const guildBalances = balances[guildId];

    if (!guildBalances || Object.keys(guildBalances).length === 0) {
      return interaction.editReply("⚠️ Aucun utilisateur enregistré sur ce serveur.");
    }

    // Construire et trier la liste par argent (ordre décroissant)
    const sorted = Object.entries(guildBalances)
      .map(([id, data]) => ({ id, money: data.money ?? 0 }))
      .sort((a, b) => b.money - a.money);

    // Pagination
    const totalPages = Math.ceil(sorted.length / USERS_PER_PAGE);
    const page = Math.min(
      interaction.options.getInteger("page") || 1,
      totalPages
    );
    const start = (page - 1) * USERS_PER_PAGE;
    const pageUsers = sorted.slice(start, start + USERS_PER_PAGE);

    // Résoudre les noms d'utilisateurs
    const lines = await Promise.all(
      pageUsers.map(async (entry, i) => {
        const rank = start + i + 1;
        let displayName;
        try {
          const member = await guild.members.fetch(entry.id);
          displayName = member.displayName;
        } catch {
          displayName = `Utilisateur inconnu`;
        }
        return `**${rank}.** ${displayName} — **${entry.money.toLocaleString("fr-FR")}€**`;
      })
    );

    // Construire l'embed
    const embed = new EmbedBuilder()
      .setTitle("📊 Dashboard économique")
      .setDescription(lines.join("\n"))
      .setFooter({
        text: `Page ${page}/${totalPages} • ${sorted.length} utilisateurs`,
      })
      .setColor(0x2b2d31)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};