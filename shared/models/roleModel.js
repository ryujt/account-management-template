/**
 * Role data-access functions.
 * Roles are denormalized into the PROFILE item as a `roles` array.
 * GSI3 is updated when roles change.
 */
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../db/client.js';

/**
 * Get roles for a user.
 *
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function getRoles(userId) {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      ProjectionExpression: '#roles',
      ExpressionAttributeNames: { '#roles': 'roles' },
    }),
  );

  return result.Item?.roles ?? [];
}

/**
 * Add a role to a user. Idempotent - no error if role already present.
 * Uses list_append with deduplication via conditional expression.
 *
 * @param {string} userId
 * @param {string} role
 */
export async function addRole(userId, role) {
  const now = new Date().toISOString();

  // Use a SET expression with if_not_exists and list_append to add only if not present.
  // DynamoDB doesn't natively deduplicate lists, so we use a conditional update.
  // Strategy: try to add with condition that role is NOT already in the list.
  // If it fails, that means the role is already there (idempotent).
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
        UpdateExpression:
          'SET #roles = list_append(if_not_exists(#roles, :empty), :newRole), updatedAt = :ua, GSI3PK = :gsi3pk, GSI3SK = :gsi3sk',
        ConditionExpression: 'attribute_exists(PK) AND NOT contains(#roles, :roleVal)',
        ExpressionAttributeNames: {
          '#roles': 'roles',
        },
        ExpressionAttributeValues: {
          ':empty': [],
          ':newRole': [role],
          ':roleVal': role,
          ':ua': now,
          ':gsi3pk': `ROLE#${role}`,
          ':gsi3sk': `USER#${userId}`,
        },
      }),
    );
  } catch (err) {
    // ConditionalCheckFailedException means role already exists - that's fine (idempotent)
    if (err.name !== 'ConditionalCheckFailedException') {
      throw err;
    }
  }
}

/**
 * Remove a role from a user.
 * DynamoDB doesn't support removing list items by value directly,
 * so we fetch the current roles, filter, and replace.
 *
 * @param {string} userId
 * @param {string} role
 */
export async function removeRole(userId, role) {
  const now = new Date().toISOString();

  // Fetch current roles
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      ProjectionExpression: '#roles',
      ExpressionAttributeNames: { '#roles': 'roles' },
    }),
  );

  const currentRoles = result.Item?.roles ?? [];
  const newRoles = currentRoles.filter((r) => r !== role);

  if (newRoles.length === currentRoles.length) {
    // Role wasn't present, nothing to do
    return;
  }

  // Determine the primary GSI3 role (first in list, or empty if no roles remain)
  const primaryRole = newRoles[0];

  const updateExpr = primaryRole
    ? 'SET #roles = :newRoles, updatedAt = :ua, GSI3PK = :gsi3pk, GSI3SK = :gsi3sk'
    : 'SET #roles = :newRoles, updatedAt = :ua REMOVE GSI3PK, GSI3SK';

  const exprValues = {
    ':newRoles': newRoles,
    ':ua': now,
  };

  if (primaryRole) {
    exprValues[':gsi3pk'] = `ROLE#${primaryRole}`;
    exprValues[':gsi3sk'] = `USER#${userId}`;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      UpdateExpression: updateExpr,
      ExpressionAttributeNames: { '#roles': 'roles' },
      ExpressionAttributeValues: exprValues,
    }),
  );
}

/**
 * Get all user IDs that hold a given role using GSI3.
 *
 * @param {string} role
 * @returns {Promise<string[]>}
 */
export async function getUsersByRole(role) {
  const { QueryCommand } = await import('@aws-sdk/lib-dynamodb');
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI3',
      KeyConditionExpression: 'GSI3PK = :gsi3pk',
      ExpressionAttributeValues: {
        ':gsi3pk': `ROLE#${role}`,
      },
    }),
  );

  return (result.Items || []).map((item) => {
    // GSI3SK = USER#<userId>
    return item.GSI3SK?.replace('USER#', '') ?? item.userId;
  });
}
