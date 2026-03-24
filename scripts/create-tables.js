/**
 * create-tables.js
 *
 * Creates DynamoDB tables (AccountManagement and AccountManagement_AuditLog)
 * against DynamoDB Local. Table definitions mirror template.yaml exactly.
 *
 * Usage:
 *   node scripts/create-tables.js
 *
 * Environment variables:
 *   DYNAMODB_ENDPOINT  - DynamoDB Local endpoint (default: http://localhost:8000)
 *   AWS_REGION         - AWS region (default: us-east-1)
 */

import { DynamoDBClient, CreateTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';

const ENDPOINT = process.env.DYNAMODB_ENDPOINT ?? 'http://localhost:8000';
const REGION = process.env.AWS_REGION ?? 'us-east-1';

const client = new DynamoDBClient({
  endpoint: ENDPOINT,
  region: REGION,
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  },
});

const MAIN_TABLE = {
  TableName: 'AccountManagement',
  BillingMode: 'PAY_PER_REQUEST',
  AttributeDefinitions: [
    { AttributeName: 'PK', AttributeType: 'S' },
    { AttributeName: 'SK', AttributeType: 'S' },
    { AttributeName: 'GSI1PK', AttributeType: 'S' },
    { AttributeName: 'GSI1SK', AttributeType: 'S' },
    { AttributeName: 'GSI3PK', AttributeType: 'S' },
    { AttributeName: 'GSI3SK', AttributeType: 'S' },
    { AttributeName: 'GSI4PK', AttributeType: 'S' },
    { AttributeName: 'GSI4SK', AttributeType: 'S' },
  ],
  KeySchema: [
    { AttributeName: 'PK', KeyType: 'HASH' },
    { AttributeName: 'SK', KeyType: 'RANGE' },
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'GSI1',
      KeySchema: [
        { AttributeName: 'GSI1PK', KeyType: 'HASH' },
        { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
      ],
      Projection: { ProjectionType: 'ALL' },
    },
    {
      IndexName: 'GSI3',
      KeySchema: [
        { AttributeName: 'GSI3PK', KeyType: 'HASH' },
        { AttributeName: 'GSI3SK', KeyType: 'RANGE' },
      ],
      Projection: { ProjectionType: 'ALL' },
    },
    {
      IndexName: 'GSI4',
      KeySchema: [
        { AttributeName: 'GSI4PK', KeyType: 'HASH' },
        { AttributeName: 'GSI4SK', KeyType: 'RANGE' },
      ],
      Projection: { ProjectionType: 'ALL' },
    },
  ],
};

const AUDIT_TABLE = {
  TableName: 'AccountManagement_AuditLog',
  BillingMode: 'PAY_PER_REQUEST',
  AttributeDefinitions: [
    { AttributeName: 'PK', AttributeType: 'S' },
    { AttributeName: 'SK', AttributeType: 'S' },
  ],
  KeySchema: [
    { AttributeName: 'PK', KeyType: 'HASH' },
    { AttributeName: 'SK', KeyType: 'RANGE' },
  ],
};

async function tableExists(tableName) {
  try {
    const res = await client.send(new ListTablesCommand({}));
    return res.TableNames?.includes(tableName) ?? false;
  } catch {
    return false;
  }
}

async function createTable(tableDefinition) {
  const { TableName } = tableDefinition;

  if (await tableExists(TableName)) {
    console.log(`  Table "${TableName}" already exists, skipping.`);
    return;
  }

  await client.send(new CreateTableCommand(tableDefinition));
  console.log(`  Created table "${TableName}".`);
}

async function main() {
  console.log(`Connecting to DynamoDB at ${ENDPOINT} ...`);

  // Retry up to 10 times in case DynamoDB Local is still starting
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      await client.send(new ListTablesCommand({}));
      break;
    } catch (err) {
      if (attempt === 10) {
        console.error('Could not connect to DynamoDB Local after 10 attempts.');
        process.exit(1);
      }
      console.log(`  DynamoDB not ready (attempt ${attempt}/10), retrying in 2s...`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log('Creating tables...');
  await createTable(MAIN_TABLE);
  await createTable(AUDIT_TABLE);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
