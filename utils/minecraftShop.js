const axios = require("axios");
const config = require("../config.json");

/**
 * Give un cosmétique Minecraft à un joueur via Pterodactyl
 * @param {string} mcUsername - Pseudo Minecraft
 * @param {string} cosmetic - custom_model_data string
 */
async function giveMinecraftCosmetic(mcUsername, cosmetic) {
  const command =
    `minecraft:give ${mcUsername} minecraft:netherite_helmet` +
    `[minecraft:custom_model_data={strings:['${cosmetic}']},` +
    `minecraft:equippable={"equip_sound":"minecraft:item.armor.equip_netherite","slot":"head"}]`;

  await axios.post(
    `${config.pterodactyl.panelUrl}/api/client/servers/${config.pterodactyl.serverId}/command`,
    { command },
    {
      headers: {
        Authorization: `Bearer ${config.pterodactyl.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );
}

module.exports = {
  giveMinecraftCosmetic,
};
