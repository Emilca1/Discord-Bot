const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./config.json");
const { initLogger } = require("./utils/logger");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});
// Collection des commandes
client.commands = new Collection();

// Handler des commandes
const commandsPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith(".js"));

  for (const file of commandFiles) {
    const command = require(path.join(folderPath, file));
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(`[AVERTISSEMENT] La commande ${file} est invalide.`);
    }
  }
}

// Handler des events
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js"));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
    console.log(`✅ Event ${file} chargé (once)`);
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
    console.log(`✅ Event ${file} chargé`);
  }
}

// Handler des boutons
client.buttons = [];

const buttonFiles = fs.readdirSync("./buttons").filter(f => f.endsWith(".js"));

for (const file of buttonFiles) {
  const button = require(`./buttons/${file}`);
  client.buttons.push(button);
}


// InteractionCreate pour les commandes
client.on("interactionCreate", async interaction => {

  // Slash commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(error);
      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ Une erreur est survenue.",
          ephemeral: true
        });
      }
    }
  }

  // Boutons
  if (interaction.isButton()) {
    const button = client.buttons.find(b =>
      b.customIds.includes(interaction.customId)
    );

    if (!button) return;

    try {
      await button.execute(interaction, client);
    } catch (error) {
      console.error(error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ Une erreur est survenue.",
          ephemeral: true
        });
      }
    }
  }
});

initLogger(client);

client.login(config.token);
