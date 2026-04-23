const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
  balancesFile,
  isUserEligible,
  loadJSON,
  saveJSON,
  ensureUserData,
} = require("../../utils/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("flipcoin")
    .setDescription("Pile ou face — 1 chance sur 3 de doubler ta mise.")
    .addIntegerOption(option =>
      option
        .setName("mise")
        .setDescription("Montant à miser")
        .setMinValue(1)
        .setRequired(true)
    ),

  async execute(interaction) {
    const guild = interaction.guild;
    const guildId = guild.id;
    const userId = interaction.user.id;
    const mise = interaction.options.getInteger("mise");

    // Vérification des rôles éligibles
    if (!isUserEligible(guild, userId)) {
      return interaction.reply({
        content: "🚫 Tu n'as pas le rôle requis pour utiliser le système d'économie.",
        ephemeral: true,
      });
    }

    // Charger les balances
    const balances = loadJSON(balancesFile);
    ensureUserData(balances, guildId, userId);
    const userData = balances[guildId][userId];

    // Vérifier le solde
    if (userData.money < mise) {
      return interaction.reply({
        content: `💸 Tu n'as pas assez d'argent. Solde actuel : **${userData.money}€**.`,
        ephemeral: true,
      });
    }

    // Tirage : 1 chance sur 3 de gagner
    const won = Math.random() < 1 / 3;

    if (won) {
      userData.money += mise;
    } else {
      userData.money -= mise;
    }
    saveJSON(balancesFile, balances);

    const embed = new EmbedBuilder()
      .setTitle("🪙 Flip Coin")
      .setColor(won ? 0x00ff00 : 0xff0000)
      .setDescription(
        won
          ? `✅ Gagné ! Tu remportes **+${mise}€** !\nNouveau solde : **${userData.money}€**`
          : `❌ Perdu ! Tu perds **-${mise}€**.\nNouveau solde : **${userData.money}€**`
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    if (won) {
      console.log(`🪙 [FlipCoin][${guildId}] ${interaction.user.tag} a gagné ${mise}€ au flipcoin.`);
    } else {
      console.log(`🪙 [FlipCoin][${guildId}] ${interaction.user.tag} a perdu ${mise}€ au flipcoin.`);
    }
  },
};
