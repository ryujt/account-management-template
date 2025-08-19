const fs = require('fs');
const path = require('path');

// Test if all required files exist
const requiredFiles = [
  'backend/package.json',
  'backend/src/server.js',
  'backend/src/config/database.js',
  'backend/src/models/User.js',
  'backend/src/services/authService.js',
  'backend/Dockerfile',
  'docker-compose.yml',
  'backend/database/init.sql'
];

const requiredDirectories = [
  'backend/src/adapters',
  'backend/src/middleware',
  'backend/src/routes',
  'backend/src/services',
  'backend/src/models',
  'backend/src/utils'
];

console.log('🔍 Testing project structure...\n');

// Check files
console.log('📄 Checking required files:');
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
  }
});

console.log('\n📁 Checking required directories:');
requiredDirectories.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    console.log(`✅ ${dir}`);
  } else {
    console.log(`❌ ${dir} - MISSING`);
  }
});

// Check package.json
console.log('\n📦 Checking package.json:');
try {
  const packagePath = path.join(__dirname, 'backend/package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const requiredDeps = ['express', 'mysql2', 'sequelize', 'bcryptjs', 'jsonwebtoken'];
  console.log('Required dependencies:');
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep]) {
      console.log(`  ✅ ${dep}: ${packageJson.dependencies[dep]}`);
    } else {
      console.log(`  ❌ ${dep} - MISSING`);
    }
  });
} catch (error) {
  console.log(`❌ Error reading package.json: ${error.message}`);
}

// Check Docker configuration
console.log('\n🐳 Checking Docker configuration:');
const dockerComposePath = path.join(__dirname, 'docker-compose.yml');
if (fs.existsSync(dockerComposePath)) {
  console.log('✅ docker-compose.yml exists');
  
  const dockerfilePath = path.join(__dirname, 'backend/Dockerfile');
  if (fs.existsSync(dockerfilePath)) {
    console.log('✅ Dockerfile exists');
  } else {
    console.log('❌ Dockerfile missing');
  }
} else {
  console.log('❌ docker-compose.yml missing');
}

// Check environment files
console.log('\n🔧 Checking environment files:');
const envFiles = ['.env', '.env.docker'];
envFiles.forEach(envFile => {
  const envPath = path.join(__dirname, 'backend', envFile);
  if (fs.existsSync(envPath)) {
    console.log(`✅ backend/${envFile}`);
  } else {
    console.log(`⚠️  backend/${envFile} - Not found (optional)`);
  }
});

console.log('\n🎉 Project structure test completed!');
console.log('\n📋 Next steps:');
console.log('1. Run: cd backend && npm install');
console.log('2. Run: docker-compose up --build');
console.log('3. Test API endpoints at: http://localhost:3000/health');