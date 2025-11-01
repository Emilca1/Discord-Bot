const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Affiche la liste des commandes disponibles"),

  async execute(interaction) {
    const commands = interaction.client.commands; // Collection des commandes
    if (!commands || commands.size === 0) {
      return interaction.reply("❌ Aucune commande n'est disponible.");
    }

    // Créer l'embed
    const helpEmbed = new EmbedBuilder()
      .setTitle("📜 Liste des commandes")
      .setColor("Blue")
      .setDescription("Voici toutes les commandes disponibles :");

    // Ajouter chaque commande
    commands.forEach(cmd => {
      const name = cmd.data.name;
      const desc = cmd.data.description || "Pas de description";
      helpEmbed.addFields({ name: `/${name}`, value: desc, inline: false });
    });

    await interaction.reply({ embeds: [helpEmbed] });
  }
};
