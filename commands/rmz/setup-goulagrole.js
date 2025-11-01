const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

const configFile = path.join(__dirname, "../../data/adminConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-goulagrole")
    .setDescription("Définit le rôle du goulag pour ce serveur.")
    .addRoleOption(option =>
      option
        .setName("role")
        .setDescription("Le rôle à utiliser comme goulag.")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const role = interaction.options.getRole("role");

    // Load config file
    let data = {};
    if (fs.existsSync(configFile)) {
      data = JSON.parse(fs.readFileSync(configFile, "utf8"));
    }
    if (!data[guildId]) {
      data[guildId] = { adminChannel: null, adminRoles: [], goulagRole: null };
    }

    data[guildId].goulagRole = role.id;
    fs.writeFileSync(configFile, JSON.stringify(data, null, 2));

    await interaction.reply(`✅ Le rôle du goulag a été défini sur ${role}.`);
  }
};
