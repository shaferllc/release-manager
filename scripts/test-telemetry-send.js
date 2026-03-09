/**
 * Manual test: run telemetry send path.
 *
 *   node scripts/test-telemetry-send.js
 *     Dry run: logs payloads, no network (mock fetch).
 *
 *   node scripts/test-telemetry-send.js --send
 *     Sends one single event and one batch to the endpoint (real fetch).
 *
 *   TELEMETRY_URL=http://localhost:8000/api/telemetry node scripts/test-telemetry-send.js --send
 *     Same but POST to a different URL (e.g. local shipwell-web).
 */

const path = require('path');
const crypto = require('crypto');
const telemetry = require(path.join(__dirname, '..', 'src-main', 'lib', 'telemetry'));

const doSend = process.argv.includes('--send');
const deviceId = doSend ? crypto.randomUUID() : '00000000-0000-4000-8000-000000000000';

const getPreference = (key) => {
  if (key === 'telemetry') return true;
  if (key === 'telemetryDeviceId') return deviceId;
  return undefined;
};

function loggingFetch(url, opts) {
  const body = opts?.body != null ? JSON.parse(opts.body) : null;
  console.log('POST', url);
  console.log(JSON.stringify(body, null, 2));
  return Promise.resolve({
    status: 201,
    text: () => Promise.resolve(JSON.stringify({ id: 'test', received_at: new Date().toISOString() })),
  });
}

async function main() {
  const fetchImpl = doSend ? undefined : loggingFetch;
  if (doSend) {
    const url = process.env.TELEMETRY_URL || 'https://shipwell-web.test/api/telemetry';
    console.log('Sending real requests to', url, '\n');
  }

  console.log('--- Single event (sendSingleEvent) ---');
  const single = await telemetry.sendSingleEvent(
    getPreference,
    'test.script_run',
    { script: 'test-telemetry-send.js', live: doSend },
    fetchImpl
  );
  console.log('Result:', single);
  if (doSend && !single.ok) {
    console.error('Single event failed:', single.error);
    process.exit(1);
  }

  console.log('\n--- Batch (track + flush) ---');
  telemetry.track(getPreference, 'view.viewed', { view: 'dashboard' });
  telemetry.track(getPreference, 'detail_tab.viewed', { tab: 'git' });
  const flushRes = await telemetry.flush(getPreference, fetchImpl);
  console.log('Flush result:', flushRes);
  if (doSend && !flushRes.ok) {
    console.error('Batch failed:', flushRes.error);
    process.exit(1);
  }

  if (doSend) {
    console.log('\nDone. Events were sent. Check the Telemetry page in shipwell-web.');
  } else {
    console.log('\nDone. No requests were sent (dry run). Use --send to send for real.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
