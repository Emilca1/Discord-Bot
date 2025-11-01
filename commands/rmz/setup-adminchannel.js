const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

const configFile = path.join(__dirname, "../../data/adminConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-channeladmin")
    .setDescription("Définit le salon d'administration (logs des actions).")
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Salon où seront envoyés les logs d'administration")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const channel = interaction.options.getChannel("channel");
    const guildId = interaction.guild.id;

    let data = {};
    if (fs.existsSync(configFile)) data = JSON.parse(fs.readFileSync(configFile, "utf8"));
    if (!data[guildId]) data[guildId] = { adminChannel: null, adminRoles: [] };

    data[guildId].adminChannel = channel.id;
    fs.writeFileSync(configFile, JSON.stringify(data, null, 2));

    await interaction.reply(`✅ Le salon d'administration a été défini sur ${channel}.`);
  }
};
