const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const config = require('../config/config');

const client = new DynamoDBClient({
  region: config.dynamodb.region
});

const docClient = DynamoDBDocumentClient.from(client);

class DynamoDBAdapter {
  constructor() {
    this.tableName = config.dynamodb.table;
  }

  async put(item) {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: item
    });
    return await docClient.send(command);
  }

  async get(pk, sk) {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { PK: pk, SK: sk }
    });
    const result = await docClient.send(command);
    return result.Item;
  }

  async query(params) {
    const command = new QueryCommand({
      TableName: this.tableName,
      ...params
    });
    const result = await docClient.send(command);
    return {
      items: result.Items || [],
      lastEvaluatedKey: result.LastEvaluatedKey
    };
  }

  async queryGSI(indexName, params) {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: indexName,
      ...params
    });
    const result = await docClient.send(command);
    return {
      items: result.Items || [],
      lastEvaluatedKey: result.LastEvaluatedKey
    };
  }

  async update(pk, sk, updateExpression, expressionAttributeNames, expressionAttributeValues) {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { PK: pk, SK: sk },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });
    const result = await docClient.send(command);
    return result.Attributes;
  }

  async delete(pk, sk) {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: { PK: pk, SK: sk }
    });
    return await docClient.send(command);
  }

  async batchWrite(requests) {
    const chunks = [];
    for (let i = 0; i < requests.length; i += 25) {
      chunks.push(requests.slice(i, i + 25));
    }

    const results = [];
    for (const chunk of chunks) {
      const command = new BatchWriteCommand({
        RequestItems: {
          [this.tableName]: chunk
        }
      });
      results.push(await docClient.send(command));
    }
    return results;
  }
}

module.exports = new DynamoDBAdapter();