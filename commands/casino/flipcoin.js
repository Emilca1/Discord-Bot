const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
  balancesFile,
  isUserEligible,
  loadJSON,
  saveJSON,
  ensureUserData,
} = require("../../utils/economy");

// Coin frames
const F = {
  FACE: "╔═══════╗\n║ ╭───╮ ║\n║ │ ● │ ║\n║ ╰───╯ ║\n╚═══════╝",
  PILE: "╔═══════╗\n║ ╭───╮ ║\n║ │ ○ │ ║\n║ ╰───╯ ║\n╚═══════╝",
};

// Spin animation sequence : frames + delay (ms)
const SPIN = [
  [F.PILE, 150],
  [F.FACE, 150],
  [F.PILE, 180],
  [F.FACE, 220],
  [F.PILE, 280],
  [F.FACE, 360],
];

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function spinEmbed(frame, choix, mise) {
  return new EmbedBuilder()
    .setTitle("🪙 Flip Coin")
    .setColor(0xf0c040)
    .setDescription("```\n" + frame + "\n```")
    .setFooter({ text: `Mise : ${mise}€  •  Ton choix : ${choix === "face" ? "● Face" : "○ Pile"}` });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("flipcoin")
    .setDescription("Pile ou face — 1 chance sur 3 de doubler ta mise !")
    .addStringOption(option =>
      option
        .setName("choix")
        .setDescription("Pile ou Face ?")
        .setRequired(true)
        .addChoices(
          { name: "● Face", value: "face" },
          { name: "○ Pile", value: "pile" },
        )
    )
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
    const choix = interaction.options.getString("choix");
    const mise = interaction.options.getInteger("mise");

    // eligibility check
    if (!isUserEligible(guild, userId)) {
      return interaction.reply({
        content: "🚫 Tu n'as pas le rôle requis pour utiliser le système d'économie.",
        ephemeral: true,
      });
    }

    // load balances
    const balances = loadJSON(balancesFile);
    ensureUserData(balances, guildId, userId);
    const userData = balances[guildId][userId];

    // verify sold
    if (userData.money < mise) {
      return interaction.reply({
        content: `💸 Tu n'as pas assez d'argent. Solde actuel : **${userData.money}€**.`,
        ephemeral: true,
      });
    }

    // determine win/loss
    const won = Math.random() < 1 / 3;
    const result = won ? choix : (choix === "face" ? "pile" : "face");

    if (won) {
      userData.money += mise;
    } else {
      userData.money -= mise;
    }
    saveJSON(balancesFile, balances);

    // === ANIMATION ===
    const message = await interaction.reply({
      embeds: [spinEmbed(F.FACE, choix, mise)],
      fetchReply: true,
    });

    for (const [frame, delay] of SPIN) {
      await wait(delay);
      await message.edit({ embeds: [spinEmbed(frame, choix, mise)] });
    }

    // Final frame
    const landingFrame = result === "face" ? F.FACE : F.PILE;
    await wait(700);
    await message.edit({ embeds: [spinEmbed(landingFrame, choix, mise)] });
    await wait(900);

    // Embed final
    await message.edit({
      embeds: [
        new EmbedBuilder()
          .setTitle("🪙 Flip Coin")
          .setColor(won ? 0x00ff00 : 0xff0000)
          .setDescription(
            won
              ? `✅ **${result === "face" ? "● Face" : "○ Pile"}** !\nBien joué ! Tu remportes **+${mise}€** !\nNouveau solde : **${userData.money}€**`
              : `❌ **${result === "face" ? "● Face" : "○ Pile"}** !\nTu avais choisi ${choix === "face" ? "● Face" : "○ Pile"}. Tu perds **-${mise}€**.\nNouveau solde : **${userData.money}€**`
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
