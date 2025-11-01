const {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder
} = require("discord.js");

const {
  loadJSON,
  saveJSON,
  isEconoAdmin,
  balancesFile,
  shopFile,
  ensureUserData
} = require("../../utils/economy");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("edit-inventaire")
    .setDescription("Modifier l’argent ou les objets d’un joueur.")
    .addStringOption(o =>
      o.setName("type")
        .setDescription("argent ou objet")
        .setRequired(true)
        .addChoices(
          { name: "argent", value: "money" },
          { name: "objet", value: "item" }
        )
    )
    .addStringOption(o =>
      o.setName("action")
        .setDescription("ajouter ou supprimer")
        .setRequired(true)
        .addChoices(
          { name: "ajouter", value: "ajouter" },
          { name: "supprimer", value: "supprimer" }
        )
    )
    .addIntegerOption(o =>
      o.setName("quantité")
        .setDescription("Somme ou quantité")
        .setRequired(true)
    )
    .addUserOption(o =>
      o.setName("joueur")
        .setDescription("Utilisateur cible")
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName("objet")
        .setDescription("Objet à modifier (si type = objet)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const targetUser = interaction.options.getUser("joueur");
    const type = interaction.options.getString("type");
    const action = interaction.options.getString("action");
    const quantity = interaction.options.getInteger("quantité");
    let itemName = interaction.options.getString("objet");

    // Vérification éconoadmin
    if (!isEconoAdmin(guildId, interaction.user.id)) {
      return interaction.reply({ content: "🚫 Vous n’êtes pas éconoadmin.", ephemeral: true });
    }

    if (quantity <= 0) {
      return interaction.reply({ content: "❌ La quantité doit être supérieure à 0.", ephemeral: true });
    }

    // Charger balances
    const balances = loadJSON(balancesFile);
    ensureUserData(balances, guildId, targetUser.id);
    const userData = balances[guildId][targetUser.id];

    // Gestion argent
    if (type === "money") {
      const oldMoney = userData.money;
      userData.money += action === "ajouter" ? quantity : -quantity;
      if (userData.money < 0) userData.money = 0;

      saveJSON(balancesFile, balances);
      console.log(`💰 ${interaction.user.tag} a ${action} ${quantity}€ à ${targetUser.tag} (avant: ${oldMoney}€, après: ${userData.money}€)`);

      return interaction.reply({ content: `✅ ${targetUser} a maintenant **${userData.money}€**.` });
    }

    // Gestion objets
    const shopData = loadJSON(shopFile);
    const serverItems = shopData[guildId] || {};

    if (Object.keys(serverItems).length === 0) {
      return interaction.reply({ content: "❌ Aucun objet n'est configuré pour ce serveur.", ephemeral: true });
    }

    // Si aucun objet choisi, proposer le menu déroulant
    if (!itemName) {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`edit-item-${interaction.id}`)
        .setPlaceholder("Choisis un objet")
        .addOptions(Object.keys(serverItems).map(name => ({
          label: name,
          value: name
        })));

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await interaction.reply({
        content: "🛍️ Sélectionne un objet à modifier :",
        components: [row],
        ephemeral: true
      });

      const filter = i =>
        i.customId === `edit-item-${interaction.id}` &&
        i.user.id === interaction.user.id;

      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 60000,
        max: 1
      });

      collector.on("collect", async i => {
        if (!i.values || i.values.length === 0) {
          return i.reply({ content: "❌ Sélection invalide.", ephemeral: true });
        }
        itemName = i.values[0];
        await handleItemUpdate(i);
      });

      collector.on("end", collected => {
        if (collected.size === 0) {
          interaction.editReply({
            content: "⌛ Temps écoulé, action annulée.",
            components: []
          }).catch(() => {});
        }
      });

      return;
    }

    // Si l'objet est déjà choisi via l'option
    await handleItemUpdate(interaction);

    async function handleItemUpdate(i) {
      if (!userData.items) userData.items = {};
      const currentQty = userData.items[itemName] || 0;

      const sendResponse = async (content) => {
        try {
          if (i.isMessageComponent?.()) {
            // ⚠️ Jamais d'ephemeral ici !
            await i.update({ content, components: [] });
          } else if (i.deferred || i.replied) {
            await i.followUp({ content, ephemeral: true });
          } else {
            await i.reply({ content, ephemeral: true });
          }
        } catch (err) {
          console.error("❌ Erreur lors de la réponse :", err);
        }
      };

      if (action === "supprimer") {
        if (!userData.items[itemName]) {
          return sendResponse(`❌ ${targetUser.username} n’a pas l’objet **${itemName}**.`);
        }
        if (currentQty < quantity) {
          return sendResponse(`❌ ${targetUser.username} n’a que ${currentQty} de **${itemName}**, impossible d’en retirer ${quantity}.`);
        }
        userData.items[itemName] -= quantity;
        if (userData.items[itemName] <= 0) delete userData.items[itemName];
      } else {
        userData.items[itemName] = currentQty + quantity;
      }

      saveJSON(balancesFile, balances);

      console.log(`🛠️ ${interaction.user.tag} a ${action} ${quantity}x **${itemName}** à ${targetUser.tag} (avant: ${currentQty}, après: ${userData.items[itemName] || 0})`);

      return sendResponse(`✅ ${targetUser} a bien été mis à jour pour l’objet **${itemName}**.`);
    }
  }
};
