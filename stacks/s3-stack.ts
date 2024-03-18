import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Bucket, EventType } from "aws-cdk-lib/aws-s3";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

interface S3StackProps extends cdk.StackProps {
  putEventLambda: NodejsFunction;
}

export class S3Stack extends cdk.Stack {
  public readonly imageBucket: Bucket;
  constructor(scope: Construct, id: string, props: S3StackProps) {
    super(scope, id, props);
    this.imageBucket = new Bucket(this, "RetinalBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      bucketName: "s3-retinalbucket-dev2024",
    });

    const s3PutEventSource = new cdk.aws_lambda_event_sources.S3EventSource(
      this.imageBucket,
      {
        events: [EventType.OBJECT_CREATED_PUT],
      }
    );
    props.putEventLambda.addEventSource(s3PutEventSource);
  }
}
