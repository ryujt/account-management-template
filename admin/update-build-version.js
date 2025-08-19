const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function gitSha() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
}

function isoNow() {
  return new Date().toISOString();
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function main() {
  const version = {
    appName: process.env.REACT_APP_APP_NAME || 'Account Management Admin',
    buildTime: isoNow(),
    git: gitSha()
  };
  const outDir = path.join(process.cwd(), 'public');
  ensureDir(outDir);
  const outFile = path.join(outDir, 'build-version.json');
  fs.writeFileSync(outFile, JSON.stringify(version, null, 2), 'utf8');
  process.stdout.write(outFile + '\n');
}

main();