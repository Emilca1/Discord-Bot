const axios = require("axios");
const config = require("../config.json");

/**
 * Donne un cosmétique Minecraft à un joueur via Pterodactyl
 * @param {Object} options
 * @param {string} options.mcUsername - Pseudo Minecraft
 * @param {string} options.cosmetic - custom_model_data string
 * @param {boolean} [options.equipable] - Si l'objet est équipable sur la tête
 * @param {string} [options.objetMinecraft] - Nom de l'objet Minecraft (ex: netherite_helmet, netherite_sword)
 */
async function giveMinecraftCosmetic({
  mcUsername,
  cosmetic,
  equipable = false,
  objetMinecraft = "netherite_helmet"
}) {
  let command = `minecraft:give ${mcUsername} minecraft:${objetMinecraft}` +
    `[minecraft:custom_model_data={strings:['${cosmetic}']}`;
  if (equipable) {
    command += `,minecraft:equippable={"equip_sound":"minecraft:item.armor.equip_netherite","slot":"head"}`;
  }
  command += "]";

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