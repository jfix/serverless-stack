import { APIGatewayProxyResult } from "aws-lambda";

export async function main(): Promise<APIGatewayProxyResult> {
  return {
    statusCode: 200,
    body: "Hello World",
    headers: { "Content-Type": "text/plain" },
  };
}
