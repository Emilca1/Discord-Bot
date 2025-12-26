const axios = require("axios");
const config = require("../config.json");

module.exports = async function getServerStatus() {
  const res = await axios.get(
    `${config.pterodactyl.panelUrl}/api/client/servers/${config.pterodactyl.serverId}/resources`,
    {
      headers: {
        Authorization: `Bearer ${config.pterodactyl.apiKey}`,
        Accept: "application/json"
      }
    }
  );

  return res.data.attributes.current_state;
};
