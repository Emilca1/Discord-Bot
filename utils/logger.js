const { EmbedBuilder, TextChannel } = require("discord.js");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const configFile = path.join(__dirname, "../data/economy/configLogEconomy.json");
const logFile = path.join(__dirname, "../data/economy/logs.jsonl");

let clientInstance = null;
let appInstance = null;

// === INITIALISATION DU LOGGER ===
function initLogger(client) {
  clientInstance = client;

  // Lancement du serveur API une seule fois
  startApiServer();

  // Surcharge console.log
  const originalLog = console.log;
  console.log = async (...args) => {
    const msg = args.join(" ");
    originalLog(msg);
    saveLogToFile(msg);
    await sendToAdminChannel(msg);
  };

  // Surcharge console.error
  const originalError = console.error;
  console.error = async (...args) => {
    const msg = args.join(" ");
    originalError(msg);
    saveLogToFile(msg);
    await sendToAdminChannel("❌ " + msg);
  };
}

// === SAUVEGARDE DANS UN FICHIER JSONL avec parsing event ===
function saveLogToFile(message) {
  try {
    // Déterminer l'event
    let event = "none";
    if (/a gagné \d+€ avec son daily/.test(message)) event = "daily";
    else if (/a gagné \d+€ pour son message/.test(message)) event = "mess";
    else if (/a gagné \d+€ en vocal/.test(message)) event = "voc";
    else if (/(?:a gagné|a perdu) \d+€ au flipcoin/.test(message)) event = "flip";

    // Extraire le gain si présent
    const gainMatch = message.match(/(\d+)€/);
    const gain = gainMatch ? parseInt(gainMatch[1], 10) : 0;

    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      message,
      gain,
    };

    fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n", "utf8");
  } catch (err) {
    console.warn("Erreur lors de la sauvegarde du log :", err);
  }
}

// === SERVEUR API POUR L’EXPOSITION DES LOGS ===
function startApiServer() {
  if (appInstance) return;

  const app = express();
  const port = process.env.SERVER_PORT || process.env.LOG_API_PORT || 22228;

  app.use(cors({ origin: "*", methods: ["GET"] }));

  // Endpoint GET /logs
  app.get("/logs", (req, res) => {
    try {
      if (!fs.existsSync(logFile)) {
        return res.status(404).json({ error: "Fichier de logs introuvable." });
      }

      const allLines = fs.readFileSync(logFile, "utf8").trim().split("\n").filter(Boolean);
      const logs = allLines.map(line => {
        try { return JSON.parse(line); }
        catch { return { timestamp: new Date().toISOString(), event: "parse_error", message: line }; }
      });

      const event = req.query.event;
      let filteredLogs = event ? logs.filter(l => l.event === event) : logs;
      const limit = req.query.all === "true" ? filteredLogs.length : Math.min(parseInt(req.query.limit || "500", 10), filteredLogs.length);
      filteredLogs = filteredLogs.slice(-limit);

      res.json({
        total: logs.length,
        returned: filteredLogs.length,
        logs: filteredLogs,
      });
    } catch (err) {
      res.status(500).json({ error: "Erreur lecture logs", details: err.message });
    }
  });

  // Endpoint GET /logs/grafana
  app.get("/logs/grafana", (req, res) => {
    try {
      if (!fs.existsSync(logFile)) return res.status(404).json([]);

      const allLines = fs.readFileSync(logFile, "utf8").trim().split("\n").filter(Boolean);
      const logs = allLines.map(line => {
        try { 
          const log = JSON.parse(line);

          // Extraire le gain si présent
          const match = log.message.match(/(\d+)€/);
          const gain = match ? parseInt(match[1], 10) : 0;

          return { ...log, gain };
        }
        catch { 
          return { timestamp: new Date().toISOString(), event: "parse_error", message: line, gain: 0 }; 
        }
      });

      const limit = req.query.all === "true" ? logs.length : Math.min(parseInt(req.query.limit || "500", 10), logs.length);
      const filteredLogs = logs.slice(-limit);

      res.json(filteredLogs);
    } catch (err) {
      res.status(500).json([]);
    }
  });

  // Endpoint GET /logs/download
  app.get("/logs/download", (req, res) => {
    if (!fs.existsSync(logFile)) return res.status(404).send("Fichier introuvable");
    res.setHeader("Content-Disposition", "attachment; filename=logs.jsonl");
    res.setHeader("Content-Type", "application/json");
    fs.createReadStream(logFile).pipe(res);
  });

  // === Endpoint GET /inventaires ===
  app.get("/inventaires", (req, res) => {
    try {
      const balancesFile = path.join(__dirname, "../data/economy/balances.json");

      if (!fs.existsSync(balancesFile)) {
        return res.status(404).json({ error: "Fichier balances.json introuvable." });
      }

      const data = JSON.parse(fs.readFileSync(balancesFile, "utf8"));

      // Support pour un éventuel paramètre guildId ou userId
      const guildId = req.query.guildId;
      const userId = req.query.userId;

      let result = data;

      if (guildId) {
        if (!data[guildId]) {
          return res.status(404).json({ error: `Guild ${guildId} non trouvée.` });
        }
        result = data[guildId];
      }

      if (userId && result[userId]) {
        result = { [userId]: result[userId] };
      } else if (userId) {
        return res.status(404).json({ error: `Utilisateur ${userId} non trouvé.` });
      }

      // Format Grafana : tableau à plat
      if (req.query.format === "grafana") {
        const grafanaData = [];

        for (const [guildId, users] of Object.entries(data)) {
          for (const [userId, entry] of Object.entries(users)) {
            const totalItems = Object.values(entry.items || {}).reduce((a, b) => a + b, 0);
            grafanaData.push({
              guildId,
              userId,
              money: entry.money || 0,
              totalItems,
              items: entry.items || {},
              lastDaily: entry.lastDaily || null,
            });
          }
        }

        return res.json(grafanaData);
      }

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Erreur lecture inventaires", details: err.message });
    }
  });

  app.listen(port, "0.0.0.0", () => console.log(`[Logger] API disponible sur http://0.0.0.0:${port}/logs`));

  appInstance = app;
}

// === ENVOI DANS LE SALON ADMIN ===
async function sendToAdminChannel(message) {
  if (!clientInstance || !fs.existsSync(configFile)) return;

  try {
    const data = JSON.parse(fs.readFileSync(configFile, "utf8"));
    for (const [guildId, cfg] of Object.entries(data)) {
      if (!cfg.adminChannel) continue;

      const channel = await clientInstance.channels.fetch(cfg.adminChannel).catch(() => null);
      if (!channel || !(channel instanceof TextChannel)) continue;

      const embed = new EmbedBuilder()
        .setDescription(message)
        .setColor(0x00bfff)
        .setTimestamp();

      await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
    }
  } catch (err) {
    saveLogToFile(`Erreur logger: ${err.message}`);
  }
}

module.exports = { initLogger };
