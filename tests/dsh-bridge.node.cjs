'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { createBridge } = require('../dsh-job-journal/bridge.cjs');

test('Loopback HTTP, real phase shapes, one-use credentials, private files and restart', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-job-bridge-test-'));
  const dataDir = path.join(root, 'bridge');
  let bridge = createBridge({ dataDir, port: 0 });
  let { port } = await bridge.start();
  t.after(async () => {
    await bridge.stop();
    assert.ok(root.startsWith(path.join(os.tmpdir(), 'dsh-job-bridge-test-')));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const req = (route, body, headers = {}, method = 'POST') =>
    fetch(`http://127.0.0.1:${port}${route}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: method === 'POST' ? JSON.stringify(body) : undefined,
    });
  const credentialsFile = bridge.pairing().credentialsFile;
  const { code } = JSON.parse(fs.readFileSync(credentialsFile, 'utf8'));
  assert.equal(bridge.pairing().paired, false);
  assert.equal(
    (await req('/v1/pair', { code }, { Origin: 'https://unknown.invalid' })).status,
    403
  );
  const hostStatus = await new Promise((resolve, reject) => {
    const request = require('node:http').request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/v1/pair',
        method: 'POST',
        headers: { host: `elsewhere.test:${port}` },
      },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      }
    );
    request.on('error', reject);
    request.end();
  });
  assert.equal(hostStatus, 403);
  assert.equal((await req('/v1/pair', { code: 'incorrect' })).status, 401);
  assert.equal((await req('/v1/events', { events: [] })).status, 401);
  const pairing = await req('/v1/pair', { code });
  assert.equal(pairing.headers.get('access-control-allow-origin'), null);
  const { token } = await pairing.json();
  const auth = { Authorization: `Bearer ${token}` };
  assert.equal((await req('/v1/pair', { code })).status, 401);
  assert.equal(bridge.pairing().paired, true);
  assert.ok(!fs.readFileSync(credentialsFile, 'utf8').includes(token));
  let i = 0;
  const event = (kind, timeMs, extras = {}) => ({ id: `id-${++i}`, kind, timeMs, ...extras });
  const start = Date.parse('2026-11-25T23:28:00+08:00');
  const events = [event('run_start', start)];
  for (const [n, d] of [116, 81, 83, 87].entries()) {
    const stamp = start + 1000 * (n + 1),
      common = { trace: `F-${n}`, job: `合成岗位${n}`, strategy: '作品优先', channel: 'worker' };
    events.push(
      event('applied', stamp - 200, { job: common.job }),
      event('followup', stamp, { ...common, phase: 'submit_call', ready: true }),
      event('followup', stamp + 5, { ...common, phase: 'submitted', elapsedMs: 5 }),
      event('followup', stamp + d, { ...common, phase: 'delivered', elapsedMs: d })
    );
  }
  events.push(event('run_end', start + 10000));
  const chunk1 = events.slice(0, 7),
    chunk2 = events.slice(7);
  for (const batch of [chunk2, chunk1])
    assert.equal(
      (await (await req('/v1/events', { events: batch }, auth)).json()).accepted,
      batch.length
    );
  const repeat = await (await req('/v1/events', { events: events }, auth)).json();
  assert.deepEqual(repeat, { accepted: 0, duplicates: events.length });
  const summary = bridge.query({ action: 'summary' });
  for (const [field, count] of Object.entries({
    applied: 4,
    sent: 4,
    delivered: 4,
    duplicateCalls: 0,
    timeouts: 0,
  }))
    assert.equal(summary[field], count);
  assert.deepEqual(summary.receiptMs, { min: 81, max: 116, average: 92 });
  const initial = bridge.query({ action: 'trace', trace: 'F-0', limit: 2 });
  assert.equal(initial.total, 3);
  assert.equal(initial.truncated, true);
  for (const malformed of [
    { ...events[1], token: 'must_not_store' },
    { ...events[1], job: 'a'.repeat(161) },
    { ...events[2], phase: '?', id: 'new-event' },
    { ...events[2], probe: 'secret' },
  ]) {
    assert.equal(
      (await req('/v1/events', { events: [event('applied', start + 100), malformed] }, auth))
        .status,
      400
    );
  }
  assert.equal(
    (await req('/v1/events', { events: [{ ...events[1], timeMs: start + 90000 }] }, auth)).status,
    409
  );
  assert.equal((await req('/v1/events', { events: Array(101).fill(events[0]) }, auth)).status, 400);
  assert.equal((await req('/v1/events', { unknown: 'a'.repeat(140000) }, auth)).status, 413);
  const chunkStatus = await new Promise((resolve, reject) => {
    const request = require('node:http').request(
      {
        hostname: '127.0.0.1',
        port,
        method: 'POST',
        path: '/v1/events',
        headers: { ...auth, 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' },
      },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      }
    );
    request.once('error', reject);
    for (let n = 0; n < 10; n++) request.write('x'.repeat(16000));
    request.end();
  });
  assert.equal(chunkStatus, 413);
  assert.equal(
    (await req('/v1/events', { events: [events[0]] }, { ...auth, 'Content-Type': 'text/plain' }))
      .status,
    415
  );
  assert.equal((await req('/v1/events', {}, auth, 'GET')).status, 405);
  assert.throws(() => bridge.query({ action: 'summary', limit: 101 }));
  assert.equal(bridge.query({ action: 'summary' }).applied, 4);
  await bridge.stop();
  bridge = createBridge({ dataDir, port: 0 });
  ({ port } = await bridge.start());
  assert.equal(bridge.query({ action: 'summary' }).sent, 4);
  const base = start + 20000;
  const f = { trace: 'F-late', job: '迟到样本' };
  const more = [
    event('run_start', base),
    event('applied', base + 1),
    event('followup', base + 2, { ...f, phase: 'submit_call' }),
    event('followup', base + 4, { ...f, phase: 'submit_call' }),
    event('followup', base + 15002, { ...f, phase: 'deadline' }),
    event('run_end', base + 15003),
    event('followup', base + 15005, {
      ...f,
      phase: 'status_probe',
      probe: 'CONNECTED',
      late: true,
    }),
    event('followup', base + 16002, { ...f, phase: 'delivered', elapsedMs: 16000, late: true }),
  ];
  assert.equal((await req('/v1/events', { events: more }, auth)).status, 200);
  const later = bridge.query({ action: 'summary' });
  for (const [field, count] of Object.entries({
    sent: 1,
    delivered: 1,
    lateDelivered: 1,
    duplicateCalls: 1,
    timeouts: 1,
    applied: 1,
  }))
    assert.equal(later[field], count);
  assert.equal(bridge.query({ action: 'timeouts' }).traces[0].lateDelivered, true);
  const files = [credentialsFile, path.join(dataDir, 'events.json')];
  for (const file of files) {
    if (process.platform === 'win32') {
      const cmd = `$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value; $rules=(Get-Acl -LiteralPath $env:BRIDGE_FILE).GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]); if(!($rules.Count) -or @($rules|Where-Object {$_.IdentityReference.Value -ne $sid}).Count){exit 1}`;
      execFileSync(
        path.join(
          process.env.SystemRoot,
          'System32',
          'WindowsPowerShell',
          'v1.0',
          'powershell.exe'
        ),
        ['-NoProfile', '-NonInteractive', '-Command', cmd],
        { env: { ...process.env, BRIDGE_FILE: file }, stdio: 'ignore' }
      );
    } else assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  }
});
