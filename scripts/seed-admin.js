/**
 * seed-admin.js
 *
 * Seeds an initial admin user into DynamoDB Local for development/testing.
 *
 * Seeded user:
 *   email:       admin@example.com
 *   password:    admin1234
 *   displayName: Admin
 *   roles:       ["member", "admin"]
 *
 * Usage:
 *   node scripts/seed-admin.js
 *
 * Environment variables:
 *   DYNAMODB_ENDPOINT  - DynamoDB endpoint (default: http://localhost:8000)
 *   TABLE_NAME         - Main table name (default: AccountManagement)
 *   AUDIT_TABLE_NAME   - Audit table name (default: AccountManagement_AuditLog)
 */

// Set env vars BEFORE dynamic imports so shared/db/client.js sees them
process.env.DYNAMODB_ENDPOINT ??= 'http://localhost:8000';
process.env.TABLE_NAME ??= 'AccountManagement';
process.env.AUDIT_TABLE_NAME ??= 'AccountManagement_AuditLog';
process.env.NODE_ENV ??= 'development';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin1234';
const ADMIN_DISPLAY_NAME = 'Admin';

async function main() {
  // Dynamic imports so env vars are set before shared/db/client.js initializes
  const userModel = await import('../shared/models/userModel.js');
  const roleModel = await import('../shared/models/roleModel.js');
  const { hashPassword } = await import('../shared/utils/password.js');
  const { generateUserId } = await import('../shared/utils/id.js');
  console.log(`Seeding admin user to ${process.env.DYNAMODB_ENDPOINT} / ${process.env.TABLE_NAME} ...`);

  const existing = await userModel.findByEmail(ADMIN_EMAIL);
  if (existing) {
    const roles = existing.roles ?? [];
    if (!roles.includes('admin')) {
      await roleModel.addRole(existing.userId, 'admin');
      console.log(`User "${ADMIN_EMAIL}" already exists. Added admin role.`);
    } else {
      console.log(`User "${ADMIN_EMAIL}" already exists with admin role. Nothing to do.`);
    }
    return;
  }

  const userId = generateUserId();
  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  // createUser creates the PROFILE item with roles: ['member'] embedded
  await userModel.createUser({
    userId,
    email: ADMIN_EMAIL,
    passwordHash,
    displayName: ADMIN_DISPLAY_NAME,
  });

  // Add admin role (roleModel.addRole updates the PROFILE item's roles array)
  await roleModel.addRole(userId, 'admin');

  console.log('Seeded admin user:');
  console.log(`  email:    ${ADMIN_EMAIL}`);
  console.log(`  password: ${ADMIN_PASSWORD}`);
  console.log(`  userId:   ${userId}`);
  console.log(`  roles:    member, admin`);
}

main().catch((err) => {
  console.error('Failed to seed admin user:', err);
  process.exit(1);
});
