import * as cdk from '@aws-cdk/core';
import { Table, AttributeType } from "@aws-cdk/aws-dynamodb";
import * as lambda from "@aws-cdk/aws-lambda";
import {IResource, LambdaIntegration, MockIntegration, PassthroughBehavior, RestApi} from "@aws-cdk/aws-apigateway";
import {AssetCode, Runtime} from "@aws-cdk/aws-lambda";

//Defines the sample project service stack
export class SampleProjectStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const dynamoItemsTable = new Table(this, "items", {
      partitionKey: {
        name: "itemId",
        type: AttributeType.STRING,
      },
      tableName: "items",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const getItemLambda = new lambda.Function(this, "getOneItemFunction", {
      code: new AssetCode("lib/lambda"),
      handler: "get-item.handler",
      runtime: Runtime.NODEJS_10_X,
      environment: {
        TABLE_NAME: dynamoItemsTable.tableName,
        PRIMARY_KEY: "itemId",
      },
    });

    // Giving DynamoDB Table Read permission to Lambda
    dynamoItemsTable.grantReadData(getItemLambda);

    // ApiGateway
    const api = new RestApi(this, "sampleApi", {
      restApiName: "Sample API",
    });
    const items = api.root.addResource("items");

    const singleItem = items.addResource("{id}");
    const getItemIntegration = new LambdaIntegration(getItemLambda);
    singleItem.addMethod("GET", getItemIntegration);
    addCorsOptions(items);
  }
}

export function addCorsOptions(apiResource: IResource) {
  apiResource.addMethod(
      "OPTIONS",
      new MockIntegration({
        integrationResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Headers":
                  "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
              "method.response.header.Access-Control-Allow-Origin": "'*'",
              "method.response.header.Access-Control-Allow-Credentials":
                  "'false'",
              "method.response.header.Access-Control-Allow-Methods":
                  "'OPTIONS,GET,PUT,POST,DELETE'",
            },
          },
        ],
        passthroughBehavior: PassthroughBehavior.NEVER,
        requestTemplates: {
          "application/json": '{"statusCode": 200}',
        },
      }),
      {
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Headers": true,
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Allow-Credentials": true,
              "method.response.header.Access-Control-Allow-Origin": true,
            },
          },
        ],
      }
  );
}

const app = new cdk.App();
new SampleProjectStack(app, "SampleProjectStack");
app.synth();
