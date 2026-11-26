'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { randomBytes, createHash, timingSafeEqual } = require('node:crypto');
const { execFileSync } = require('node:child_process');

const MAX_BYTES = 128 * 1024;
const MAX_EVENTS = 10000;
const ID = /^[a-zA-Z0-9_-]{1,160}$/;
const KINDS = new Set(['run_start', 'run_end', 'applied', 'followup']);
const STRATEGIES = new Set(['作品优先', '拓展机会', '广泛尝试', '原版在线简历匹配', '常规']);
const PHASES = new Set(
  'submit_call sync_error request_rejected request_timeout ready_timeout response_error response_empty submitted send_error delivery_timeout delivered deadline status_probe observation_end page_exit setup_error disabled queued cancelled failed unknown'.split(
    ' '
  )
);
const TIMEOUTS = new Set(['request_timeout', 'ready_timeout', 'delivery_timeout', 'deadline']);
const CHANNELS = new Set(['worker', 'sdk-proxy', 'sdk-socket', 'legacy-text', 'legacy-image']);
const PROBES = new Set([
  'CONNECTED',
  'DISCONNECTED',
  'CONNECTING',
  'RECONNECTING',
  'CLOSED',
  'timeout',
  'failed',
  'other',
]);
const FIELDS = [
  'id',
  'timeMs',
  'kind',
  'job',
  'strategy',
  'trace',
  'aiTrace',
  'phase',
  'channel',
  'elapsedMs',
  'late',
  'submitted',
  'ready',
  'probe',
];
const ORIGINS = new Set([
  'https://www.zhipin.com',
  'chrome-extension://iikmkjmpaadaobahmlepeloendndfphd',
  'chrome-extension://dhdgffkkebhmkfjojejmpbldmpobfkfo',
]);

function reject(status, message) {
  throw Object.assign(new Error(message), { status });
}
function hasOnly(obj, keys) {
  return (
    !!obj &&
    typeof obj === 'object' &&
    !Array.isArray(obj) &&
    Object.keys(obj).every((k) => keys.includes(k))
  );
}
function validId(value) {
  return typeof value === 'string' && ID.test(value);
}
function canonicalEvent(input) {
  if (
    !hasOnly(input, FIELDS) ||
    !validId(input.id) ||
    !KINDS.has(input.kind) ||
    !Number.isSafeInteger(input.timeMs) ||
    input.timeMs <= 0 ||
    input.timeMs > 8640000000000000
  )
    reject(400, 'Invalid event');
  const {
    kind,
    job,
    strategy,
    trace,
    aiTrace,
    phase,
    channel,
    elapsedMs,
    late,
    submitted,
    ready,
    probe,
  } = input;
  if (
    (job !== undefined &&
      (typeof job !== 'string' ||
        !job.trim() ||
        job.length > 160 ||
        /[\p{Cc}\p{Zl}\p{Zp}]/u.test(job))) ||
    (strategy !== undefined && !STRATEGIES.has(strategy)) ||
    (aiTrace !== undefined && !validId(aiTrace)) ||
    (trace !== undefined && !validId(trace)) ||
    (kind === 'followup' && (!validId(trace) || !PHASES.has(phase))) ||
    (kind !== 'followup' &&
      [trace, phase, channel, elapsedMs, late, submitted, ready, probe].some(
        (v) => v !== undefined
      )) ||
    (channel !== undefined && !CHANNELS.has(channel)) ||
    (elapsedMs !== undefined && (!Number.isSafeInteger(elapsedMs) || elapsedMs < 0)) ||
    [late, submitted, ready].some((v) => v !== undefined && typeof v !== 'boolean') ||
    (probe !== undefined && (phase !== 'status_probe' || !PROBES.has(probe)))
  )
    reject(400, 'Invalid event fields');
  // Stable field order also makes repeated uploads independent of JSON property order.
  return Object.fromEntries(
    FIELDS.filter((k) => Object.hasOwn(input, k)).map((k) => [k, input[k]])
  );
}
const order = (a, b) => a.timeMs - b.timeMs || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
function describe(events) {
  const first = events[0];
  const calls = events.filter((e) => e.phase === 'submit_call');
  const receipt = events.find((e) => e.phase === 'delivered');
  const timeout = events.find((e) => TIMEOUTS.has(e.phase));
  const measured =
    receipt?.elapsedMs ??
    (receipt && calls[0] && receipt.timeMs >= calls[0].timeMs
      ? receipt.timeMs - calls[0].timeMs
      : null);
  return {
    trace: first.trace,
    job: events.find((e) => e.job)?.job,
    strategy: events.find((e) => e.strategy)?.strategy,
    startMs: first.timeMs,
    lastMs: events.at(-1).timeMs,
    calls: calls.length,
    delivered: !!receipt,
    timedOut: !!timeout,
    lateDelivered:
      !!receipt && (receipt.late === true || (!!timeout && receipt.timeMs > timeout.timeMs)),
    receiptMs: measured,
    lastPhase: events.at(-1).phase,
  };
}
function queryRows(events, lastSyncAt, options) {
  if (!hasOnly(options, ['action', 'trace', 'limit'])) reject(400, 'Invalid query');
  const { action, trace, limit = 20 } = options;
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !['summary', 'timeouts', 'trace'].includes(action)
  )
    reject(400, 'Invalid query range');
  if (action === 'trace') {
    if (!validId(trace)) reject(400, 'Invalid trace');
    const rows = events.filter((e) => e.kind === 'followup' && e.trace === trace);
    return {
      action,
      lastSyncAt,
      trace,
      found: !!rows.length,
      total: rows.length,
      truncated: rows.length > limit,
      events: rows.slice(-limit),
    };
  }
  const groups = new Map();
  for (const e of events)
    if (e.kind === 'followup') {
      if (!groups.has(e.trace)) groups.set(e.trace, []);
      groups.get(e.trace).push(e);
    }
  const traces = [...groups.values()]
    .map(describe)
    .sort((a, b) => b.lastMs - a.lastMs || a.trace.localeCompare(b.trace));
  if (action === 'timeouts') {
    const matching = traces.filter((t) => t.timedOut);
    return {
      action,
      lastSyncAt,
      total: matching.length,
      truncated: matching.length > limit,
      traces: matching.slice(0, limit),
    };
  }
  const startIndex = events.findLastIndex((e) => e.kind === 'run_start');
  const start = events[startIndex];
  const inRun = events.slice(Math.max(0, startIndex));
  const endIndex = inRun.findIndex((e) => e.kind === 'run_end');
  const core = endIndex < 0 ? inRun : inRun.slice(0, endIndex + 1);
  const ids = new Set(core.filter((e) => e.kind === 'followup').map((e) => e.trace));
  const recent = traces.filter(
    (t) => ids.has(t.trace) && (!start || order(groups.get(t.trace)[0], start) >= 0)
  );
  const times = recent.map((t) => t.receiptMs).filter(Number.isFinite);
  return {
    action,
    lastSyncAt,
    run: {
      startMs: start?.timeMs ?? null,
      endMs: core.find((e) => e.kind === 'run_end')?.timeMs ?? null,
      partial: !start,
    },
    applied: core.filter((e) => e.kind === 'applied').length,
    sent: recent.filter((t) => t.calls > 0).length,
    delivered: recent.filter((t) => t.delivered).length,
    duplicateCalls: recent.reduce((n, t) => n + Math.max(0, t.calls - 1), 0),
    timeouts: recent.filter((t) => t.timedOut).length,
    lateDelivered: recent.filter((t) => t.lateDelivered).length,
    receiptMs: {
      min: times.length ? Math.min(...times) : null,
      max: times.length ? Math.max(...times) : null,
      average: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
    },
    totalTraces: recent.length,
    recent: recent.slice(0, limit),
  };
}

function secureDirectory(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (fs.lstatSync(dir).isSymbolicLink())
    throw new Error('Private data directory must not be a link');
  if (process.platform !== 'win32') {
    fs.chmodSync(dir, 0o700);
    return;
  }
  const script = `$ErrorActionPreference='Stop'; $dir=$env:DSH_JOB_DATA_DIR; $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User; $acl=[Security.AccessControl.DirectorySecurity]::new(); $acl.SetAccessRuleProtection($true,$false); $rule=[Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow'); $acl.AddAccessRule($rule); [IO.Directory]::SetAccessControl($dir,$acl)`;
  execFileSync(
    path.join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
    ['-NoProfile', '-NonInteractive', '-Command', script],
    {
      env: { ...process.env, DSH_JOB_DATA_DIR: dir },
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'inherit'],
      timeout: 15000,
    }
  );
}
function atomicJSON(file, value) {
  const tmp = `${file}.${randomBytes(10).toString('hex')}.tmp`;
  const fd = fs.openSync(tmp, 'wx', 0o600);
  try {
    try {
      fs.writeFileSync(fd, JSON.stringify(value));
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmp, file);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}
function readJSON(file) {
  try {
    const info = fs.lstatSync(file);
    if (
      !info.isFile() ||
      info.isSymbolicLink() ||
      (process.platform !== 'win32' && info.mode & 0o077)
    )
      throw new Error('Unsafe file permissions');
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return undefined;
    throw e;
  }
}
const hash = (text) => createHash('sha256').update(text).digest();
async function readBody(req) {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type'] || ''))
    reject(415, 'Expected JSON');
  if (Number(req.headers['content-length']) > MAX_BYTES) reject(413, 'Body too large');
  let size = 0;
  const chunks = [];
  await new Promise((resolve, rejectBody) => {
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size <= MAX_BYTES) chunks.push(chunk);
      else rejectBody(Object.assign(new Error('Body too large'), { status: 413 }));
    });
    req.once('end', resolve);
    req.once('error', rejectBody);
  });
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
  } catch {
    reject(400, 'Invalid JSON');
  }
}
function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    Connection: 'close',
  });
  res.end(JSON.stringify(body));
}
function createBridge({ dataDir, port = 18761 }) {
  if (!dataDir || !path.isAbsolute(dataDir) || !Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error('Invalid bridge directory or port');
  const credentialsFile = path.join(dataDir, 'credentials.json'),
    dataFile = path.join(dataDir, 'events.json');
  let server,
    actualPort = port,
    credentials,
    events = [],
    lastSyncAt = null;
  function load() {
    secureDirectory(dataDir);
    credentials = readJSON(credentialsFile);
    if (credentials === undefined) {
      credentials = { version: 1, code: randomBytes(18).toString('base64url') };
      atomicJSON(credentialsFile, credentials);
    }
    if (
      credentials.version !== 1 ||
      !(
        (typeof credentials.code === 'string' && /^[\w-]{24}$/.test(credentials.code)) ||
        (typeof credentials.tokenHash === 'string' && /^[a-f0-9]{64}$/.test(credentials.tokenHash))
      )
    )
      throw new Error('Invalid bridge credential file');
    const data = readJSON(dataFile);
    if (data === undefined) return;
    if (data.version !== 1 || !Array.isArray(data.events))
      throw new Error('Invalid bridge data file');
    events = data.events.map(canonicalEvent).sort(order);
    lastSyncAt = data.lastSyncAt;
  }
  async function handle(req, res) {
    if (
      req.socket.remoteAddress !== '127.0.0.1' ||
      req.headers.host !== `127.0.0.1:${actualPort}` ||
      (req.headers.origin !== undefined && !ORIGINS.has(req.headers.origin))
    )
      reject(403, 'Untrusted request');
    if (req.method !== 'POST') reject(405, 'POST required');
    if (!['/v1/pair', '/v1/events'].includes(req.url)) reject(404, 'Unknown endpoint');
    if (req.url === '/v1/pair') {
      const body = await readBody(req);
      if (!hasOnly(body, ['code']) || typeof body.code !== 'string')
        reject(400, 'Invalid pairing request');
      if (!credentials?.code || !timingSafeEqual(hash(body.code), hash(credentials.code)))
        reject(401, 'Pairing failed');
      const token = randomBytes(32).toString('base64url');
      const next = { version: 1, tokenHash: hash(token).toString('hex') };
      atomicJSON(credentialsFile, next);
      credentials = next;
      return send(res, 200, { token });
    }
    const bearer = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization || '');
    if (
      !credentials?.tokenHash ||
      !bearer ||
      !timingSafeEqual(hash(bearer[1]), Buffer.from(credentials.tokenHash, 'hex'))
    )
      reject(401, 'Authentication required');
    const body = await readBody(req);
    if (
      !hasOnly(body, ['events']) ||
      !Array.isArray(body.events) ||
      !body.events.length ||
      body.events.length > 100
    )
      reject(400, 'Expected 1 to 100 events');
    const merged = new Map(events.map((e) => [e.id, e]));
    let accepted = 0;
    for (const raw of body.events) {
      const e = canonicalEvent(raw),
        old = merged.get(e.id);
      if (old && JSON.stringify(old) !== JSON.stringify(e)) reject(409, 'Event ID conflict');
      if (!old) {
        merged.set(e.id, e);
        accepted++;
      }
    }
    const next = [...merged.values()].sort(order).slice(-MAX_EVENTS);
    const synced = new Date().toISOString();
    atomicJSON(dataFile, { version: 1, lastSyncAt: synced, events: next });
    events = next;
    lastSyncAt = synced;
    send(res, 200, { accepted, duplicates: body.events.length - accepted });
  }
  return {
    async start() {
      if (server) throw new Error('Bridge already started');
      server = http.createServer(
        { maxHeaderSize: 8192, requestTimeout: 10000, headersTimeout: 8000 },
        (req, res) => {
          handle(req, res).catch((e) => {
            if (!res.destroyed && !res.headersSent)
              send(res, e.status || 500, { error: e.status ? e.message : 'Bridge unavailable' });
          });
        }
      );
      server.maxConnections = 32;
      try {
        await new Promise((resolve, reject) => {
          server.once('error', reject);
          server.listen(port, '127.0.0.1', () => {
            server.removeListener('error', reject);
            resolve();
          });
        });
        actualPort = server.address().port;
        load();
        return { port: actualPort };
      } catch (error) {
        const failed = server;
        server = null;
        if (failed.listening) await new Promise((done) => failed.close(done));
        throw error;
      }
    },
    async stop() {
      const closing = server;
      if (!closing) return;
      await new Promise((done) => {
        closing.close(done);
        closing.closeAllConnections();
      });
      server = null;
    },
    query(options) {
      return queryRows(events, lastSyncAt, options);
    },
    pairing() {
      return { paired: !!credentials?.tokenHash, credentialsFile, port: actualPort };
    },
  };
}
module.exports = { createBridge };
