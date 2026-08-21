const SftpClient = require('ssh2-sftp-client');
const initSqlJs = require('sql.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'bot-data');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function save(name, data) {
  const fp = path.join(OUT_DIR, name);
  fs.writeFileSync(fp, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
  console.log(`  Saved ${name} (${(fs.statSync(fp).size / 1024).toFixed(1)}KB)`);
}

async function sftpGet(cfg, remotePath) {
  const sftp = new SftpClient('sync-' + Date.now());
  try {
    await sftp.connect(cfg);
    const data = await sftp.get(remotePath);
    await sftp.end();
    return data;
  } catch (e) {
    console.error(`  SFTP failed ${remotePath}: ${e.message}`);
    try { await sftp.end(); } catch {}
    return null;
  }
}

async function sftpGetBuffer(cfg, remotePath) {
  const sftp = new SftpClient('sync-buf-' + Date.now());
  try {
    await sftp.connect(cfg);
    const chunks = [];
    const stream = await sftp.createReadStream(remotePath);
    await new Promise((resolve, reject) => {
      stream.on('data', c => chunks.push(c));
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    await sftp.end();
    return Buffer.concat(chunks);
  } catch (e) {
    console.error(`  SFTP buffer failed ${remotePath}: ${e.message}`);
    try { await sftp.end(); } catch {}
    return null;
  }
}

function sqliteRows(buf, SQL) {
  try {
    const db = new SQL.Database(Buffer.from(buf));
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
    const result = {};
    if (tables.length) {
      for (const tableName of tables[0].values) {
        const tname = tableName[0];
        try {
          const res = db.exec(`SELECT * FROM ${tname}`);
          if (res.length) {
            result[tname] = res[0].values.map(row => {
              const obj = {};
              res[0].columns.forEach((col, i) => obj[col] = row[i]);
              return obj;
            });
          }
        } catch {}
      }
    }
    db.close();
    return result;
  } catch (e) {
    console.error(`  SQLite parse error: ${e.message}`);
    return {};
  }
}

async function syncDeimos(SQL) {
  console.log('[Deimos] Syncing...');
  const cfg = {
    host: process.env.DEIMOS_SFTP_HOST,
    port: 2022,
    username: process.env.DEIMOS_SFTP_USER,
    password: process.env.DEIMOS_SFTP_PASS
  };

  // Main database
  const dbBuf = await sftpGetBuffer(cfg, 'data/thanatos.db');
  if (dbBuf && SQL) {
    const tables = sqliteRows(dbBuf, SQL);
    if (tables.members) save('deimos_members.json', tables.members);
    if (tables.loa_records) {
      const activeLoa = tables.loa_records.filter(r => r.is_active === 1 || r.is_active === '1');
      save('deimos_loa.json', activeLoa);
    }
    if (tables.contributions) save('deimos_contributions.json', tables.contributions);
    console.log(`  DB tables: ${Object.keys(tables).join(', ')}`);
  }

  // Playtime database
  const ptBuf = await sftpGetBuffer(cfg, 'data/playtime.db');
  if (ptBuf && SQL) {
    const tables = sqliteRows(ptBuf, SQL);
    if (tables.active_sessions) save('deimos_active_sessions.json', tables.active_sessions);
    if (tables.monthly_stats) {
      const sorted = tables.monthly_stats.sort((a, b) => (b.total_seconds || 0) - (a.total_seconds || 0));
      save('deimos_monthly_stats.json', sorted.slice(0, 100));
    }
    console.log(`  Playtime tables: ${Object.keys(tables).join(', ')}`);
  }

  // Bot log (last 200 lines)
  const logData = await sftpGet(cfg, 'thanatos_bot.log');
  if (logData) {
    const text = typeof logData === 'string' ? logData : logData.toString('utf-8');
    const lines = text.split('\n').filter(l => l.trim()).slice(-200);
    save('deimos_log.json', lines);
  }

  // Stats summary
  const members = loadJson('deimos_members.json');
  const loa = loadJson('deimos_loa.json');
  const sessions = loadJson('deimos_active_sessions.json');
  const stats = {
    totalMembers: Array.isArray(members) ? members.length : 0,
    activeLOAs: Array.isArray(loa) ? loa.length : 0,
    activeSessions: Array.isArray(sessions) ? sessions.length : 0,
    lastSync: new Date().toISOString()
  };
  save('deimos_stats.json', stats);
  console.log(`[Deimos] Done: ${stats.totalMembers} members, ${stats.activeLOAs} LOAs`);
}

async function syncOppTracker() {
  console.log('[OPP Tracker] Syncing...');
  const cfg = {
    host: process.env.OPP_SFTP_HOST,
    port: 2022,
    username: process.env.OPP_SFTP_USER,
    password: process.env.OPP_SFTP_PASS
  };

  // Player database
  const dbRaw = await sftpGet(cfg, 'player_database.json');
  if (dbRaw) {
    const text = typeof dbRaw === 'string' ? dbRaw : dbRaw.toString('utf-8');
    save('opp_player_database.json', text);
    try {
      const data = JSON.parse(text);
      const servers = {};
      for (const [, record] of Object.entries(data)) {
        const srvs = record.servers || (record.server ? [record.server] : ['Unknown']);
        srvs.forEach(s => { servers[s] = (servers[s] || 0) + 1; });
      }
      console.log(`  Database: ${Object.keys(data).length} players, servers: ${JSON.stringify(servers)}`);
    } catch {}
  }

  // Tracking data
  const trackRaw = await sftpGet(cfg, 'player_tracking_data.json');
  if (trackRaw) {
    const text = typeof trackRaw === 'string' ? trackRaw : trackRaw.toString('utf-8');
    save('opp_tracking.json', text);
  }

  // Tracked players (watchlist)
  const trackedRaw = await sftpGet(cfg, 'tracked_players.json');
  if (trackedRaw) {
    const text = typeof trackedRaw === 'string' ? trackedRaw : trackedRaw.toString('utf-8');
    save('opp_tracked_players.json', text);
  }

  // Private tracked
  const privRaw = await sftpGet(cfg, 'private_tracked_players.json');
  if (privRaw) {
    const text = typeof privRaw === 'string' ? privRaw : privRaw.toString('utf-8');
    save('opp_private_tracked.json', text);
  }

  // Stats summary
  const dbData = loadJson('opp_player_database.json');
  const trackingData = loadJson('opp_tracking.json');
  const db = dbData || {};
  const tracking = trackingData || {};
  let totalPlayers = Object.keys(db).length;
  let totalTracked = Object.keys(tracking).length;
  let servers = {};
  for (const [, record] of Object.entries(db)) {
    const srvs = record.servers || (record.server ? [record.server] : ['Unknown']);
    srvs.forEach(s => { servers[s] = (servers[s] || 0) + 1; });
  }
  save('opp_stats.json', {
    totalPlayers,
    totalTracked,
    serverBreakdown: servers,
    lastSync: new Date().toISOString()
  });
  console.log(`[OPP] Done: ${totalPlayers} players, ${totalTracked} tracked`);
}

async function syncFiveM() {
  console.log('[FiveM] Skipping - frontend fetches live via CORS proxy');
  // FiveM data is fetched live by the browser via allorigins CORS proxy
  // No need to sync from server side (GitHub Actions runners get blocked)
}

function loadJson(name) {
  const fp = path.join(OUT_DIR, name);
  if (!fs.existsSync(fp)) return null;
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return null; }
}

async function main() {
  console.log('=== RHMC Bot Data Sync ===');
  console.log(`Output: ${OUT_DIR}`);
  console.log(`Time: ${new Date().toISOString()}`);

  let SQL;
  try {
    SQL = await initSqlJs();
    console.log('sql.js loaded');
  } catch (e) {
    console.error('sql.js failed to load:', e.message);
  }

  await Promise.allSettled([
    syncDeimos(SQL),
    syncOppTracker(),
    syncFiveM()
  ]);

  // Write sync metadata
  save('sync_meta.json', {
    lastSync: new Date().toISOString(),
    syncVersion: 1
  });

  console.log('=== Sync Complete ===');
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
