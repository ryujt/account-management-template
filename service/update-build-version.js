const fs = require('fs');
const path = require('path');

// package.json에서 버전 읽기
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const version = packageJson.version;
const buildTime = new Date().toISOString();

// 빌드 정보를 담은 파일 생성
const buildInfo = {
  version,
  buildTime,
  env: process.env.NODE_ENV || 'development'
};

// public 디렉토리에 build-info.json 파일 생성
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(
  path.join(publicDir, 'build-info.json'),
  JSON.stringify(buildInfo, null, 2)
);

console.log(`Build info updated: version ${version}, built at ${buildTime}`);