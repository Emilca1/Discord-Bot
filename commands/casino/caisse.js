const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require("discord.js");
const path = require("path");
const fs = require("fs");
const { loadJSON, saveJSON, balancesFile } = require("../../utils/economy");

const caisseFile = path.join(__dirname, "../../data/casino/caisse.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("caisse")
    .setDescription("Ouvre une caisse du casino."),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const userTag = interaction.user;

    // Vérifier la caisse
    if (!fs.existsSync(caisseFile)) {
      return interaction.reply({
        content: "⚠️ Aucune caisse configurée pour ce serveur.",
        ephemeral: true,
      });
    }

    const caisseData = loadJSON(caisseFile);
    const guildCaisse = caisseData[guildId];

    if (!guildCaisse) {
      return interaction.reply({
        content: "⚠️ Aucune caisse configurée pour ce serveur.",
        ephemeral: true,
      });
    }

    const price = guildCaisse.price || 0;
    const lots = guildCaisse.lots || [];

    if (lots.length === 0) {
      return interaction.reply({
        content: "⚠️ Aucun lot n'est défini pour cette caisse.",
        ephemeral: true,
      });
    }

    // Charger les données joueur
    const balances = loadJSON(balancesFile);
    if (!balances[guildId]) balances[guildId] = {};
    if (!balances[guildId][userId]) balances[guildId][userId] = { money: 0, items: {} };
    const userData = balances[guildId][userId];

    if (userData.money < price) {
      return interaction.reply({
        content: `💸 Tu n’as pas assez d’argent pour ouvrir cette caisse (${price}€).`,
        ephemeral: true,
      });
    }

    // Débiter le joueur
    userData.money -= price;
    saveJSON(balancesFile, balances);

    // 📦 Afficher l'animation d'ouverture
    const playGifPath = path.join(__dirname, "../../src/play.gif");
    const playAttachment = new AttachmentBuilder(playGifPath, { name: "play.gif" });

    const message = await interaction.reply({
      content: "🎁 Ouverture de la caisse...",
      files: [playAttachment],
      fetchReply: true,
    });

    // ⏱️ Attente 5 secondes avant d'afficher le résultat
    await new Promise((r) => setTimeout(r, 5000));

    // 🎁 Tirage du lot
    const totalChance = lots.reduce((sum, lot) => sum + lot.chance, 0);
    let rand = Math.random() * totalChance;
    let wonLot = lots[0];

    for (const lot of lots) {
      if (rand < lot.chance) {
        wonLot = lot;
        break;
      }
      rand -= lot.chance;
    }

    // Quantité
    let quantity = wonLot.quantity || 1;
    if (Array.isArray(quantity) && quantity.length === 2) {
      const [min, max] = quantity;
      quantity = Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Ajout récompense
    if (/\d+€/.test(wonLot.name)) {
      const amount = parseInt(wonLot.name.replace("€", ""));
      userData.money += amount * quantity;
    } else {
      userData.items[wonLot.name] = (userData.items[wonLot.name] || 0) + quantity;
    }

    saveJSON(balancesFile, balances);

    // Image du lot
    const imagePath = path.join(__dirname, "../../", wonLot.image);
    const attachment = new AttachmentBuilder(imagePath, { name: path.basename(imagePath) });

    // Embed final
    const embed = new EmbedBuilder()
      .setTitle(`🎉 Une caisse a été ouverte !`)
      .setDescription(`<@${userId}> a remporté **${quantity}x ${wonLot.name}** !`)
      .setImage(`attachment://${path.basename(imagePath)}`)
      .setColor(0x00ff00)
      .setTimestamp();

    // 💥 Remplace le message d’animation par le résultat
    await message.edit({
      content: "",
      embeds: [embed],
      files: [attachment],
    });

    console.log(`🎲 [Caisse][${guildId}] ${userTag} a ouvert une caisse et a gagné ${quantity}x ${wonLot.name}`);
  },
};
