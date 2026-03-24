/**
 * User data-access functions using DynamoDB single-table design.
 *
 * Table: AccountManagement
 * User PROFILE item:
 *   PK = USER#<userId>, SK = PROFILE
 *   GSI1PK = EMAIL#<email>, GSI1SK = PROFILE
 *   GSI3PK = ROLE#<role>, GSI3SK = USER#<userId>  (one item per role, updated on role changes)
 *   GSI4PK = STATUS#<status>, GSI4SK = <createdAt ISO string>
 */
import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException, TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { docClient, TABLE_NAME } from '../db/client.js';
import { ConflictError } from '../utils/errors.js';

/**
 * Create a new user PROFILE item. Throws ConflictError if email already exists.
 *
 * @param {{ userId: string, email: string, passwordHash: string, displayName: string }} data
 */
export async function createUser({ userId, email, passwordHash, displayName }) {
  const now = new Date().toISOString();
  const item = {
    PK: `USER#${userId}`,
    SK: 'PROFILE',
    userId,
    email,
    passwordHash,
    displayName,
    status: 'active',
    roles: ['member'],
    createdAt: now,
    updatedAt: now,
    // GSI1: lookup by email
    GSI1PK: `EMAIL#${email}`,
    GSI1SK: 'PROFILE',
    // GSI3: lookup by role (only first role; role changes update this)
    GSI3PK: 'ROLE#member',
    GSI3SK: `USER#${userId}`,
    // GSI4: listing by status + createdAt
    GSI4PK: `STATUS#active`,
    GSI4SK: now,
  };

  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TABLE_NAME,
              Item: item,
              ConditionExpression: 'attribute_not_exists(PK)',
            },
          },
          {
            Put: {
              TableName: TABLE_NAME,
              Item: {
                PK: `EMAIL#${email}`,
                SK: 'EMAIL_LOCK',
                userId,
                createdAt: now,
              },
              ConditionExpression: 'attribute_not_exists(PK)',
            },
          },
        ],
      }),
    );
  } catch (err) {
    if (
      err instanceof ConditionalCheckFailedException || err.name === 'ConditionalCheckFailedException' ||
      err instanceof TransactionCanceledException || err.name === 'TransactionCanceledException'
    ) {
      throw new ConflictError('Email already registered');
    }
    throw err;
  }
}

/**
 * Find a user by email using GSI1.
 *
 * @param {string} email
 * @returns {Promise<object|undefined>}
 */
export async function findByEmail(email) {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk AND GSI1SK = :gsi1sk',
      ExpressionAttributeValues: {
        ':gsi1pk': `EMAIL#${email}`,
        ':gsi1sk': 'PROFILE',
      },
      Limit: 1,
    }),
  );

  return result.Items?.[0];
}

/**
 * Find a user by userId (direct GetItem on PK/SK).
 *
 * @param {string} userId
 * @returns {Promise<object|undefined>}
 */
export async function findById(userId) {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
      },
    }),
  );

  return result.Item;
}

/**
 * Update a user's display name.
 *
 * @param {string} userId
 * @param {{ displayName: string }} fields
 */
export async function updateProfile(userId, { displayName }) {
  const now = new Date().toISOString();
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      UpdateExpression: 'SET displayName = :dn, updatedAt = :ua',
      ExpressionAttributeValues: {
        ':dn': displayName,
        ':ua': now,
      },
    }),
  );
}

/**
 * Update a user's password hash.
 *
 * @param {string} userId
 * @param {string} passwordHash
 */
export async function updatePassword(userId, passwordHash) {
  const now = new Date().toISOString();
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      UpdateExpression: 'SET passwordHash = :ph, updatedAt = :ua',
      ExpressionAttributeValues: {
        ':ph': passwordHash,
        ':ua': now,
      },
    }),
  );
}

/**
 * Update a user's status. Also updates GSI4PK to reflect new status.
 *
 * @param {string} userId
 * @param {string} status
 */
export async function updateStatus(userId, status) {
  const now = new Date().toISOString();
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      UpdateExpression: 'SET #st = :st, GSI4PK = :gsi4pk, updatedAt = :ua',
      ExpressionAttributeNames: {
        '#st': 'status',
      },
      ExpressionAttributeValues: {
        ':st': status,
        ':gsi4pk': `STATUS#${status}`,
        ':ua': now,
      },
    }),
  );
}

/**
 * List users with optional filters and cursor-based pagination.
 * Uses GSI4 (status-based) for primary access pattern.
 *
 * @param {{ query?: string, role?: string, status?: string, cursor?: string, limit?: number }} opts
 * @returns {Promise<{ users: object[], nextCursor: string|null }>}
 */
export async function listUsers({ query, role, status, cursor, limit = 20 } = {}) {
  const allStatuses = ['active', 'disabled', 'suspended', 'withdrawn'];
  const targetStatuses = status ? [status] : allStatuses;

  const fetchLimit = limit + 1;
  let collectedUsers = [];
  let lastEvaluatedKey = cursor ? JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) : undefined;
  let currentStatusIndex = 0;

  // If we have a cursor, find which status we were on
  if (lastEvaluatedKey && lastEvaluatedKey._statusIndex !== undefined) {
    currentStatusIndex = lastEvaluatedKey._statusIndex;
    delete lastEvaluatedKey._statusIndex;
    if (Object.keys(lastEvaluatedKey).length === 0) {
      lastEvaluatedKey = undefined;
    }
  }

  // Build filter expression for query/role filters
  let filterExpression;
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  if (query) {
    filterExpression = '(contains(email, :q) OR contains(displayName, :q))';
    expressionAttributeValues[':q'] = query.toLowerCase();
  }

  if (role) {
    const roleFilter = 'contains(#roles, :role)';
    expressionAttributeNames['#roles'] = 'roles';
    expressionAttributeValues[':role'] = role;
    filterExpression = filterExpression
      ? `${filterExpression} AND ${roleFilter}`
      : roleFilter;
  }

  // Scan through statuses collecting items
  while (currentStatusIndex < targetStatuses.length && collectedUsers.length < fetchLimit) {
    const currentStatus = targetStatuses[currentStatusIndex];
    const remaining = fetchLimit - collectedUsers.length;

    const queryParams = {
      TableName: TABLE_NAME,
      IndexName: 'GSI4',
      KeyConditionExpression: 'GSI4PK = :gsi4pk',
      ExpressionAttributeValues: {
        ':gsi4pk': `STATUS#${currentStatus}`,
        ...expressionAttributeValues,
      },
      ScanIndexForward: false, // DESC order by createdAt
      Limit: remaining,
    };

    if (filterExpression) {
      queryParams.FilterExpression = filterExpression;
    }

    if (Object.keys(expressionAttributeNames).length > 0) {
      queryParams.ExpressionAttributeNames = expressionAttributeNames;
    }

    if (lastEvaluatedKey) {
      queryParams.ExclusiveStartKey = lastEvaluatedKey;
      lastEvaluatedKey = undefined;
    }

    const result = await docClient.send(new QueryCommand(queryParams));
    collectedUsers.push(...(result.Items || []));

    if (result.LastEvaluatedKey) {
      // There are more items in this status partition
      const encodedCursor = Buffer.from(
        JSON.stringify({ ...result.LastEvaluatedKey, _statusIndex: currentStatusIndex }),
      ).toString('base64');
      if (collectedUsers.length >= fetchLimit) {
        const users = collectedUsers.slice(0, limit);
        return { users, nextCursor: encodedCursor };
      }
    }

    currentStatusIndex++;
  }

  let nextCursor = null;
  if (collectedUsers.length > limit) {
    collectedUsers = collectedUsers.slice(0, limit);
    // Encode the last included item's key attributes so DynamoDB can resume from it
    const lastItem = collectedUsers[limit - 1];
    nextCursor = Buffer.from(
      JSON.stringify({
        _statusIndex: currentStatusIndex - 1,
        PK: lastItem.PK,
        SK: lastItem.SK,
        GSI4PK: lastItem.GSI4PK,
        GSI4SK: lastItem.GSI4SK,
      }),
    ).toString('base64');
  }

  return { users: collectedUsers, nextCursor };
}
