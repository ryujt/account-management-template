/**
 * Session data-access functions using DynamoDB.
 *
 * Session items:
 *   PK = USER#<userId>, SK = SESSION#<sessionId>
 *   ttl = expiresAt (epoch number) - DynamoDB native TTL
 *   expiresAt = epoch number - manual check (DynamoDB TTL has ~48hr lag)
 */
import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../db/client.js';

/**
 * Create a new session.
 *
 * @param {{ sessionId: string, userId: string, refreshTokenHash: string, ip?: string, ua?: string, expiresAt: number }} data
 */
export async function createSession({ sessionId, userId, refreshTokenHash, ip, ua, expiresAt }) {
  const now = new Date().toISOString();
  const item = {
    PK: `USER#${userId}`,
    SK: `SESSION#${sessionId}`,
    sessionId,
    userId,
    refreshTokenHash,
    createdAt: now,
    expiresAt,
    ttl: expiresAt, // DynamoDB TTL attribute (epoch seconds)
  };

  if (ip != null) item.ip = ip;
  if (ua != null) item.ua = ua;

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }),
  );
}

/**
 * Find a session by userId and sessionId. Returns undefined if not found.
 * Note: userId comes from the parsed refresh token.
 *
 * @param {string} userId
 * @param {string} sessionId
 * @returns {Promise<object|undefined>}
 */
export async function findSession(userId, sessionId) {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `SESSION#${sessionId}`,
      },
    }),
  );

  return result.Item;
}

/**
 * Update the refresh token hash for a session (token rotation).
 *
 * @param {string} userId
 * @param {string} sessionId
 * @param {string} newHash
 */
export async function updateRefreshToken(userId, sessionId, newHash) {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `SESSION#${sessionId}`,
      },
      UpdateExpression: 'SET refreshTokenHash = :hash',
      ExpressionAttributeValues: {
        ':hash': newHash,
      },
    }),
  );
}

/**
 * Delete a specific session.
 *
 * @param {string} userId
 * @param {string} sessionId
 */
export async function deleteSession(userId, sessionId) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `SESSION#${sessionId}`,
      },
    }),
  );
}

/**
 * Delete all sessions for a user.
 * Uses Query to find all SESSION# items, then BatchWriteItem to delete them.
 *
 * @param {string} userId
 */
export async function deleteUserSessions(userId) {
  // Query all sessions for the user (including expired ones not yet TTL-cleaned)
  // Paginate to handle >1MB result sets
  const allItems = [];
  let lastKey;

  do {
    const queryParams = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':prefix': 'SESSION#',
      },
      ProjectionExpression: 'PK, SK',
    };
    if (lastKey) queryParams.ExclusiveStartKey = lastKey;

    const result = await docClient.send(new QueryCommand(queryParams));
    allItems.push(...(result.Items || []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  if (allItems.length === 0) return;

  // BatchWriteItem supports up to 25 items per request
  const { BatchWriteCommand } = await import('@aws-sdk/lib-dynamodb');
  const chunks = [];
  for (let i = 0; i < allItems.length; i += 25) {
    chunks.push(allItems.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    let response = await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: chunk.map((item) => ({
            DeleteRequest: {
              Key: { PK: item.PK, SK: item.SK },
            },
          })),
        },
      }),
    );

    // Retry unprocessed items with exponential backoff
    let unprocessed = response.UnprocessedItems;
    let retries = 0;
    while (unprocessed && Object.keys(unprocessed).length > 0 && retries < 5) {
      await new Promise((r) => setTimeout(r, Math.pow(2, retries) * 100));
      const retry = await docClient.send(new BatchWriteCommand({ RequestItems: unprocessed }));
      unprocessed = retry.UnprocessedItems;
      retries++;
    }
  }
}

/**
 * Get all active (non-expired) sessions for a user.
 * Filters manually because DynamoDB TTL has up to ~48hr lag.
 *
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
export async function getUserSessions(userId) {
  const now = Math.floor(Date.now() / 1000);

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      FilterExpression: 'expiresAt > :now',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':prefix': 'SESSION#',
        ':now': now,
      },
      ScanIndexForward: false, // DESC
    }),
  );

  return result.Items || [];
}
