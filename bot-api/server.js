const express = require('express');
const SftpClient = require('ssh2-sftp-client');
const initSqlJs = require('sql.js');
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const config = require('./config.json');

// Override config with env vars
if (process.env.DEIMOS_SFTP_USER) config.deimos.sftp.username = process.env.DEIMOS_SFTP_USER;
if (process.env.DEIMOS_SFTP_PASS) config.deimos.sftp.password = process.env.DEIMOS_SFTP_PASS;
if (process.env.DEIMOS_SFTP_HOST) config.deimos.sftp.host = process.env.DEIMOS_SFTP_HOST;
if (process.env.DEIMOS_BOT_TOKEN) config.deimos.botToken = process.env.DEIMOS_BOT_TOKEN;
if (process.env.OPP_SFTP_USER) config.oppTracker.sftp.username = process.env.OPP_SFTP_USER;
if (process.env.OPP_SFTP_PASS) config.oppTracker.sftp.password = process.env.OPP_SFTP_PASS;
if (process.env.OPP_SFTP_HOST) config.oppTracker.sftp.host = process.env.OPP_SFTP_HOST;
if (process.env.OPP_BOT_TOKEN) config.oppTracker.botToken = process.env.OPP_BOT_TOKEN;
if (process.env.PORT) config.server.port = Number(process.env.PORT);
if (process.env.AUTH_PASSWORD) config.server.authPassword = process.env.AUTH_PASSWORD;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-portal-auth');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const CACHE_DIR = path.join(__dirname, 'cache');
let SQL;
initSqlJs().then(sql => { SQL = sql; console.log('[INIT] sql.js loaded'); });

const PORT = config.server.port || 3001;

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// ══════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE
// ══════════════════════════════════════════════════════════════
function requireAuth(req, res, next) {
  const auth = req.headers['x-portal-auth'];
  if (auth !== config.server.authPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ══════════════════════════════════════════════════════════════
// SFTP HELPERS
// ══════════════════════════════════════════════════════════════
async function sftpDownload(serverConfig, remotePath) {
  const sftp = new SftpClient('download-' + Date.now());
  try {
    await sftp.connect(serverConfig);
    const data = await sftp.get(remotePath);
    await sftp.end();
    return typeof data === 'string' ? data : data.toString('utf-8');
  } catch (e) {
    console.error(`SFTP download failed (${remotePath}):`, e.message);
    try { await sftp.end(); } catch {}
    return null;
  }
}

async function sftpDownloadBuffer(serverConfig, remotePath) {
  const sftp = new SftpClient('download-buf-' + Date.now());
  try {
    await sftp.connect(serverConfig);
    const chunks = [];
    const stream = await sftp.createReadStream(remotePath);
    await new Promise((resolve, reject) => {
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    await sftp.end();
    return Buffer.concat(chunks);
  } catch (e) {
    console.error(`SFTP buffer download failed (${remotePath}):`, e.message);
    try { await sftp.end(); } catch {}
    return null;
  }
}

function saveCache(name, data) {
  const fp = path.join(CACHE_DIR, name);
  fs.writeFileSync(fp, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
}

function loadCache(name) {
  const fp = path.join(CACHE_DIR, name);
  if (!fs.existsSync(fp)) return null;
  return fs.readFileSync(fp, 'utf-8');
}

function getCacheAge(name) {
  const fp = path.join(CACHE_DIR, name);
  if (!fs.existsSync(fp)) return Infinity;
  return Date.now() - fs.statSync(fp).mtimeMs;
}

// ══════════════════════════════════════════════════════════════
// DEIMOS DATA SYNC (every 60s)
// ══════════════════════════════════════════════════════════════
async function syncDeimosData() {
  console.log('[SYNC] Deimos data sync starting...');
  const sftpCfg = config.deimos.sftp;

  try {
    const dbData = await sftpDownloadBuffer(sftpCfg, config.deimos.files.database);
    if (dbData && SQL) {
      const db = new SQL.Database(Buffer.from(dbData));

      const membersRes = db.exec('SELECT * FROM members');
      const members = membersRes.length ? membersRes[0].values.map(row => {
        const obj = {};
        membersRes[0].columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
      }) : [];

      const loaRes = db.exec('SELECT * FROM loa_records WHERE is_active = 1');
      const loaRecords = loaRes.length ? loaRes[0].values.map(row => {
        const obj = {};
        loaRes[0].columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
      }) : [];

      const contribRes = db.exec('SELECT * FROM contributions ORDER BY created_at DESC LIMIT 500');
      const contributions = contribRes.length ? contribRes[0].values.map(row => {
        const obj = {};
        contribRes[0].columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
      }) : [];

      let serverConfigs = [];
      try {
        const cfgRes = db.exec('SELECT * FROM server_configs');
        if (cfgRes.length) {
          serverConfigs = cfgRes[0].values.map(row => {
            const obj = {};
            cfgRes[0].columns.forEach((col, i) => obj[col] = row[i]);
            return obj;
          });
        }
      } catch {}

      saveCache('deimos_members.json', members);
      saveCache('deimos_loa.json', loaRecords);
      saveCache('deimos_contributions.json', contributions);
      saveCache('deimos_config.json', serverConfigs);

      db.close();
      console.log(`[SYNC] Deimos: ${members.length} members, ${loaRecords.length} active LOAs`);
    }
  } catch (e) {
    console.error('[SYNC] Deimos DB error:', e.message);
  }

  try {
    const ptData = await sftpDownloadBuffer(sftpCfg, config.deimos.files.playtime_db);
    if (ptData && SQL) {
      const db = new SQL.Database(Buffer.from(ptData));

      let activeSessions = [];
      try {
        const sessRes = db.exec('SELECT * FROM active_sessions');
        if (sessRes.length) {
          activeSessions = sessRes[0].values.map(row => {
            const obj = {};
            sessRes[0].columns.forEach((col, i) => obj[col] = row[i]);
            return obj;
          });
        }
      } catch {}

      let monthlyStats = [];
      try {
        const msRes = db.exec('SELECT * FROM monthly_stats ORDER BY total_seconds DESC LIMIT 100');
        if (msRes.length) {
          monthlyStats = msRes[0].values.map(row => {
            const obj = {};
            msRes[0].columns.forEach((col, i) => obj[col] = row[i]);
            return obj;
          });
        }
      } catch {}

      saveCache('deimos_active_sessions.json', activeSessions);
      saveCache('deimos_monthly_stats.json', monthlyStats);

      db.close();
      console.log(`[SYNC] Deimos playtime: ${activeSessions.length} active, ${monthlyStats.length} monthly records`);
    }
  } catch (e) {
    console.error('[SYNC] Deimos playtime error:', e.message);
  }

  try {
    const logData = await sftpDownload(sftpCfg, config.deimos.files.log);
    if (logData) {
      const lines = logData.split('\n').filter(l => l.trim());
      const lastLines = lines.slice(-200);
      saveCache('deimos_log.json', lastLines);
      console.log(`[SYNC] Deimos log: ${lastLines.length} lines cached`);
    }
  } catch (e) {
    console.error('[SYNC] Deimos log error:', e.message);
  }

  console.log('[SYNC] Deimos sync complete');
}

// ══════════════════════════════════════════════════════════════
// OPP TRACKER DATA SYNC (every 60s)
// ══════════════════════════════════════════════════════════════
async function syncOppData() {
  console.log('[SYNC] OPP TRACKER data sync starting...');
  const sftpCfg = config.oppTracker.sftp;

  try {
    const trackingRaw = await sftpDownload(sftpCfg, config.oppTracker.files.trackingData);
    if (trackingRaw) {
      saveCache('opp_tracking.json', trackingRaw);
      const data = JSON.parse(trackingRaw);
      console.log(`[SYNC] OPP: ${Object.keys(data).length} tracked players`);
    }
  } catch (e) {
    console.error('[SYNC] OPP tracking error:', e.message);
  }

  try {
    const dbRaw = await sftpDownload(sftpCfg, config.oppTracker.files.playerDatabase);
    if (dbRaw) {
      saveCache('opp_player_database.json', dbRaw);
      const data = JSON.parse(dbRaw);
      const servers = {};
      for (const [name, record] of Object.entries(data)) {
        const srvs = record.servers || (record.server ? [record.server] : ['Unknown']);
        srvs.forEach(s => {
          servers[s] = (servers[s] || 0) + 1;
        });
      }
      console.log(`[SYNC] OPP database: ${Object.keys(data).length} players across servers:`, servers);
    }
  } catch (e) {
    console.error('[SYNC] OPP database error:', e.message);
  }

  try {
    const trackedRaw = await sftpDownload(sftpCfg, config.oppTracker.files.trackedPlayers);
    if (trackedRaw) {
      saveCache('opp_tracked_players.json', trackedRaw);
    }
  } catch (e) {
    console.error('[SYNC] OPP tracked players error:', e.message);
  }

  try {
    const privRaw = await sftpDownload(sftpCfg, config.oppTracker.files.privateTracked);
    if (privRaw) {
      saveCache('opp_private_tracked.json', privRaw);
    }
  } catch (e) {
    console.error('[SYNC] OPP private tracked error:', e.message);
  }

  console.log('[SYNC] OPP sync complete');
}

// ══════════════════════════════════════════════════════════════
// FIVEM LIVE PLAYER LIST
// ══════════════════════════════════════════════════════════════
let fivemCache = { players: [], lastUpdate: 0 };

async function fetchFiveMPlayers() {
  try {
    const resp = await axios.get(config.oppTracker.fivemApiUrl, { timeout: 10000 });
    const data = resp.data;
    const players = (data.players || []).map(p => ({
      id: p.id,
      name: p.name,
      ping: p.ping,
      endpoint: p.endpoint,
      identifier: p.identifier || '',
      steamHex: p.identifiers ? p.identifiers.find(i => i.startsWith('steam:')) || '' : '',
      license: p.identifiers ? p.identifiers.find(i => i.startsWith('license:')) || '' : ''
    }));
    fivemCache = {
      players,
      lastUpdate: Date.now(),
      serverName: data.vars ? data.vars.sv_hostname : 'Vital RP',
      maxPlayers: data.vars ? data.vars.sv_maxClients : 0,
      onlineCount: players.length,
      uptime: data.connectTime || ''
    };
    saveCache('fivem_live.json', fivemCache);
    console.log(`[FIVEM] ${players.length} players online on Vital RP`);
  } catch (e) {
    console.error('[FIVEM] Fetch error:', e.message);
  }
}

// ══════════════════════════════════════════════════════════════
// API ROUTES
// ══════════════════════════════════════════════════════════════

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    caches: {
      deimos_members: getCacheAge('deimos_members.json'),
      deimos_log: getCacheAge('deimos_log.json'),
      opp_tracking: getCacheAge('opp_tracking.json'),
      fivem_live: getCacheAge('fivem_live.json')
    }
  });
});

// ── DEIMOS ENDPOINTS ──

app.get('/api/deimos/members', requireAuth, (req, res) => {
  const data = loadCache('deimos_members.json');
  res.json(data ? JSON.parse(data) : []);
});

app.get('/api/deimos/loa', requireAuth, (req, res) => {
  const data = loadCache('deimos_loa.json');
  res.json(data ? JSON.parse(data) : []);
});

app.get('/api/deimos/contributions', requireAuth, (req, res) => {
  const data = loadCache('deimos_contributions.json');
  res.json(data ? JSON.parse(data) : []);
});

app.get('/api/deimos/playtime/active', requireAuth, (req, res) => {
  const data = loadCache('deimos_active_sessions.json');
  res.json(data ? JSON.parse(data) : []);
});

app.get('/api/deimos/playtime/monthly', requireAuth, (req, res) => {
  const data = loadCache('deimos_monthly_stats.json');
  res.json(data ? JSON.parse(data) : []);
});

app.get('/api/deimos/log', requireAuth, (req, res) => {
  const lines = parseInt(req.query.lines) || 100;
  const data = loadCache('deimos_log.json');
  if (!data) return res.json([]);
  const allLines = JSON.parse(data);
  res.json(allLines.slice(-lines));
});

app.get('/api/deimos/stats', requireAuth, (req, res) => {
  const members = loadCache('deimos_members.json');
  const loa = loadCache('deimos_loa.json');
  const sessions = loadCache('deimos_active_sessions.json');
  const contributions = loadCache('deimos_contributions.json');

  const m = members ? JSON.parse(members) : [];
  const l = loa ? JSON.parse(loa) : [];
  const s = sessions ? JSON.parse(sessions) : [];
  const c = contributions ? JSON.parse(contributions) : [];

  const rankCounts = {};
  m.forEach(mem => {
    const rank = mem.rank || 'Unknown';
    rankCounts[rank] = (rankCounts[rank] || 0) + 1;
  });

  res.json({
    totalMembers: m.length,
    activeLOAs: l.length,
    activeSessions: s.length,
    totalContributions: c.length,
    rankBreakdown: rankCounts,
    playtimeVital: s.filter(x => x.channel_type === 'vital').length,
    playtimeElyxir: s.filter(x => x.channel_type === 'elyxir').length
  });
});

// ── DEIMOS BOT COMMAND PROXY ──
app.post('/api/deimos/command', requireAuth, async (req, res) => {
  const { channelId, message } = req.body;
  if (!channelId || !message) {
    return res.status(400).json({ error: 'channelId and message required' });
  }
  try {
    const resp = await axios.post(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      { content: message },
      {
        headers: {
          'Authorization': `Bot ${config.deimos.botToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json({ success: true, messageId: resp.data.id });
  } catch (e) {
    const errData = e.response ? e.response.data : {};
    res.status(500).json({ error: errData.message || e.message });
  }
});

// ── OPP TRACKER ENDPOINTS ──

app.get('/api/opp/tracking', requireAuth, (req, res) => {
  const data = loadCache('opp_tracking.json');
  res.json(data ? JSON.parse(data) : {});
});

app.get('/api/opp/players', requireAuth, (req, res) => {
  const data = loadCache('opp_player_database.json');
  res.json(data ? JSON.parse(data) : {});
});

app.get('/api/opp/tracked', requireAuth, (req, res) => {
  const data = loadCache('opp_tracked_players.json');
  res.json(data ? JSON.parse(data) : []);
});

app.get('/api/opp/stats', requireAuth, (req, res) => {
  const dbData = loadCache('opp_player_database.json');
  const trackingData = loadCache('opp_tracking.json');
  const db = dbData ? JSON.parse(dbData) : {};
  const tracking = trackingData ? JSON.parse(trackingData) : {};

  const servers = {};
  let totalPlayers = 0;
  for (const [name, record] of Object.entries(db)) {
    totalPlayers++;
    const srvs = record.servers || (record.server ? [record.server] : ['Unknown']);
    srvs.forEach(s => {
      servers[s] = (servers[s] || 0) + 1;
    });
  }

  let totalTracked = Object.keys(tracking).length;
  let currentlyOnline = 0;
  for (const entry of Object.values(tracking)) {
    if (entry.isOnline || entry.lastSeen) {
      const lastSeen = new Date(entry.lastSeen || entry.joinTime).getTime();
      if (Date.now() - lastSeen < 600000) currentlyOnline++;
    }
  }

  res.json({
    totalPlayers,
    totalTracked,
    currentlyOnline,
    serverBreakdown: servers
  });
});

// ── FIVEM LIVE ENDPOINTS ──

app.get('/api/fivem/live', requireAuth, (req, res) => {
  res.json(fivemCache);
});

app.get('/api/fivem/refresh', requireAuth, async (req, res) => {
  await fetchFiveMPlayers();
  res.json(fivemCache);
});

// ══════════════════════════════════════════════════════════════
// CRON SCHEDULES
// ══════════════════════════════════════════════════════════════

// Sync Deimos every 60 seconds
cron.schedule('*/1 * * * *', () => {
  syncDeimosData().catch(e => console.error('Deimos sync failed:', e.message));
});

// Fetch FiveM live players every 60 seconds
setTimeout(() => {
  cron.schedule('*/1 * * * *', () => {
    fetchFiveMPlayers().catch(e => console.error('FiveM fetch failed:', e.message));
  });
}, 5000);

// Sync OPP from SFTP every 5 minutes
cron.schedule('*/5 * * * *', () => {
  syncOppData().catch(e => console.error('OPP sync failed:', e.message));
});

// ══════════════════════════════════════════════════════════════
// STARTUP
// ══════════════════════════════════════════════════════════════
async function startup() {
  console.log('=== RHMC Bot API Server Starting ===');

  app.listen(PORT, () => {
    console.log(`[SERVER] RHMC Bot API running on port ${PORT}`);
    console.log(`[SERVER] Health: http://localhost:${PORT}/api/health`);
  });

  console.log('Running initial data sync...');
  await Promise.allSettled([
    syncDeimosData(),
    syncOppData(),
    fetchFiveMPlayers()
  ]);
  console.log('[SERVER] Initial sync complete');
}

startup();
