const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./config.json");

const commands = [];
const commandsPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith(".js"));

  for (const file of commandFiles) {
    const command = require(path.join(folderPath, file));
    if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON());
    } else {
      console.log(`[AVERTISSEMENT] La commande ${file} est invalide.`);
    }
  }
}

const rest = new REST({ version: "10" }).setToken(config.token);

(async () => {
  try {
    console.log(`🔄 Déploiement GLOBAL de ${commands.length} commandes...`);

    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands }
    );

    console.log("✅ Les commandes globales ont été enregistrées avec succès !");
    console.log("⚠️ Attention : les commandes globales peuvent mettre jusqu’à 1h à apparaître !");
  } catch (error) {
    console.error(error);
  }
})();
