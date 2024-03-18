#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { DatabaseStack } from "../stacks/database-stack";
import { S3Stack } from "../stacks/s3-stack";
import { LambdaStack } from "../stacks/lambda-stack";

const app = new cdk.App();
const databaseStack = new DatabaseStack(app, "DatabaseStack");
const lambdaStack = new LambdaStack(app, "LambdaStack", {
  usersTable: databaseStack.usersTable,
});
const s3Stack = new S3Stack(app, "S3Stack", {
  putEventLambda: lambdaStack.putEventLambda,
});
