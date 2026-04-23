const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
  balancesFile,
  isUserEligible,
  loadJSON,
  saveJSON,
  ensureUserData,
} = require("../../utils/economy");

// Frames de la pièce qui tourne : face → tranche → pile → tranche → ...
const SPIN_FRAMES = [
  { art: "╭───╮\n│ ● │\n╰───╯", label: "Face" },
  { art: "╭─╮\n│ │\n╰─╯",   label: "…"   },
  { art: "╭───╮\n│ ○ │\n╰───╯", label: "Pile" },
  { art: "╭─╮\n│ │\n╰─╯",   label: "…"   },
  { art: "╭───╮\n│ ● │\n╰───╯", label: "Face" },
  { art: "╭─╮\n│ │\n╰─╯",   label: "…"   },
  { art: "╭───╮\n│ ○ │\n╰───╯", label: "Pile" },
  { art: "╭─╮\n│ │\n╰─╯",   label: "…"   },
  { art: "╭───╮\n│ ● │\n╰───╯", label: "Face" },
];

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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

    // Premier frame envoyé immédiatement
    const firstFrame = SPIN_FRAMES[0];
    const spinEmbed = new EmbedBuilder()
      .setTitle("🪙 Flip Coin")
      .setColor(0xf0c040)
      .setDescription(`\`\`\`\n${firstFrame.art}\n\`\`\``)
      .setFooter({ text: `Mise : ${mise}€` });

    const message = await interaction.reply({ embeds: [spinEmbed], fetchReply: true });

    // Animation : frames suivants avec accélération puis décélération
    const delays = [350, 280, 220, 180, 180, 220, 280, 350];

    for (let i = 1; i < SPIN_FRAMES.length; i++) {
      await wait(delays[i - 1]);
      const frame = SPIN_FRAMES[i];
      await message.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle("🪙 Flip Coin")
            .setColor(0xf0c040)
            .setDescription(`\`\`\`\n${frame.art}\n\`\`\``)
            .setFooter({ text: `Mise : ${mise}€` }),
        ],
      });
    }

    await wait(400);

    // Tirage : 1 chance sur 3 de gagner
    const won = Math.random() < 1 / 3;

    if (won) {
      userData.money += mise;
    } else {
      userData.money -= mise;
    }
    saveJSON(balancesFile, balances);

    // Frame final avec résultat
    await message.edit({
      embeds: [
        new EmbedBuilder()
          .setTitle("🪙 Flip Coin")
          .setColor(won ? 0x00ff00 : 0xff0000)
          .setDescription(
            won
              ? `✅ Gagné ! Tu remportes **+${mise}€** !\nNouveau solde : **${userData.money}€**`
              : `❌ Perdu ! Tu perds **-${mise}€**.\nNouveau solde : **${userData.money}€**`
          )
          .setTimestamp(),
      ],
    });

    if (won) {
      console.log(`🪙 [FlipCoin][${guildId}] ${interaction.user.tag} a gagné ${mise}€ au flipcoin.`);
    } else {
      console.log(`🪙 [FlipCoin][${guildId}] ${interaction.user.tag} a perdu ${mise}€ au flipcoin.`);
    }
  },
};
