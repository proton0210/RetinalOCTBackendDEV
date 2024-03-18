import {
  DynamoDBClient,
  GetItemCommand,
  GetItemCommandInput,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  RekognitionClient,
  DetectCustomLabelsCommand,
  DetectCustomLabelsCommandOutput,
} from "@aws-sdk/client-rekognition";

import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
} from "@aws-sdk/client-ses";

// Make sure you have this in Verfified Idenity
const fromEmail = "vidit0210@gmail.com";

const ddbClient = new DynamoDBClient({ region: "ap-south-1" });
const tableName = "Users";

export const handler = async (event: any): Promise<void> => {
  const fileName = event.Records[0].s3.object.key;
  const clerkID = extractClerkIDFromFileName(fileName);
  if (!clerkID) {
    console.log("No clerk ID found in the file name");
    return;
  }

  const userEmail = await getUserFromDynamoDB(tableName, clerkID);
  console.log(`User email: ${userEmail}`);

  const bucket = event.Records[0].s3.bucket.name;
  console.log(`Bucket: ${bucket}`);
  const photo = event.Records[0].s3.object.key;
  console.log(`Photo: ${photo}`);
  const model =
    "arn:aws:rekognition:ap-south-1:730335186175:project/RetinalOCT/version/RetinalOCT.2024-03-11T19.38.42/1710166122612";
  const minConfidence = 95;

  const result = await showCustomLabels(model, bucket, photo, minConfidence);
  if (!result) {
    throw new Error("No custom labels detected");
  }

  if (typeof result === "string") {
    console.log(result);
    return;
  }

  if (result) {
    const body = {
      ...result,
    };
    await sendEmailToUser(userEmail, body);
  }
};

function extractClerkIDFromFileName(fileName: string): string {
  const parts = fileName.split("_");

  if (parts.length >= 3 && parts[0] === "user") {
    return `user_${parts[1]}`;
  }

  return "";
}

async function getUserFromDynamoDB(
  tableName: string,
  clerkID: string
): Promise<string> {
  const getItemCommand: GetItemCommandInput = {
    TableName: tableName,
    Key: marshall({ ClerkID: clerkID }),
  };

  try {
    const { Item } = await ddbClient.send(new GetItemCommand(getItemCommand));
    if (Item) {
      const result = unmarshall(Item);
      return result.Email;
    } else {
      return `User with ID ${clerkID} does not exist in the table`;
    }
  } catch (error) {
    return `Error fetching user with ID ${clerkID} from the table: ${error}`;
  }
}

async function showCustomLabels(
  model: string,
  bucket: string,
  photo: string,
  minConfidence: number
) {
  const client = new RekognitionClient({ region: "ap-south-1" });

  const command = new DetectCustomLabelsCommand({
    Image: {
      S3Object: {
        Bucket: bucket,
        Name: photo,
      },
    },
    MinConfidence: minConfidence,
    ProjectVersionArn: model,
  });

  const response = (await client.send(
    command
  )) as DetectCustomLabelsCommandOutput;
  if (!response.CustomLabels) {
    console.log("No custom labels detected");
    return 0;
  }
  console.log("Rekognition response: ", response);

  if (response.CustomLabels.length === 0) {
    return "No custom labels detected in the image";
  }

  const name = response.CustomLabels[0].Name;
  const confidence = response.CustomLabels[0].Confidence;

  const result = {
    name,
    confidence,
  };

  return result;
}

async function sendEmailToUser(toEmail: string, body: any): Promise<void> {
  const sesClient = new SESClient({ region: "ap-south-1" });

  sesClient.middlewareStack;

  const params: SendEmailCommandInput = {
    Destination: {
      ToAddresses: [toEmail],
    },
    Message: {
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: JSON.stringify(body),
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Retinal OCT Image Analysis Results",
      },
    },
    Source: fromEmail,
  };

  try {
    const data = await sesClient.send(new SendEmailCommand(params));
    console.log("Email sent successfully:", data);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

/*
 Write me typesscript function using aws ses to send email to user
 */
// Path: functions/SendEmail/index.ts
// Compare this snippet from stacks/s3-stack.ts:
// import * as cdk from "aws-cdk-lib";
// import { Construct } from "constructs";
