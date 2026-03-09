/**
 * Generates sample debug messages for testing the CodeSeer UI.
 * Uses the same message shape as the TCP protocol: { type, payload, meta }.
 */
function meta(overrides = {}) {
  return {
    file: overrides.file ?? 'app/Http/Controllers/UserController.php',
    line: overrides.line ?? 42,
    label: overrides.label ?? null,
    time: new Date().toISOString(),
  };
}

function generateSamples() {
  const samples = [];

  samples.push({
    type: 'dump',
    payload: { values: [{ type: 'string', value: 'Hello', length: 5 }, { type: 'int', value: 42 }] },
    meta: meta({ label: 'User' }),
  });

  samples.push({
    type: 'dump',
    payload: { values: [{ type: 'object', class: 'Illuminate\\Support\\Collection', value: { 0: { type: 'string', value: 'a' }, 1: { type: 'string', value: 'b' } } }] },
    meta: meta({ label: 'Collection' }),
  });

  samples.push({
    type: 'trace',
    payload: {
      frames: [
        { file: 'app/UserController.php', line: 42, function: 'index', class: 'UserController' },
        { file: 'app/OrderService.php', line: 88, function: 'get', class: 'OrderService' },
        { file: 'vendor/laravel/framework/src/Illuminate/Routing/Router.php', line: 120, function: 'dispatch', class: 'Router' },
      ],
    },
    meta: meta({ label: 'Exception trace' }),
  });

  for (const level of ['debug', 'info', 'warning', 'error']) {
    samples.push({
      type: 'log',
      payload: {
        level,
        message: level === 'error' ? 'User not found' : level === 'info' ? 'Request completed in 42ms' : `Sample ${level} message`,
      },
      meta: meta(),
    });
  }

  samples.push({
    type: 'table',
    payload: {
      data: [
        { id: 1, name: 'Alice', email: 'alice@example.com', status: 'active' },
        { id: 2, name: 'Bob', email: 'bob@example.com', status: 'pending' },
        { id: 3, name: 'Carol', email: 'carol@example.com', status: 'done' },
      ],
    },
    meta: meta({ label: 'users' }),
  });

  samples.push({
    type: 'json',
    payload: {
      content: JSON.stringify({ user: { id: 1, name: 'Test' }, items: ['a', 'b'], meta: { source: 'api' } }, null, 2),
    },
    meta: meta({ label: 'API response' }),
  });

  return samples;
}

module.exports = { generateSamples };
