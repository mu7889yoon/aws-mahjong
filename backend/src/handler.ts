import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { APIError } from "@typesafe-ai/sdk";
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { classifyImage } from "./classifier.js";

const maxUploadBytes = 4 * 1024 * 1024;
const secrets = new SecretsManagerClient({ region: process.env.AWS_REGION });
const allowedOrigin = process.env.ALLOWED_ORIGIN;
let cachedApiKey: string | undefined;

function response(
  statusCode: number,
  body: unknown,
  origin?: string,
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...(origin && allowedOrigin && origin === allowedOrigin
        ? { "access-control-allow-origin": allowedOrigin, vary: "Origin" }
        : {}),
    },
    body: JSON.stringify(body),
  };
}

async function getApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;
  const secretId = process.env.TYPESAFE_API_KEY_SECRET_ARN;
  if (!secretId) throw new Error("API設定が不足しています。");
  const result = await secrets.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!result.SecretString) throw new Error("APIキーが設定されていません。");
  cachedApiKey = result.SecretString.trim();
  if (!cachedApiKey) throw new Error("APIキーが設定されていません。");
  return cachedApiKey;
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const origin = event.headers.origin;
  if (!allowedOrigin || origin !== allowedOrigin) {
    return response(403, { error: "このサイトからのリクエストのみ利用できます。" });
  }
  if (event.requestContext.http.method !== "POST") {
    return response(405, { error: "POSTで画像を送信してください。" }, origin);
  }
  const contentType = event.headers["content-type"]?.split(";")[0].trim().toLowerCase();
  if (contentType !== "image/jpeg" && contentType !== "image/png") {
    return response(415, { error: "JPGまたはPNG画像を選択してください。" }, origin);
  }
  if (!event.body) return response(400, { error: "画像を確認できません。" }, origin);

  const input = Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8");
  if (input.length === 0 || input.length > maxUploadBytes) {
    return response(413, { error: "画像は4MB以下にしてください。" }, origin);
  }

  try {
    const result = await classifyImage(input, await getApiKey());
    return response(200, result, origin);
  } catch (error) {
    const detail = error instanceof APIError && typeof error.body === "object" && error.body !== null
      ? (error.body as { detail?: unknown }).detail
      : undefined;
    const errorType =
      typeof detail === "object" && detail !== null &&
      typeof (detail as { error_type?: unknown }).error_type === "string" &&
      /^[a-z0-9_]{1,80}$/i.test((detail as { error_type: string }).error_type)
        ? (detail as { error_type: string }).error_type
        : undefined;
    console.error("Image classification failed.", {
      requestId: event.requestContext.requestId,
      errorName: error instanceof Error ? error.name : "unknown",
      ...(error instanceof APIError
        ? { status: error.status, providerRequestId: error.requestId, ...(errorType ? { errorType } : {}) }
        : {}),
    });
    return response(502, { error: "画像を判定できませんでした。少し待ってから再度お試しください。" }, origin);
  }
}
