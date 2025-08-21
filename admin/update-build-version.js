const fs = require('fs');
const path = require('path');

const buildPath = path.join(__dirname, 'build');
const indexPath = path.join(buildPath, 'index.html');

if (fs.existsSync(indexPath)) {
  const buildTime = new Date().toISOString();
  let content = fs.readFileSync(indexPath, 'utf8');
  
  // Add build version meta tag
  content = content.replace(
    '<title>',
    `<meta name="build-version" content="${buildTime}" />\n    <title>`
  );
  
  fs.writeFileSync(indexPath, content);
  console.log(`Build version updated: ${buildTime}`);
} else {
  console.log('Build directory not found');
}