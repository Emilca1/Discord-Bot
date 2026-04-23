const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
  balancesFile,
  isUserEligible,
  loadJSON,
  saveJSON,
  ensureUserData,
} = require("../../utils/economy");

// Coin farmes
const F = {
  FACE_W: "╔═══════╗\n║ ╭───╮ ║\n║ │ ● │ ║\n║ ╰───╯ ║\n╚═══════╝",
  FACE_M: "╔═════╗\n║╭───╮║\n║│ ● │║\n║╰───╯║\n╚═════╝",
  PILE_M: "╔═════╗\n║╭───╮║\n║│ ○ │║\n║╰───╯║\n╚═════╝",
  PILE_W: "╔═══════╗\n║ ╭───╮ ║\n║ │ ○ │ ║\n║ ╰───╯ ║\n╚═══════╝",
};

// Spin animation sequence : frames + delay (ms)
const SPIN = [
  [F.FACE_M, 360],
  [F.PILE_M, 320],
  [F.PILE_W, 290],
  [F.PILE_M, 270],
  [F.FACE_M, 250],
  [F.FACE_W, 250],
  [F.FACE_M, 270],
  [F.PILE_M, 290],
  [F.PILE_W, 330],
  [F.PILE_M, 380],
  [F.FACE_M, 430],
  [F.FACE_W, 490],
  [F.FACE_M, 550],
  [F.PILE_M, 610],
  [F.PILE_W, 670],
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
      embeds: [spinEmbed(F.FACE_W, choix, mise)],
      fetchReply: true,
    });

    for (const [frame, delay] of SPIN) {
      await wait(delay);
      await message.edit({ embeds: [spinEmbed(frame, choix, mise)] });
    }

    // Final frame
    const landingFrame = result === "face" ? F.FACE_W : F.PILE_W;
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
