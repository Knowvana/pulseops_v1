// Quick verification script - tests import chain
import fs from 'fs';
process.stdout.write('Step 1: fs loaded\n');

try {
  process.stdout.write('Step 2: loading config...\n');
  const cfg = await import('./src/config/index.js');
  process.stdout.write('Step 3: config loaded, port=' + cfg.default.port + '\n');

  process.stdout.write('Step 4: loading app...\n');
  const { default: createApp } = await import('./src/app.js');
  process.stdout.write('Step 5: app factory loaded\n');

  const app = createApp();
  process.stdout.write('Step 6: app created\n');

  const server = app.listen(4001, () => {
    process.stdout.write('Step 7: Server listening on 4001\n');
    // Test health endpoint
    fetch('http://localhost:4001/api/health')
      .then(r => r.json())
      .then(d => {
        process.stdout.write('Step 8: Health check response: ' + JSON.stringify(d) + '\n');
        server.close(() => process.exit(0));
      })
      .catch(e => {
        process.stdout.write('Health fetch error: ' + e.message + '\n');
        server.close(() => process.exit(1));
      });
  });
} catch (err) {
  process.stderr.write('ERROR: ' + err.message + '\n');
  process.stderr.write(err.stack + '\n');
  process.exit(1);
}
