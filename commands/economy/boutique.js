const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
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
    .setName("boutique")
    .setDescription("Voir, acheter ou vendre des produits."),

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

    const shopData = loadJSON(shopFile);
    const shopGuild = shopData[guildId] || {};
    const balancesData = loadJSON(balancesFile);

    if (!balancesData[guildId] || !balancesData[guildId][userId]) {
      return interaction.reply({
        content: "💼 Tu n’as pas encore d’argent !",
        flags: MessageFlags.Ephemeral,
      });
    }

    const userData = balancesData[guildId][userId];
    const entries = Object.entries(shopGuild).sort((a, b) => a[1] - b[1]);

    if (entries.length === 0) {
      return interaction.reply({
        content: "🛒 La boutique est vide.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const ITEMS_PER_PAGE = 4;
    const totalPages = Math.ceil(entries.length / ITEMS_PER_PAGE);
    let currentPage = 0;

    const getEmbed = (page) => {
      const start = page * ITEMS_PER_PAGE;
      const slice = entries.slice(start, start + ITEMS_PER_PAGE);

      const desc =
        slice
          .map(([name, price], idx) => {
            const qty = userData.items?.[name] || 0;
            return `**${start + idx + 1}. ${name}** — 💰 **${price}€** | 📦 ${qty}`;
          })
          .join("\n") || "🛒 Aucun article à afficher sur cette page.";

      return new EmbedBuilder()
        .setTitle("🏪 Boutique")
        .setDescription(desc)
        .setColor("Green")
        .setFooter({
          text: `Page ${page + 1} / ${totalPages} • Solde : ${userData.money}€`,
        });
    };

    const getComponents = (page) => {
      const start = page * ITEMS_PER_PAGE;
      const slice = entries.slice(start, start + ITEMS_PER_PAGE);
      const rows = [];

      slice.forEach(([name]) => {
        const select = new StringSelectMenuBuilder()
          .setCustomId(`menu|${name}`) // 🔸 Séparateur unique
          .setPlaceholder(`🛒 ${name}`)
          .addOptions([
            { label: "Acheter", value: `buy|${name}`, emoji: "🛒" },
            { label: "Vendre", value: `sell|${name}`, emoji: "💰" },
          ]);
        rows.push(new ActionRowBuilder().addComponents(select));
      });

      const navRow = new ActionRowBuilder();
      if (page > 0)
        navRow.addComponents(
          new ButtonBuilder()
            .setCustomId("prev_page")
            .setLabel("⬅️ Précédent")
            .setStyle(ButtonStyle.Secondary)
        );
      if (page < totalPages - 1)
        navRow.addComponents(
          new ButtonBuilder()
            .setCustomId("next_page")
            .setLabel("➡️ Suivant")
            .setStyle(ButtonStyle.Secondary)
        );
      if (navRow.components.length > 0) rows.push(navRow);

      return rows;
    };

    const message = await interaction.reply({
      embeds: [getEmbed(currentPage)],
      components: getComponents(currentPage),
      fetchReply: true,
      flags: MessageFlags.Ephemeral,
    });

    const collector = message.channel.createMessageComponentCollector({
      filter: (i) => i.user.id === userId,
      time: 120000,
    });

    collector.on("collect", async (i) => {
      try {
        // Pagination
        if (i.isButton()) {
          if (i.customId === "next_page" || i.customId === "prev_page") {
            currentPage += i.customId === "next_page" ? 1 : -1;
            await i.update({
              embeds: [getEmbed(currentPage)],
              components: getComponents(currentPage),
            }).catch(() => {});
          }
          return;
        }

        // === Étape 1 : Action acheter/vendre ===
        if (i.isStringSelectMenu() && i.values[0].includes("|")) {
          const [action, product] = i.values[0].split("|");
          const price = shopGuild[product];

          if (price === undefined) {
            return await i.reply({
              content: "❌ Produit introuvable ou prix invalide.",
              flags: MessageFlags.Ephemeral,
            }).catch(() => {});
          }

          // === Étape 2 : Menu quantité ===
          const quantityMenu = new StringSelectMenuBuilder()
            .setCustomId(`quantity|${action}|${product}`)
            .setPlaceholder("📦 Sélectionne une quantité")
            .addOptions([
              { label: "1", value: "1" },
              { label: "5", value: "5" },
              { label: "10", value: "10" },
              { label: "20", value: "20" },
              { label: "Max", value: "max" },
            ]);

          await i.reply({
            content: `Combien veux-tu ${action === "buy" ? "acheter" : "vendre"} de **${product}** ?`,
            components: [new ActionRowBuilder().addComponents(quantityMenu)],
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        // === Étape 3 : Validation quantité ===
        if (i.customId.startsWith("quantity|")) {
          const [, action, product] = i.customId.split("|");
          const price = shopGuild[product];
          const val = i.values[0];
          let qty = val === "max" ? 0 : parseInt(val);

          if (price === undefined) {
            return await i.reply({
              content: "❌ Produit introuvable ou prix invalide.",
              flags: MessageFlags.Ephemeral,
            });
          }

          if (action === "buy") {
            if (val === "max") qty = Math.floor(userData.money / price);
            if (qty <= 0)
              return await i.reply({
                content: "❌ Quantité invalide.",
                flags: MessageFlags.Ephemeral,
              });

            const totalCost = price * qty;
            if (userData.money < totalCost)
              return await i.reply({
                content: "💸 Pas assez d’argent pour cet achat.",
                flags: MessageFlags.Ephemeral,
              });

            userData.money -= totalCost;
            userData.items[product] = (userData.items[product] || 0) + qty;
            saveJSON(balancesFile, balancesData);

            await i.update({
              content: `✅ Achat de **${qty}x ${product}** pour **${totalCost}€** réussi !`,
              components: [],
            });
          }

          if (action === "sell") {
            const owned = userData.items[product] || 0;
            if (val === "max") qty = owned;
            if (qty <= 0 || owned < qty)
              return await i.reply({
                content: `❌ Tu ne possèdes pas assez de **${product}**.`,
                flags: MessageFlags.Ephemeral,
              });

            const totalGain = price * qty;
            userData.items[product] -= qty;
            userData.money += totalGain;
            saveJSON(balancesFile, balancesData);

            await i.update({
              content: `💰 Tu as vendu **${qty}x ${product}** pour **${totalGain}€** !`,
              components: [],
            });
          }

          // Mise à jour de la boutique
          await interaction.editReply({
            embeds: [getEmbed(currentPage)],
            components: getComponents(currentPage),
          }).catch(() => {});
        }
      } catch (err) {
        console.error("❌ Erreur collector boutique :", err);
      }
    });

    collector.on("end", async () => {
      try {
        await interaction.editReply({
          content: "⌛ La boutique a expiré.",
          components: [],
        }).catch(() => {});
      } catch {}
    });
  },
};
