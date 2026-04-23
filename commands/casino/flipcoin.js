const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
  balancesFile,
  isUserEligible,
  loadJSON,
  saveJSON,
  ensureUserData,
} = require("../../utils/economy");

// Frames de la pièce en perspective 3D (elle tourne sur son axe vertical)
const F = {
  FACE_W:  "╔═══════╗\n║ ╭───╮ ║\n║ │ ● │ ║\n║ ╰───╯ ║\n╚═══════╝",
  FACE_M:  "╔═════╗\n║╭───╮║\n║│ ● │║\n║╰───╯║\n╚═════╝",
  EDGE:    "╔══╗\n║  ║\n║  ║\n║  ║\n╚══╝",
  PILE_M:  "╔═════╗\n║╭───╮║\n║│ ○ │║\n║╰───╯║\n╚═════╝",
  PILE_W:  "╔═══════╗\n║ ╭───╮ ║\n║ │ ○ │ ║\n║ ╰───╯ ║\n╚═══════╝",
};

// Frame résultat tranche : pièce debout sur la tranche, plus haute pour dramatiser
const TRANCHE_FRAME =
  "╔══╗\n║  ║\n║  ║\n║  ║\n║  ║\n║  ║\n╚══╝";

// Séquence de spin avec délais croissants (accélération → décélération)
const SPIN = [
  [F.FACE_M,  380],
  [F.EDGE,    360],
  [F.PILE_M,  340],
  [F.PILE_W,  320],
  [F.PILE_M,  340],
  [F.EDGE,    360],
  [F.FACE_M,  380],
  [F.FACE_W,  420],
  [F.FACE_M,  460],
  [F.EDGE,    500],
  [F.PILE_M,  540],
  [F.PILE_W,  580],
  [F.PILE_M,  620],
  [F.EDGE,    660],
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
    .setDescription("Pile ou face — 1 chance sur 3 de doubler ta mise.")
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

    // Tirage : face (1/3) | pile (1/3) | tranche (1/3)
    const roll = Math.random();
    const result = roll < 1 / 3 ? "face" : roll < 2 / 3 ? "pile" : "tranche";
    const won = result === choix;

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

    // Frame d'atterrissage selon le résultat
    const landingFrame =
      result === "face"    ? F.FACE_W  :
      result === "pile"    ? F.PILE_W  :
      /* tranche */          TRANCHE_FRAME;

    await wait(700);
    await message.edit({ embeds: [spinEmbed(landingFrame, choix, mise)] });
    await wait(800);

    // Embed final
    let color, desc;
    if (result === "tranche") {
      color = 0xffa500;
      desc  = `😱 La pièce est tombée sur la **tranche** !\nTu perds **-${mise}€**.\nNouveau solde : **${userData.money}€**`;
    } else if (won) {
      color = 0x00ff00;
      desc  = `✅ La pièce est tombée sur **${result === "face" ? "● Face" : "○ Pile"}** !\nBien joué ! Tu remportes **+${mise}€** !\nNouveau solde : **${userData.money}€**`;
    } else {
      color = 0xff0000;
      desc  = `❌ La pièce est tombée sur **${result === "face" ? "● Face" : "○ Pile"}** !\nTu avais choisi ${choix === "face" ? "● Face" : "○ Pile"}. Tu perds **-${mise}€**.\nNouveau solde : **${userData.money}€**`;
    }

    await message.edit({
      embeds: [
        new EmbedBuilder()
          .setTitle("🪙 Flip Coin")
          .setColor(color)
          .setDescription(desc)
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
