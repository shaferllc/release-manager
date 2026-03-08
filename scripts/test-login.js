/**
 * Test login to the app (same backend as telemetry: shipwell-web).
 * Uses Laravel Passport password grant: POST /oauth/token.
 *
 *   APP_URL=https://shipwell-web.test \
 *   CLIENT_ID=2 \
 *   CLIENT_SECRET=your-secret \
 *   EMAIL=user@example.com \
 *   PASSWORD=secret \
 *   node scripts/test-login.js
 *
 * Create a password grant client in shipwell-web first:
 *   cd shipwell-web && php artisan passport:client --password
 */

const APP_URL = (process.env.APP_URL || 'https://shipwell-web.test').replace(/\/+$/, '');
const CLIENT_ID = process.env.CLIENT_ID || '';
const CLIENT_SECRET = process.env.CLIENT_SECRET || '';
const EMAIL = process.env.EMAIL || '';
const PASSWORD = process.env.PASSWORD || '';

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Set CLIENT_ID and CLIENT_SECRET (from php artisan passport:client --password).');
    process.exit(1);
  }
  if (!EMAIL || !PASSWORD) {
    console.error('Set EMAIL and PASSWORD for the user to log in as.');
    process.exit(1);
  }

  const tokenUrl = `${APP_URL}/oauth/token`;
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    username: EMAIL,
    password: PASSWORD,
  }).toString();

  console.log('POST', tokenUrl);
  console.log('Logging in as', EMAIL, '...\n');

  try {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body,
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('Login failed:', res.status);
      console.error(data.message || data.error_description || data.error || res.statusText);
      process.exit(1);
    }

    console.log('Login OK');
    console.log('Token type:', data.token_type || 'Bearer');
    console.log('Expires in:', data.expires_in, 'seconds');
    if (data.access_token) {
      console.log('Access token:', data.access_token.slice(0, 20) + '...');
    }

    if (data.refresh_token) {
      console.log('Refresh token: present');
    }
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}

main();
