/**
 * Audit log data-access using DynamoDB.
 *
 * AuditLog table: AccountManagement_AuditLog
 *   PK = ACTOR#<actorId>
 *   SK = <ISO-createdAt>#<randomId>
 */
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomBytes } from 'node:crypto';
import { docClient, AUDIT_TABLE_NAME } from '../db/client.js';

/**
 * Write an audit log entry. Best-effort: errors are caught and logged.
 *
 * @param {{ action: string, actorId?: string, targetId?: string, detail?: string, ip?: string }} data
 */
export async function writeAudit({ action, actorId, targetId, detail, ip }) {
  try {
    const now = new Date().toISOString();
    const randomId = randomBytes(8).toString('hex');
    const actorKey = actorId ?? 'SYSTEM';

    const item = {
      PK: `ACTOR#${actorKey}`,
      SK: `${now}#${randomId}`,
      action,
      createdAt: now,
    };

    if (actorId != null) item.actorId = actorId;
    if (targetId != null) item.targetId = targetId;
    if (detail != null) item.detail = detail;
    if (ip != null) item.ip = ip;

    await docClient.send(
      new PutCommand({
        TableName: AUDIT_TABLE_NAME,
        Item: item,
      }),
    );
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err.message);
  }
}
