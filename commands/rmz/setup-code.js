const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require("discord.js");
const fs = require("fs");
const path = require("path");

const codesPath = path.join(__dirname, "../../data/codes.json");

if (!fs.existsSync(codesPath)) {
  fs.mkdirSync(path.join(__dirname, "../../data"), { recursive: true });
  fs.writeFileSync(codesPath, JSON.stringify({}));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-code")
    .setDescription("Configure un code secret lié à un rôle et à un salon spécifique.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option
        .setName("code")
        .setDescription("Le code secret que les joueurs devront entrer.")
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName("rôle")
        .setDescription("Le rôle à attribuer si le code est correct.")
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Le salon où le code sera actif.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async execute(interaction) {
    const code = interaction.options.getString("code");
    const role = interaction.options.getRole("rôle");
    const channel = interaction.options.getChannel("channel");
    let codes = {};
    try {
      const content = fs.readFileSync(codesPath, "utf8");
      codes = content ? JSON.parse(content) : {};
    } catch (err) {
      console.warn("⚠️ Fichier codes.json vide ou invalide. Réinitialisation...");
      codes = {};
    }

    if (codes[channel.id]) {
      return interaction.reply({
        content: `⚠️ Un code est déjà configuré pour le salon <#${channel.id}>.`,
        flags: MessageFlags.Ephemeral
      });
    }

    codes[channel.id] = {
      code,
      roleId: role.id
    };

    fs.writeFileSync(codesPath, JSON.stringify(codes, null, 2));

    await interaction.reply({
      content: `✅ Code **${code}** enregistré pour le salon <#${channel.id}>, lié au rôle **${role.name}**.`,
      flags: MessageFlags.Ephemeral
    });
  }
};
