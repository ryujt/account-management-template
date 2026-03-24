/**
 * Mock DynamoDB DocumentClient for unit tests.
 *
 * Provides an in-memory DynamoDB simulation that handles:
 * - PutCommand (with condition attribute_not_exists)
 * - GetCommand
 * - UpdateCommand (parses basic SET/REMOVE expressions)
 * - DeleteCommand
 * - QueryCommand (handles PK queries, begins_with SK, FilterExpression basics, GSI queries)
 * - BatchWriteCommand (DeleteRequest)
 */

export class ConditionalCheckFailedException extends Error {
  constructor() {
    super('The conditional request failed');
    this.name = 'ConditionalCheckFailedException';
  }
}

export class TransactionCanceledException extends Error {
  constructor(reasons = []) {
    super('Transaction cancelled');
    this.name = 'TransactionCanceledException';
    this.CancellationReasons = reasons;
  }
}

export class MockDocumentClient {
  constructor() {
    /** @type {Map<string, Map<string, object>>} tableName -> (pk|sk -> item) */
    this.tables = new Map();
  }

  _getTable(name) {
    if (!this.tables.has(name)) {
      this.tables.set(name, new Map());
    }
    return this.tables.get(name);
  }

  _itemKey(pk, sk) {
    return `${pk}\x00${sk}`;
  }

  clear() {
    this.tables.clear();
  }

  async send(command) {
    const name = command.constructor.name;

    switch (name) {
      case 'PutCommand':
        return this._put(command.input);
      case 'GetCommand':
        return this._get(command.input);
      case 'UpdateCommand':
        return this._update(command.input);
      case 'DeleteCommand':
        return this._delete(command.input);
      case 'QueryCommand':
        return this._query(command.input);
      case 'BatchWriteCommand':
        return this._batchWrite(command.input);
      case 'TransactWriteCommand':
        return this._transactWrite(command.input);
      default:
        throw new Error(`MockDocumentClient: unsupported command ${name}`);
    }
  }

  _put(input) {
    const table = this._getTable(input.TableName);
    const { PK, SK } = input.Item;
    const key = this._itemKey(PK, SK);

    if (input.ConditionExpression) {
      const expr = input.ConditionExpression;
      if (expr.includes('attribute_not_exists')) {
        // Check uniqueness by GSI1PK (email uniqueness)
        if (expr.includes('GSI1PK') && input.Item.GSI1PK) {
          const gsi1pk = input.Item.GSI1PK;
          for (const [, item] of table) {
            if (item.GSI1PK === gsi1pk && item.SK === 'PROFILE') {
              throw new ConditionalCheckFailedException();
            }
          }
        } else if (expr.includes('PK')) {
          if (table.has(key)) {
            throw new ConditionalCheckFailedException();
          }
        }
      } else if (expr.includes('attribute_exists(PK)') && expr.includes('NOT contains')) {
        // addRole conditional: item must exist and NOT already contain the role
        if (!table.has(key)) {
          throw new ConditionalCheckFailedException();
        }
        const existing = table.get(key);
        const roleVal = input.ExpressionAttributeValues?.[':roleVal'];
        if (roleVal && existing.roles && existing.roles.includes(roleVal)) {
          throw new ConditionalCheckFailedException();
        }
      }
    }

    table.set(key, { ...input.Item });
    return {};
  }

  _get(input) {
    const table = this._getTable(input.TableName);
    const { PK, SK } = input.Key;
    const key = this._itemKey(PK, SK);
    const item = table.get(key);
    return { Item: item ? { ...item } : undefined };
  }

  _update(input) {
    const table = this._getTable(input.TableName);
    const { PK, SK } = input.Key;
    const key = this._itemKey(PK, SK);
    const existing = table.get(key) || {};

    // Check ConditionExpression before applying the update
    if (input.ConditionExpression) {
      const condExpr = input.ConditionExpression;
      const condAttrValues = input.ExpressionAttributeValues || {};
      const condAttrNames = input.ExpressionAttributeNames || {};
      const resolveCondName = (name) => condAttrNames[name] || name;

      if (condExpr.includes('attribute_exists(PK)') && condExpr.includes('NOT contains')) {
        // addRole condition: item must exist AND NOT already contain the role
        if (!table.has(key)) {
          throw new ConditionalCheckFailedException();
        }
        const roleVal = condAttrValues[':roleVal'];
        if (roleVal && existing.roles && existing.roles.includes(roleVal)) {
          throw new ConditionalCheckFailedException();
        }
      }
    }

    const updated = { ...existing };
    const expr = input.UpdateExpression || '';
    const attrNames = input.ExpressionAttributeNames || {};
    const attrValues = input.ExpressionAttributeValues || {};

    const resolveAttrName = (name) => attrNames[name] || name;

    // Split expression into SET and REMOVE parts
    // e.g. "SET a = :a, b = :b REMOVE c, d"  or  "SET ... SET ..." (shouldn't happen)
    const setMatch = expr.match(/SET\s+(.*?)(?:\s+REMOVE\s+|$)/is);
    const removeMatch = expr.match(/REMOVE\s+([\s\S]+)$/i);

    if (setMatch) {
      // Parse SET assignments carefully - handle nested parentheses (list_append)
      const setPart = setMatch[1];
      const assignments = this._splitSetAssignments(setPart);

      for (const assignment of assignments) {
        const eqIdx = assignment.indexOf('=');
        if (eqIdx === -1) continue;
        const rawName = assignment.slice(0, eqIdx).trim();
        const rawVal = assignment.slice(eqIdx + 1).trim();
        const fieldName = resolveAttrName(rawName);

        if (rawVal.startsWith('list_append(')) {
          // list_append(if_not_exists(#roles, :empty), :newRole) or list_append(:a, :b)
          const innerMatch = rawVal.match(/list_append\(\s*if_not_exists\(\s*([^,]+)\s*,\s*([^)]+)\s*\)\s*,\s*([^)]+)\s*\)/);
          if (innerMatch) {
            const existingFieldName = resolveAttrName(innerMatch[1].trim());
            const emptyVal = attrValues[innerMatch[2].trim()] ?? [];
            const newItems = attrValues[innerMatch[3].trim()] ?? [];
            const currentList = updated[existingFieldName] || emptyVal;
            updated[existingFieldName] = [...currentList, ...newItems];
          } else {
            const simpleMatch = rawVal.match(/list_append\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/);
            if (simpleMatch) {
              const list1 = attrValues[simpleMatch[1].trim()] || updated[resolveAttrName(simpleMatch[1].trim())] || [];
              const list2 = attrValues[simpleMatch[2].trim()] || [];
              updated[fieldName] = [...list1, ...list2];
            }
          }
        } else if (rawVal.startsWith('if_not_exists(')) {
          const ineMatch = rawVal.match(/if_not_exists\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/);
          if (ineMatch) {
            const existingField = resolveAttrName(ineMatch[1].trim());
            const defaultVal = attrValues[ineMatch[2].trim()];
            updated[fieldName] = updated[existingField] !== undefined ? updated[existingField] : defaultVal;
          }
        } else if (rawVal.startsWith(':')) {
          updated[fieldName] = attrValues[rawVal];
        }
        // else: complex expression - skip
      }
    }

    if (removeMatch) {
      const removeParts = removeMatch[1].split(',').map((p) => p.trim());
      for (const part of removeParts) {
        const fieldName = resolveAttrName(part);
        delete updated[fieldName];
      }
    }

    table.set(key, updated);
    return { Attributes: updated };
  }

  /**
   * Split SET expression into individual assignments, respecting parentheses nesting.
   */
  _splitSetAssignments(setStr) {
    const assignments = [];
    let depth = 0;
    let start = 0;

    for (let i = 0; i < setStr.length; i++) {
      if (setStr[i] === '(') depth++;
      else if (setStr[i] === ')') depth--;
      else if (setStr[i] === ',' && depth === 0) {
        assignments.push(setStr.slice(start, i).trim());
        start = i + 1;
      }
    }
    if (start < setStr.length) {
      assignments.push(setStr.slice(start).trim());
    }
    return assignments;
  }

  _delete(input) {
    const table = this._getTable(input.TableName);
    const { PK, SK } = input.Key;
    table.delete(this._itemKey(PK, SK));
    return {};
  }

  _query(input) {
    const table = this._getTable(input.TableName);
    const attrValues = input.ExpressionAttributeValues || {};
    const attrNames = input.ExpressionAttributeNames || {};

    const resolveAttrName = (name) => attrNames[name] || name;

    let items = [];

    if (input.IndexName) {
      // GSI query: find by GSI PK attribute
      const keyExpr = input.KeyConditionExpression || '';
      // Extract first key condition: "GSI1PK = :val"
      const gsiPkMatch = keyExpr.match(/^(\w+)\s*=\s*(:[\w]+)/);
      if (gsiPkMatch) {
        const gsiPkAttr = gsiPkMatch[1];
        const gsiPkVal = attrValues[gsiPkMatch[2]];

        for (const [, item] of table) {
          if (item[gsiPkAttr] === gsiPkVal) {
            items.push({ ...item });
          }
        }
      }
    } else {
      // Primary key query
      const keyExpr = input.KeyConditionExpression || '';
      const pkMatch = keyExpr.match(/PK\s*=\s*(:[\w]+)/);
      const pkVal = pkMatch ? attrValues[pkMatch[1]] : null;

      const bwMatch = keyExpr.match(/begins_with\s*\(\s*SK\s*,\s*(:[\w]+)\s*\)/);
      const skPrefix = bwMatch ? attrValues[bwMatch[1]] : null;

      for (const [, item] of table) {
        if (pkVal && item.PK !== pkVal) continue;
        if (skPrefix && !item.SK.startsWith(skPrefix)) continue;
        items.push({ ...item });
      }
    }

    // Apply FilterExpression
    if (input.FilterExpression) {
      items = items.filter((item) =>
        this._applyFilter(item, input.FilterExpression, attrValues, attrNames),
      );
    }

    // Sort by SK or GSI4SK
    if (input.ScanIndexForward === false) {
      items.sort((a, b) => {
        const av = a.SK || a.GSI4SK || a.createdAt || '';
        const bv = b.SK || b.GSI4SK || b.createdAt || '';
        return bv.localeCompare(av);
      });
    } else {
      items.sort((a, b) => {
        const av = a.SK || a.GSI4SK || a.createdAt || '';
        const bv = b.SK || b.GSI4SK || b.createdAt || '';
        return av.localeCompare(bv);
      });
    }

    // Pagination
    let startIndex = 0;
    if (input.ExclusiveStartKey) {
      const esk = input.ExclusiveStartKey;
      const idx = items.findIndex((item) => item.PK === esk.PK && item.SK === esk.SK);
      startIndex = idx !== -1 ? idx + 1 : 0;
    }

    const sliced = items.slice(startIndex);
    const limit = input.Limit;
    const result = limit ? sliced.slice(0, limit) : sliced;
    const hasMore = limit ? sliced.length > limit : false;

    return {
      Items: result,
      LastEvaluatedKey: hasMore
        ? { PK: result[result.length - 1].PK, SK: result[result.length - 1].SK }
        : undefined,
      Count: result.length,
    };
  }

  _applyFilter(item, filterExpr, attrValues, attrNames) {
    const resolveAttrName = (name) => (attrNames[name] || name).trim();

    // Tokenize: handle "(A OR B) AND C" type patterns
    // We'll do a simple recursive evaluation
    return this._evalFilter(item, filterExpr.trim(), attrValues, attrNames);
  }

  _evalFilter(item, expr, attrValues, attrNames) {
    const resolveAttrName = (name) => (attrNames[name.trim()] || name.trim());

    expr = expr.trim();

    // Strip outer parens if they wrap the whole expression
    if (expr.startsWith('(') && this._matchingParen(expr, 0) === expr.length - 1) {
      return this._evalFilter(item, expr.slice(1, -1), attrValues, attrNames);
    }

    // Split on top-level AND/OR
    const andIdx = this._findTopLevelOperator(expr, ' AND ');
    if (andIdx !== -1) {
      const left = expr.slice(0, andIdx);
      const right = expr.slice(andIdx + 5);
      return this._evalFilter(item, left, attrValues, attrNames) &&
             this._evalFilter(item, right, attrValues, attrNames);
    }

    const orIdx = this._findTopLevelOperator(expr, ' OR ');
    if (orIdx !== -1) {
      const left = expr.slice(0, orIdx);
      const right = expr.slice(orIdx + 4);
      return this._evalFilter(item, left, attrValues, attrNames) ||
             this._evalFilter(item, right, attrValues, attrNames);
    }

    // contains(field, :val)
    const containsMatch = expr.match(/^contains\(\s*([^,]+)\s*,\s*(:[\w]+)\s*\)$/);
    if (containsMatch) {
      const field = resolveAttrName(containsMatch[1]);
      const val = attrValues[containsMatch[2]];
      const itemVal = item[field];
      if (itemVal === undefined) return false;
      if (Array.isArray(itemVal)) return itemVal.includes(val);
      if (typeof itemVal === 'string' && typeof val === 'string') {
        return itemVal.toLowerCase().includes(val.toLowerCase());
      }
      return false;
    }

    // field > :val
    const gtMatch = expr.match(/^(\w+)\s*>\s*(:[\w]+)$/);
    if (gtMatch) {
      const field = resolveAttrName(gtMatch[1]);
      const val = attrValues[gtMatch[2]];
      return item[field] !== undefined && item[field] > val;
    }

    // field = :val
    const eqMatch = expr.match(/^(\w+)\s*=\s*(:[\w]+)$/);
    if (eqMatch) {
      const field = resolveAttrName(eqMatch[1]);
      const val = attrValues[eqMatch[2]];
      return item[field] === val;
    }

    // Default: pass through (unknown expression)
    return true;
  }

  _matchingParen(str, openIdx) {
    let depth = 0;
    for (let i = openIdx; i < str.length; i++) {
      if (str[i] === '(') depth++;
      else if (str[i] === ')') {
        depth--;
        if (depth === 0) return i;
      }
    }
    return -1;
  }

  _findTopLevelOperator(expr, op) {
    let depth = 0;
    for (let i = 0; i <= expr.length - op.length; i++) {
      if (expr[i] === '(') depth++;
      else if (expr[i] === ')') depth--;
      else if (depth === 0 && expr.slice(i, i + op.length) === op) {
        return i;
      }
    }
    return -1;
  }

  _transactWrite(input) {
    const transactItems = input.TransactItems || [];

    // Phase 1: validate all conditions before writing anything
    for (const txItem of transactItems) {
      if (txItem.Put) {
        const { TableName, Item, ConditionExpression } = txItem.Put;
        const table = this._getTable(TableName);
        const key = this._itemKey(Item.PK, Item.SK);

        if (ConditionExpression && ConditionExpression.includes('attribute_not_exists(PK)')) {
          if (table.has(key)) {
            throw new TransactionCanceledException([{ Code: 'ConditionalCheckFailed' }]);
          }
        }
      }
    }

    // Phase 2: apply all writes
    for (const txItem of transactItems) {
      if (txItem.Put) {
        const { TableName, Item } = txItem.Put;
        const table = this._getTable(TableName);
        const key = this._itemKey(Item.PK, Item.SK);
        table.set(key, { ...Item });
      }
    }

    return {};
  }

  _batchWrite(input) {
    const requestItems = input.RequestItems || {};
    for (const [tableName, requests] of Object.entries(requestItems)) {
      const table = this._getTable(tableName);
      for (const req of requests) {
        if (req.DeleteRequest) {
          const { PK, SK } = req.DeleteRequest.Key;
          table.delete(this._itemKey(PK, SK));
        } else if (req.PutRequest) {
          const itm = req.PutRequest.Item;
          table.set(this._itemKey(itm.PK, itm.SK), { ...itm });
        }
      }
    }
    return { UnprocessedItems: {} };
  }
}

/**
 * Shared mock client instance.
 */
export const mockDocClient = new MockDocumentClient();
