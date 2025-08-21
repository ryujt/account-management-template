const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../src/config/config');

/**
 * Database initialization script
 * This script creates the database and initializes tables
 */
async function initializeDatabase() {
  let connection;
  
  try {
    console.log('Starting database initialization...');
    
    // Create connection without specifying database
    connection = await mysql.createConnection({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      charset: config.db.charset
    });

    console.log('Connected to MySQL server');

    // Create database if it doesn't exist
    const createDbQuery = `CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;
    await connection.execute(createDbQuery);
    console.log(`Database '${config.db.database}' created or already exists`);

    // Select the database
    await connection.execute(`USE \`${config.db.database}\``);
    console.log(`Using database '${config.db.database}'`);

    // Read and execute the initialization SQL file
    const sqlFilePath = path.join(__dirname, 'init.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Split SQL content by semicolon and execute each statement
    const statements = sqlContent.split(';').filter(statement => statement.trim().length > 0);

    console.log(`Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          await connection.execute(statement);
          console.log(`✓ Statement ${i + 1}/${statements.length} executed successfully`);
        } catch (error) {
          // Skip errors for statements that might fail on re-run (like CREATE TABLE IF NOT EXISTS)
          if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_KEYNAME') {
            console.log(`⚠ Statement ${i + 1}/${statements.length} skipped (already exists)`);
          } else {
            console.error(`✗ Error executing statement ${i + 1}:`, error.message);
            console.error('Statement:', statement.substring(0, 100) + '...');
          }
        }
      }
    }

    // Verify tables were created
    console.log('\nVerifying table creation...');
    const [tables] = await connection.execute('SHOW TABLES');
    
    const expectedTables = ['users', 'roles', 'user_roles', 'sessions', 'email_verifications', 'password_resets'];
    const createdTables = tables.map(row => Object.values(row)[0]);

    for (const table of expectedTables) {
      if (createdTables.includes(table)) {
        console.log(`✓ Table '${table}' exists`);
      } else {
        console.error(`✗ Table '${table}' is missing`);
      }
    }

    // Check if roles have been inserted
    const [roleCount] = await connection.execute('SELECT COUNT(*) as count FROM roles');
    console.log(`\n📊 Database statistics:`);
    console.log(`   Roles: ${roleCount[0].count}`);

    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`   Users: ${userCount[0].count}`);

    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Set up your environment variables (.env file)');
    console.log('2. Run the server: npm start or npm run dev');
    console.log('3. The server will automatically create an admin user if configured');

    return true;

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Check your database credentials in the .env file');
      console.error('   - Ensure MySQL server is running');
      console.error('   - Verify the database user has necessary permissions');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Ensure MySQL server is running');
      console.error('   - Check the database host and port settings');
    } else if (error.code === 'ENOTFOUND') {
      console.error('\n💡 Troubleshooting:');
      console.error('   - Check the database host setting');
      console.error('   - Ensure you can reach the database server');
    }

    throw error;

  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Initialization failed:', error.message);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };