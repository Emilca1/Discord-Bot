const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags
} = require("discord.js");

const path = require("path");
const { loadJSON, saveJSON, balancesFile } = require("../../utils/economy");
const { giveMinecraftCosmetic } = require("../../utils/minecraftShop");

const shopFile = path.join(__dirname, "../../data/minecraft/shop.json");
const repartitionFile = path.join(__dirname, "../../data/minecraft/repartition.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("boutique-minecraft")
    .setDescription("Acheter des cosmétiques Minecraft"),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    const balancesData = loadJSON(balancesFile);
    const shopData = loadJSON(shopFile)[guildId] || {};
    const repartitionData = loadJSON(repartitionFile)[guildId] || {};

    const userData = balancesData[guildId]?.[userId];
    if (!userData) {
      return interaction.reply({
        content: "❌ Tu n’as pas encore de compte dans l’économie.",
        ephemeral: true
      });
    }

    // Affichage de la boutique
    const embed = new EmbedBuilder()
      .setTitle("🛒 Boutique Minecraft")
      .setDescription(
        Object.entries(shopData)
          .map(([name, d]) => `**${name}** — ${d.price}€`)
          .join("\n") || "Aucun produit disponible."
      )
      .setColor("Green")
      .setFooter({ text: `Solde : ${userData.money}€` });

    const menu = new StringSelectMenuBuilder()
      .setCustomId("mc_shop_select")
      .setPlaceholder("Choisis un produit")
      .addOptions(Object.keys(shopData).map(p => ({ label: p, value: p })));

    await interaction.reply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true
    });

    // Collector pour le menu
    const collector = interaction.channel.createMessageComponentCollector({
      filter: i => i.user.id === userId,
      time: 60000
    });

    collector.on("collect", async i => {
      if (!i.isStringSelectMenu()) return;

      const productName = i.values[0];
      const product = shopData[productName];

      if (!product) {
        return i.reply({ content: "❌ Produit introuvable.", ephemeral: true });
      }

      // Modal pour pseudo Minecraft
      const modal = new ModalBuilder()
        .setCustomId(`mc-buy|${productName}`)
        .setTitle("Achat Boutique Minecraft");

      const pseudoInput = new TextInputBuilder()
        .setCustomId("mc_pseudo")
        .setLabel("Pseudo Minecraft")
        .setPlaceholder("Ex: Emilca1")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(pseudoInput));

      await i.showModal(modal);
    });

    // Collector global pour les modals
    interaction.client.on("interactionCreate", async modalInteraction => {
      if (!modalInteraction.isModalSubmit()) return;
      if (!modalInteraction.customId.startsWith("mc-buy|")) return;

      const productName = modalInteraction.customId.split("|")[1];
      const mcPseudo = modalInteraction.fields.getTextInputValue("mc_pseudo");

      const shop = loadJSON(shopFile)[modalInteraction.guild.id];
      const balances = loadJSON(balancesFile);

      const product = shop?.[productName];
      const userData = balances[modalInteraction.guild.id]?.[modalInteraction.user.id];

      if (!product || !userData) {
        return modalInteraction.reply({ content: "❌ Erreur interne.", ephemeral: true });
      }

      // Vérification solde
      if (userData.money < product.price) {
        return modalInteraction.reply({ content: "💸 Tu n’as pas assez d’argent.", ephemeral: true });
      }

      // Message préventif
      await modalInteraction.reply({
        content:
          `⚠️ **IMPORTANT**\n` +
          `• Tu dois être **connecté sur le serveur Minecraft**\n` +
          `• Le pseudo utilisé est : **${mcPseudo}**\n\n` +
          `⏳ Livraison en cours...`,
        ephemeral: true
      });

      try {
        // Retrait argent
        userData.money -= product.price;

        // Répartition
        const repartition = loadJSON(repartitionFile)[modalInteraction.guild.id] || {};
        for (const [id, percent] of Object.entries(repartition)) {
          const gain = Math.floor(product.price * (percent / 100));
          if (balances[modalInteraction.guild.id][id])
            balances[modalInteraction.guild.id][id].money += gain;
        }

        saveJSON(balancesFile, balances);

        // Give Minecraft
        await giveMinecraftCosmetic(mcPseudo, product.cosmetic);

        await modalInteraction.editReply({
          content: `✅ **${productName}** livré à **${mcPseudo}** !`
        });

      } catch (err) {
        console.error("❌ Achat Minecraft échoué :", err);

        // Rollback
        userData.money += product.price;
        saveJSON(balancesFile, balances);

        await modalInteraction.editReply({
          content: "❌ Erreur lors de la livraison. Aucun argent n’a été perdu."
        });
      }
    });
  }
};
