// Simple test script to verify the project setup
const fs = require('fs');
const path = require('path');

console.log('🧪 Backend Project Structure Test\n');

// Check if all required files exist
const requiredFiles = [
  'package.json',
  'src/server.js',
  'src/config/config.js',
  'src/config/database.js',
  'src/models/User.js',
  'src/models/Session.js',
  'src/models/Invite.js',
  'src/models/AuditLog.js',
  'src/models/index.js',
  'src/services/authService.js',
  'src/services/userService.js',
  'src/services/adminService.js',
  'src/adapters/database.js',
  'src/adapters/email.js',
  'src/routes/authRoutes.js',
  'src/routes/userRoutes.js',
  'src/routes/adminRoutes.js',
  'src/middleware/auth.js',
  'src/middleware/errorHandler.js',
  'src/middleware/validation.js',
  'src/utils/errors.js',
  'src/utils/helpers.js',
  'database/init.sql',
  'Dockerfile',
  '.env'
];

console.log('📁 Checking required files:');
let missingFiles = 0;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    missingFiles++;
  }
});

// Check package.json dependencies
console.log('\n📦 Checking dependencies:');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = [
    'express',
    'mysql2',
    'sequelize',
    'bcryptjs',
    'jsonwebtoken',
    'express-validator',
    'cors',
    'helmet',
    'cookie-parser',
    'dotenv'
  ];

  let missingDeps = 0;
  requiredDeps.forEach(dep => {
    if (pkg.dependencies && pkg.dependencies[dep]) {
      console.log(`✅ ${dep}: ${pkg.dependencies[dep]}`);
    } else {
      console.log(`❌ ${dep} - MISSING`);
      missingDeps++;
    }
  });

  if (missingDeps === 0) {
    console.log('\n✅ All required dependencies are present');
  } else {
    console.log(`\n❌ ${missingDeps} dependencies are missing`);
  }
} catch (error) {
  console.log(`❌ Error reading package.json: ${error.message}`);
}

// Test basic Node.js syntax of main files
console.log('\n🔍 Testing file syntax:');
const filesToTest = [
  'src/server.js',
  'src/config/config.js',
  'src/models/User.js',
  'src/services/authService.js'
];

let syntaxErrors = 0;
filesToTest.forEach(file => {
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      // Basic syntax check - just try to parse it as JavaScript
      new Function(content);
      console.log(`✅ ${file} - Syntax OK`);
    }
  } catch (error) {
    console.log(`❌ ${file} - Syntax Error: ${error.message}`);
    syntaxErrors++;
  }
});

// Summary
console.log('\n📊 Test Summary:');
console.log(`Files checked: ${requiredFiles.length}`);
console.log(`Missing files: ${missingFiles}`);
console.log(`Syntax errors: ${syntaxErrors}`);

if (missingFiles === 0 && syntaxErrors === 0) {
  console.log('\n🎉 All tests passed! Project structure is ready.');
  console.log('\nNext steps:');
  console.log('1. Install dependencies: npm install');
  console.log('2. Set up MySQL database');
  console.log('3. Configure environment variables in .env');
  console.log('4. Run with: npm start');
  console.log('5. Or use Docker: docker-compose up --build');
} else {
  console.log('\n⚠️  Some issues found. Please fix them before proceeding.');
}