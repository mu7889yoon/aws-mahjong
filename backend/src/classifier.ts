import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { box, image, noul, TypeSafeClient, type BoxCoordinates } from "@typesafe-ai/sdk";
import sharp from "sharp";

const referencesDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../references",
);
const tileIds = [
  ...Array.from({ length: 9 }, (_, index) => `${index + 1}m`),
  ...Array.from({ length: 9 }, (_, index) => `${index + 1}p`),
  ...Array.from({ length: 9 }, (_, index) => `${index + 1}s`),
  ...Array.from({ length: 7 }, (_, index) => `${index + 1}z`),
];
const honorNames: Record<string, string> = {
  "1z": "東",
  "2z": "南",
  "3z": "西",
  "4z": "北",
  "5z": "白",
  "6z": "發",
  "7z": "中",
};
const suitNames: Record<string, string> = { m: "萬", p: "筒", s: "索" };
const minimumImageDimension = 280;

export interface TileDetection {
  id: string;
  label: string;
  probability: number;
  location: BoxCoordinates;
  boxConfidence: number;
}

export interface ClassificationResult {
  model: string;
  inputTokens: number;
  outputTokens: number;
  requestCount: number;
  detections: TileDetection[];
}

function tileLabel(id: string): string {
  return honorNames[id] ?? `${id[0]}${suitNames[id[1]] ?? id[1]}`;
}

function paddingToImageRequirements(width: number, height: number) {
  const paddedWidth = Math.ceil(Math.max(width, minimumImageDimension) / 32) * 32;
  const paddedHeight = Math.ceil(Math.max(height, minimumImageDimension) / 32) * 32;
  const horizontal = paddedWidth - width;
  const vertical = paddedHeight - height;
  return {
    left: Math.floor(horizontal / 2),
    right: horizontal - Math.floor(horizontal / 2),
    top: Math.floor(vertical / 2),
    bottom: vertical - Math.floor(vertical / 2),
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

async function preparePhoto(input: Buffer) {
  const resized = await sharp(input, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer();
  const metadata = await sharp(resized).metadata();
  const width = metadata.width;
  const height = metadata.height;
  if (!width || !height) {
    throw new Error("画像が小さすぎます。牌を大きく撮り直してください。");
  }

  const padding = paddingToImageRequirements(width, height);
  const bytes = await sharp(resized)
    .extend({ ...padding, background: "#ffffff" })
    .jpeg({ quality: 90 })
    .toBuffer();
  return { bytes, width, height, padding };
}

async function prepareReference(id: string): Promise<Buffer> {
  const svg = await readFile(path.join(referencesDirectory, `${id}.svg`));
  const raster = await sharp(svg)
    .resize({ width: 288, height: 288, fit: "contain", background: "#ffffff" })
    .png()
    .toBuffer();
  const metadata = await sharp(raster).metadata();
  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width < minimumImageDimension ||
    metadata.height < minimumImageDimension
  ) {
    throw new Error(`牌の見本を読めません: ${id}`);
  }
  return sharp(raster)
    .extend({ ...paddingToImageRequirements(metadata.width, metadata.height), background: "#ffffff" })
    .png()
    .toBuffer();
}

function mapLocation(
  location: BoxCoordinates,
  width: number,
  height: number,
  padding: ReturnType<typeof paddingToImageRequirements>,
): BoxCoordinates | null {
  const paddedWidth = width + padding.left + padding.right;
  const paddedHeight = height + padding.top + padding.bottom;
  const mapped = {
    left: clamp((location.left * paddedWidth - padding.left) / width),
    top: clamp((location.top * paddedHeight - padding.top) / height),
    right: clamp((location.right * paddedWidth - padding.left) / width),
    bottom: clamp((location.bottom * paddedHeight - padding.top) / height),
  };
  return mapped.right > mapped.left && mapped.bottom > mapped.top ? mapped : null;
}

export async function classifyImage(input: Buffer, apiKey: string): Promise<ClassificationResult> {
  const threshold = Number(process.env.TILE_PRESENCE_THRESHOLD ?? "0.5");
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new Error("牌の判定しきい値が正しく設定されていません。");
  }

  const preparedPhoto = await preparePhoto(input);
  const tilePhoto = image(preparedPhoto.bytes);
  const references = await Promise.all(
    tileIds.map(async (id) => ({ id, reference: image(await prepareReference(id)) })),
  );
  const client = new TypeSafeClient({
    apiKey,
    defaultHeaders: { "TypeSafe-Danger-Zone-Images": "true" },
  });
  const model = process.env.TYPESAFE_MODEL || "jev-preview";
  const detections: TileDetection[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let requestCount = 0;

  // Two reference tiles per request keeps image payloads below the provider's
  // request limits while retaining one visible box per tile type.
  const batches: (typeof references)[] = [];
  for (let index = 0; index < references.length; index += 2) {
    batches.push(references.slice(index, index + 2));
  }

  // Bound provider concurrency; one upload makes 17 TypeSafe requests.
  for (let index = 0; index < batches.length; index += 4) {
    const results = await Promise.all(
      batches.slice(index, index + 4).map(async (batch) => {
        const tileReferences = Object.fromEntries(
          batch.map(({ id, reference }) => [`ref_${id}`, reference]),
        );
        const questions: Record<string, ReturnType<typeof noul> | ReturnType<typeof box>> = {};
        for (const { id } of batch) {
          const referencePath = `tileReferences.ref_${id}`;
          questions[`present_${id}`] = noul(
            `Does the image in \`tilePhoto\` contain a visible AWS Mahjong tile face matching the reference tile image in \`${referencePath}\`? Ignore tile backs and tiles whose faces are hidden.`,
          );
          questions[`box_${id}`] = box(
            `The visible tile face in \`tilePhoto\` that best matches the reference tile image in \`${referencePath}\`.`,
          );
        }
        return client.systemOne({
          model,
          state: { tilePhoto, tileReferences },
          questions,
        });
      }),
    );

    for (let resultIndex = 0; resultIndex < results.length; resultIndex += 1) {
      const result = results[resultIndex];
      const batch = batches[index + resultIndex];
      requestCount += 1;
      inputTokens += result.usage.input_tokens ?? 0;
      outputTokens += result.usage.output_tokens ?? 0;
      for (const { id } of batch) {
        const presence = result.answers[`present_${id}`];
        const position = result.answers[`box_${id}`];
        const probability = presence?.type === "noul" ? presence.noul : 0;
        if (probability < threshold || position?.type !== "box") continue;
        const location = mapLocation(
          position.box,
          preparedPhoto.width,
          preparedPhoto.height,
          preparedPhoto.padding,
        );
        if (!location) continue;
        detections.push({
          id,
          label: tileLabel(id),
          probability,
          location,
          boxConfidence: position.confidence ?? 0,
        });
      }
    }
  }

  detections.sort((left, right) => right.probability - left.probability);
  return { model, inputTokens, outputTokens, requestCount, detections };
}
