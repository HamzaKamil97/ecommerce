const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG = process.env.HANOOT_DEV_LOG ||
  path.join(process.env.LOCALAPPDATA || process.env.TMP || '.', 'Temp', 'expo-live.log');

try { fs.writeFileSync(LOG, ''); } catch {}

const ip = process.env.REACT_NATIVE_PACKAGER_HOSTNAME || '0.0.0.0';
process.stdout.write(`\n=== HANOOT EXPO METRO (logged) ===\nIP : ${ip}:8081\nURL: exp://${ip}:8081\nLOG: ${LOG}\n\n`);

const child = cp.spawn('npx', ['expo', 'start', '--lan', '--port', '8081'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
  env: process.env,
});

function append(chunk) {
  try { fs.appendFileSync(LOG, chunk); } catch {}
}

child.stdout.on('data', (d) => { process.stdout.write(d); append(d); });
child.stderr.on('data', (d) => { process.stderr.write(d); append(d); });
child.on('exit', (code) => { process.exit(code ?? 0); });
