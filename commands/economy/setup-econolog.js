const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

const configLogEconomy = path.join(__dirname, "../../data/economy/configLogEconomy.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-econolog")
    .setDescription("Définit le salon des logs pour le système d'économie.")
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Salon où seront envoyés les logs d'économie")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const channel = interaction.options.getChannel("channel");
    const guildId = interaction.guild.id;

    let data = {};
    if (fs.existsSync(configLogEconomy)) data = JSON.parse(fs.readFileSync(configLogEconomy, "utf8"));
    if (!data[guildId]) data[guildId] = { adminChannel: null, adminRoles: [] };

    data[guildId].adminChannel = channel.id;
    fs.writeFileSync(configLogEconomy, JSON.stringify(data, null, 2));

    await interaction.reply(`✅ Le salon de logs de l'économie a été défini sur ${channel}.`);
  }
};
