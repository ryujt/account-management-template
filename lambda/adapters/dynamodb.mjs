import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-northeast-2',
});

const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const TABLE = () => process.env.DDB_TABLE || 'ums-main';

// --- Low-level helpers ---

export async function getItem(pk, sk) {
  const { Item } = await ddb.send(
    new GetCommand({ TableName: TABLE(), Key: { PK: pk, SK: sk } })
  );
  return Item || null;
}

export async function putItem(item) {
  await ddb.send(new PutCommand({ TableName: TABLE(), Item: item }));
}

export async function updateItem(pk, sk, updates) {
  const expParts = [];
  const names = {};
  const values = {};
  let i = 0;
  for (const [key, value] of Object.entries(updates)) {
    const nameToken = `#f${i}`;
    const valueToken = `:v${i}`;
    expParts.push(`${nameToken} = ${valueToken}`);
    names[nameToken] = key;
    values[valueToken] = value;
    i++;
  }
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE(),
      Key: { PK: pk, SK: sk },
      UpdateExpression: `SET ${expParts.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  );
}

export async function deleteItem(pk, sk) {
  await ddb.send(
    new DeleteCommand({ TableName: TABLE(), Key: { PK: pk, SK: sk } })
  );
}

export async function query(params) {
  const result = await ddb.send(new QueryCommand({ TableName: TABLE(), ...params }));
  return { items: result.Items || [], lastKey: result.LastEvaluatedKey || null };
}

export async function scan(params) {
  const result = await ddb.send(new ScanCommand({ TableName: TABLE(), ...params }));
  return { items: result.Items || [], lastKey: result.LastEvaluatedKey || null };
}

export async function transactWrite(items) {
  await ddb.send(new TransactWriteCommand({ TransactItems: items }));
}

export async function batchDelete(keys) {
  if (keys.length === 0) return;
  const batches = [];
  for (let i = 0; i < keys.length; i += 25) {
    batches.push(keys.slice(i, i + 25));
  }
  for (const batch of batches) {
    await ddb.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE()]: batch.map((key) => ({
            DeleteRequest: { Key: key },
          })),
        },
      })
    );
  }
}

// --- Domain queries ---

export async function getUserByEmail(email) {
  const { items } = await query({
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': `EMAIL#${email.toLowerCase()}` },
    Limit: 1,
  });
  if (items.length === 0) return null;
  const ref = items[0];
  const userId = ref.GSI1SK?.replace('USER#', '') || ref.userId;
  return getItem(`USER#${userId}`, 'PROFILE');
}

export async function getUserRoles(userId) {
  const { items } = await query({
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':sk': 'ROLE#',
    },
  });
  return items.map((item) => item.SK.replace('ROLE#', ''));
}

export async function getUserSessions(userId) {
  const { items } = await query({
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':sk': 'SESSION#',
    },
  });
  return items;
}

export async function getSession(userId, sessionId) {
  return getItem(`USER#${userId}`, `SESSION#${sessionId}`);
}

export async function deleteSession(userId, sessionId) {
  return deleteItem(`USER#${userId}`, `SESSION#${sessionId}`);
}

export async function deleteAllSessions(userId) {
  const sessions = await getUserSessions(userId);
  const keys = sessions.map((s) => ({
    PK: `USER#${userId}`,
    SK: `SESSION#${s.sessionId}`,
  }));
  await batchDelete(keys);
}

export async function writeAuditLog(entry) {
  try {
    const date = new Date().toISOString().split('T')[0];
    const ts = Date.now();
    const id = Math.random().toString(36).substring(2, 10);
    await putItem({
      PK: `AUDIT#${date}`,
      SK: `${ts}#${id}`,
      ...entry,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // Audit writes are best-effort
  }
}
