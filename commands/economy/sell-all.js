const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const {
  loadJSON,
  saveJSON,
  balancesFile,
  shopFile,
  isUserEligible,
} = require("../../utils/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sell-all")
    .setDescription("Vendre tout ton inventaire pour obtenir de l’argent."),

  async execute(interaction) {
    const guild = interaction.guild;
    const guildId = guild.id;
    const userId = interaction.user.id;

    // Vérif rôle
    if (!(await isUserEligible(guild, userId))) {
      return interaction.reply({
        content: "🚫 Tu n’as pas le rôle requis pour utiliser le système d’économie.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const balancesData = loadJSON(balancesFile);
    const shopData = loadJSON(shopFile);

    const shopGuild = shopData[guildId] || {};
    const userData = balancesData[guildId]?.[userId];

    if (!userData) {
      return interaction.reply({
        content: "💼 Tu n’as pas encore d’argent ni d’inventaire !",
        flags: MessageFlags.Ephemeral,
      });
    }

    const items = userData.items || {};
    const ownedItems = Object.entries(items).filter(([_, qty]) => qty > 0);

    if (ownedItems.length === 0) {
      return interaction.reply({
        content: "📦 Ton inventaire est vide, rien à vendre !",
        flags: MessageFlags.Ephemeral,
      });
    }

    let totalGain = 0;
    const soldItems = [];

    for (const [itemName, qty] of ownedItems) {
      const price = shopGuild[itemName];
      if (!price) continue; // ignore les objets sans prix dans la boutique
      const gain = price * qty;
      totalGain += gain;
      soldItems.push(`- **${itemName}** ×${qty} → 💰 ${gain}€`);
      userData.money += gain;
      userData.items[itemName] = 0;
    }

    if (soldItems.length === 0) {
      return interaction.reply({
        content: "❌ Aucun des objets de ton inventaire n’a de prix dans la boutique.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Sauvegarde
    saveJSON(balancesFile, balancesData);

    const embed = new EmbedBuilder()
      .setTitle("💰 Vente complète")
      .setDescription(`${soldItems.join("\n")}\n\n**Gain total :** ${totalGain}€`)
      .setColor("Gold")
      .setFooter({ text: `Nouveau solde : ${userData.money}€` });

    return interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  },
};
