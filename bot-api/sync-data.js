const SftpClient = require('ssh2-sftp-client');
const initSqlJs = require('sql.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const OUT_DIR = path.join(__dirname, '..', 'bot-data');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const GUILD_ID = '889005510286786601';
const RANK_ROLE_NAMES = [
  'president', 'vice president', 'secretary', 'treasurer',
  'sergeant at arms', 'road captain', 'enforcer', 'officer',
  'tailgunner', 'full patch', 'nomad', 'prospect',
  'probationary officer'
];
const RANK_ORDER = [
  'president', 'vice president', 'secretary', 'treasurer',
  'sergeant at arms', 'road captain', 'enforcer', 'officer',
  'probationary officer', 'tailgunner', 'full patch', 'nomad', 'prospect'
];

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

  // Playtime database - aggregate by user, join with members for display names
  const ptBuf = await sftpGetBuffer(cfg, 'data/playtime.db');
  if (ptBuf && SQL) {
    const ptDb = new SQL.Database(Buffer.from(ptBuf));

    // Build member name lookup from thanatos.db
    let memberNames = {};
    if (dbBuf) {
      try {
        const memDb = new SQL.Database(Buffer.from(dbBuf));
        const memRes = memDb.exec('SELECT user_id, discord_name FROM members');
        if (memRes.length) {
          memRes[0].values.forEach(r => { memberNames[String(r[0])] = r[1]; });
        }
        memDb.close();
      } catch {}
    }

    // Aggregate playtime: total per user, split by channel_type
    let monthlyStats = [];
    try {
      const res = ptDb.exec([
        'SELECT user_id, user_name,',
        'SUM(CASE WHEN channel_type="vital" THEN total_seconds ELSE 0 END) as vital_seconds,',
        'SUM(CASE WHEN channel_type="elyxir" THEN total_seconds ELSE 0 END) as elyxir_seconds,',
        'SUM(total_seconds) as total_seconds,',
        'SUM(session_count) as session_count',
        'FROM monthly_stats GROUP BY user_id ORDER BY total_seconds DESC LIMIT 100'
      ].join(' '));
      if (res.length) {
        monthlyStats = res[0].values.map(row => {
          const obj = {};
          res[0].columns.forEach((c, i) => obj[c] = row[i]);
          const uid = String(obj.user_id);
          obj.discord_name = memberNames[uid] || obj.user_name || 'User ' + uid;
          return obj;
        });
      }
    } catch (e) { console.error('  Playtime query error:', e.message); }

    save('deimos_monthly_stats.json', monthlyStats);

    // Active sessions
    let activeSessions = [];
    try {
      const sessRes = ptDb.exec('SELECT * FROM active_sessions');
      if (sessRes.length) {
        activeSessions = sessRes[0].values.map(row => {
          const obj = {};
          sessRes[0].columns.forEach((c, i) => obj[c] = row[i]);
          return obj;
        });
      }
    } catch {}
    save('deimos_active_sessions.json', activeSessions);

    ptDb.close();
    console.log('  Playtime: ' + monthlyStats.length + ' users aggregated');
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

async function syncDiscordMembers() {
  const token = process.env.DEIMOS_BOT_TOKEN;
  if (!token) {
    console.log('[Discord] No bot token, skipping');
    return;
  }
  console.log('[Discord] Syncing members from API...');

  try {
    const rolesRes = await axios.get(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
      headers: { Authorization: `Bot ${token}` }
    });

    const rankRoles = rolesRes.data.filter(r => {
      const name = r.name.toLowerCase();
      return RANK_ROLE_NAMES.some(rank => name.includes(rank));
    }).sort((a, b) => b.position - a.position);

    const rankRoleMap = {};
    rankRoles.forEach(r => { rankRoleMap[r.id] = r; });

    let allMembers = [];
    let after = '0';
    while (true) {
      const res = await axios.get(
        `https://discord.com/api/v10/guilds/${GUILD_ID}/members?limit=1000&after=${after}`,
        { headers: { Authorization: `Bot ${token}` } }
      );
      if (!res.data.length) break;
      allMembers = allMembers.concat(res.data);
      after = res.data[res.data.length - 1].user.id;
      if (res.data.length < 1000) break;
    }

    const clubMembers = allMembers.filter(m =>
      m.roles.some(rid => rankRoleMap[rid])
    );

    const dbMembers = loadJson('deimos_members.json') || [];
    const dbUserIds = new Set(dbMembers.map(m => String(m.user_id)));
    const dbNames = new Set(dbMembers.map(m => (m.discord_name || '').toLowerCase()));
    const dbUsernames = new Set(dbMembers.map(m => (m.discord_username || '').toLowerCase()));

    const discordEntries = clubMembers.map(m => {
      const memberRankRoles = m.roles
        .map(rid => rankRoleMap[rid])
        .filter(Boolean)
        .sort((a, b) => b.position - a.position);
      const highestRole = memberRankRoles[0];

      let rank = highestRole ? highestRole.name : 'Unknown';
      if (rank.toLowerCase().includes('vice president')) rank = 'Vice President';
      else if (rank.toLowerCase().includes('president')) rank = 'President';
      else if (rank.toLowerCase().includes('sergeant at arms')) rank = 'Sergeant At Arms';
      else if (rank.toLowerCase().includes('secretary')) rank = 'Secretary';
      else if (rank.toLowerCase().includes('treasurer')) rank = 'Treasurer';
      else if (rank.toLowerCase().includes('road captain')) rank = 'Road Captain';
      else if (rank.toLowerCase().includes('probationary officer')) rank = 'Probationary Officer';
      else if (rank.toLowerCase().includes('enforcer')) rank = 'Enforcer';
      else if (rank.toLowerCase().includes('officer')) rank = 'Officer';
      else if (rank.toLowerCase().includes('tailgunner')) rank = 'Tailgunner';
      else if (rank.toLowerCase().includes('full patch')) rank = 'Full Patch';
      else if (rank.toLowerCase().includes('nomad')) rank = 'Nomad';
      else if (rank.toLowerCase().includes('life member')) rank = 'Life Member';
      else if (rank.toLowerCase().includes('prospect')) rank = 'Prospect';

      return {
        user_id: m.user.id,
        discord_name: m.nick || m.user.username,
        discord_username: m.user.username,
        rank: rank,
        status: 'Active',
        source: 'discord'
      };
    });

    const merged = [...dbMembers];
    let added = 0;
    for (const dm of discordEntries) {
      const uid = String(dm.user_id);
      const uname = (dm.discord_username || '').toLowerCase();
      const dname = (dm.discord_name || '').toLowerCase();
      const isDuplicate = dbUserIds.has(uid) || dbUsernames.has(uname) || dbNames.has(dname);
      if (!isDuplicate) {
        merged.push(dm);
        added++;
      }
    }

    save('deimos_members.json', merged);
    console.log(`  Discord: ${clubMembers.length} with roles, ${added} added to roster (total: ${merged.length})`);
  } catch (e) {
    console.error(`  Discord sync failed: ${e.message}`);
  }
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

  await syncDiscordMembers();

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
