import { promises as fs } from 'fs';
import * as path from 'path';
import { deflateSync, inflateSync } from 'zlib';

const MM_TO_PT = 72 / 25.4;

const LAYOUT = {
  pageWidthMm: 100,
  pageHeightMm: 148,
  cols: 4,
  rowsPerPage: 4,
  marginTopMm: 20,
  marginLeftMm: 10,
  cellWidthMm: 17,
  cellHeightMm: 24,
  gapMm: 4,
} as const;

const DEFAULT_INPUT_DIR = './output';
const DEFAULT_OUTPUT_FILE = './output/tile-layout.pdf';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SUIT_ORDER: Record<string, number> = { m: 0, p: 1, s: 2, z: 3 };
const HONOR_PRINT_ORDER: Record<number, number> = {
  5: 0,
  6: 1,
  7: 2,
  1: 3,
  2: 4,
  3: 5,
  4: 6,
};

interface CliOptions {
  inputDir: string;
  outputFile: string;
  showHelp: boolean;
  showGuides: boolean;
}

interface ParsedTileFile {
  filePath: string;
  label: string;
}

interface ParsedPng {
  width: number;
  height: number;
  bitDepth: number;
  rgbDeflated: Buffer;
  alphaDeflated?: Buffer;
}

interface PdfImageRef {
  name: string;
  objectId: number;
}

class PdfBuilder {
  private readonly objects: Buffer[] = [];

  addObject(body: Buffer): number {
    this.objects.push(body);
    return this.objects.length;
  }

  setObject(objectId: number, body: Buffer): void {
    this.objects[objectId - 1] = body;
  }

  addRawObject(raw: string): number {
    return this.addObject(Buffer.from(raw, 'binary'));
  }

  addPlaceholderObject(): number {
    return this.addObject(Buffer.from('<< >>', 'binary'));
  }

  addStreamObject(dict: string, data: Buffer): number {
    const header = Buffer.from(`${dict}\nstream\n`, 'binary');
    const footer = Buffer.from('\nendstream', 'binary');
    return this.addObject(Buffer.concat([header, data, footer]));
  }

  build(rootObjectId: number): Buffer {
    const chunks: Buffer[] = [];
    const header = Buffer.from('%PDF-1.4\n%\xff\xff\xff\xff\n', 'binary');
    chunks.push(header);

    const offsets: number[] = [0];
    let offset = header.length;

    this.objects.forEach((body, index) => {
      offsets.push(offset);
      const objHeader = Buffer.from(`${index + 1} 0 obj\n`, 'binary');
      const objFooter = Buffer.from('\nendobj\n', 'binary');
      const objBlock = Buffer.concat([objHeader, body, objFooter]);
      chunks.push(objBlock);
      offset += objBlock.length;
    });

    const xrefStart = offset;
    const xrefRows: string[] = ['0000000000 65535 f '];
    for (let i = 1; i < offsets.length; i++) {
      const currentOffset = offsets[i];
      if (currentOffset === undefined) {
        throw new Error('xrefオフセットが不正です');
      }
      xrefRows.push(`${currentOffset.toString().padStart(10, '0')} 00000 n `);
    }

    const xref = `xref\n0 ${this.objects.length + 1}\n${xrefRows.join('\n')}\n`;
    const trailer = `trailer\n<< /Size ${this.objects.length + 1} /Root ${rootObjectId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
    chunks.push(Buffer.from(xref + trailer, 'binary'));

    return Buffer.concat(chunks);
  }
}

function printHelp(): void {
  console.log(`
麻雀牌PNGレイアウトPDF生成ツール

Usage:
  npx ts-node src/png-layout-pdf-cli.ts [options]

Options:
  -i, --input <dir>     PNG入力ディレクトリ (default: ${DEFAULT_INPUT_DIR})
  -o, --output <file>   出力PDFファイル (default: ${DEFAULT_OUTPUT_FILE})
  -g, --guides          検証用ガイド線を描画（外枠・中央線）
  -h, --help            ヘルプを表示

Layout:
  100mm x 148mm ページに 4x4 で配置
  セル: 17mm x 24mm, ギャップ: 4mm
  余白: 上20mm / 左10mm

Examples:
  npx ts-node src/png-layout-pdf-cli.ts
  npx ts-node src/png-layout-pdf-cli.ts -i ./output -o ./output/tiles.pdf
`);
}

function parseArgs(args: string[]): CliOptions {
  let inputDir = DEFAULT_INPUT_DIR;
  let outputFile = DEFAULT_OUTPUT_FILE;
  let showHelp = false;
  let showGuides = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--input' || arg === '-i') {
      const next = args[++i];
      if (next) {
        inputDir = next;
      }
      continue;
    }

    if (arg === '--output' || arg === '-o') {
      const next = args[++i];
      if (next) {
        outputFile = next;
      }
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      showHelp = true;
    }

    if (arg === '--guides' || arg === '-g') {
      showGuides = true;
    }
  }

  return { inputDir, outputFile, showHelp, showGuides };
}

function mmToPt(mm: number): number {
  return mm * MM_TO_PT;
}

function parseTileName(label: string): { number: number; suit: keyof typeof SUIT_ORDER } | null {
  const match = /^(\d+)([mpsz])$/i.exec(label);
  if (!match) {
    return null;
  }
  const numberPart = match[1];
  const suitPart = match[2]?.toLowerCase();
  if (!numberPart || !suitPart || !(suitPart in SUIT_ORDER)) {
    return null;
  }
  return { number: Number(numberPart), suit: suitPart as keyof typeof SUIT_ORDER };
}

function sortTileFiles(files: ParsedTileFile[]): ParsedTileFile[] {
  return [...files].sort((a, b) => {
    const pa = parseTileName(a.label);
    const pb = parseTileName(b.label);

    if (pa && pb) {
      if (pa.suit !== pb.suit) {
        const rankA = SUIT_ORDER[pa.suit] ?? Number.MAX_SAFE_INTEGER;
        const rankB = SUIT_ORDER[pb.suit] ?? Number.MAX_SAFE_INTEGER;
        return rankA - rankB;
      }

      // Hotfix: 字牌は 5z,6z,7z の後に 1z,2z,3z,4z を出力する
      if (pa.suit === 'z' && pb.suit === 'z') {
        const rankA = HONOR_PRINT_ORDER[pa.number] ?? Number.MAX_SAFE_INTEGER;
        const rankB = HONOR_PRINT_ORDER[pb.number] ?? Number.MAX_SAFE_INTEGER;
        if (rankA !== rankB) {
          return rankA - rankB;
        }
      }

      if (pa.number !== pb.number) {
        return pa.number - pb.number;
      }
      return a.label.localeCompare(b.label);
    }

    if (pa && !pb) {
      return -1;
    }
    if (!pa && pb) {
      return 1;
    }
    return a.label.localeCompare(b.label);
  });
}

async function findPngFiles(inputDir: string): Promise<ParsedTileFile[]> {
  const entries = await fs.readdir(inputDir, { withFileTypes: true });
  const pngs = entries
    .filter((entry) => entry.isFile() && /\.png$/i.test(entry.name))
    .map((entry) => ({
      filePath: path.join(inputDir, entry.name),
      label: path.basename(entry.name, path.extname(entry.name)),
    }))
    // MPSZ形式以外（例: "1m.svg.png"）はPDFレイアウト対象から除外する。
    .filter((entry) => parseTileName(entry.label) !== null);

  return sortTileFiles(pngs);
}

function readUInt32BE(buffer: Buffer, offset: number): number {
  return buffer.readUInt32BE(offset);
}

function readByte(buffer: Buffer, offset: number): number {
  const value = buffer[offset];
  if (value === undefined) {
    throw new Error(`バッファ参照エラー: offset=${offset}`);
  }
  return value;
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);

  if (pa <= pb && pa <= pc) {
    return a;
  }
  if (pb <= pc) {
    return b;
  }
  return c;
}

function unfilterScanlines(
  inflated: Buffer,
  width: number,
  height: number,
  bytesPerPixel: number
): Buffer {
  const stride = width * bytesPerPixel;
  const expected = height * (stride + 1);
  if (inflated.length !== expected) {
    throw new Error(`PNGデータ長が不正です: expected=${expected}, actual=${inflated.length}`);
  }

  const raw = Buffer.alloc(width * height * bytesPerPixel);

  for (let row = 0; row < height; row++) {
    const rowIn = row * (stride + 1);
    const rowOut = row * stride;
    const filter = inflated[rowIn];

    for (let x = 0; x < stride; x++) {
      const current = inflated[rowIn + 1 + x];
      const left = x >= bytesPerPixel ? raw[rowOut + x - bytesPerPixel] : 0;
      const up = row > 0 ? raw[rowOut - stride + x] : 0;
      const upLeft = row > 0 && x >= bytesPerPixel ? raw[rowOut - stride + x - bytesPerPixel] : 0;
      const currentValue = current ?? 0;
      const leftValue = left ?? 0;
      const upValue = up ?? 0;
      const upLeftValue = upLeft ?? 0;
      let value: number;

      if (filter === 0) {
        value = currentValue;
      } else if (filter === 1) {
        value = (currentValue + leftValue) & 0xff;
      } else if (filter === 2) {
        value = (currentValue + upValue) & 0xff;
      } else if (filter === 3) {
        value = (currentValue + Math.floor((leftValue + upValue) / 2)) & 0xff;
      } else if (filter === 4) {
        value = (currentValue + paethPredictor(leftValue, upValue, upLeftValue)) & 0xff;
      } else {
        throw new Error(`未対応のPNGフィルタです: ${filter}`);
      }

      raw[rowOut + x] = value;
    }
  }

  return raw;
}

function parsePng(buffer: Buffer): ParsedPng {
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('PNGシグネチャが不正です');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatChunks: Buffer[] = [];

  while (offset + 8 <= buffer.length) {
    const length = readUInt32BE(buffer, offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (dataEnd + 4 > buffer.length) {
      throw new Error('PNGチャンク長が不正です');
    }

    const data = buffer.subarray(dataStart, dataEnd);

    if (type === 'IHDR') {
      width = readUInt32BE(data, 0);
      height = readUInt32BE(data, 4);
      bitDepth = readByte(data, 8);
      colorType = readByte(data, 9);
      interlace = readByte(data, 12);
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset = dataEnd + 4;
  }

  if (!width || !height || idatChunks.length === 0) {
    throw new Error('PNGの必須チャンクが不足しています');
  }
  if (bitDepth !== 8) {
    throw new Error(`未対応のbitDepthです: ${bitDepth}`);
  }
  if (interlace !== 0) {
    throw new Error('インターレースPNGは未対応です');
  }
  if (colorType !== 0 && colorType !== 2 && colorType !== 4 && colorType !== 6) {
    throw new Error(`未対応のcolorTypeです: ${colorType} (Gray/RGB/GrayAlpha/RGBAのみ対応)`);
  }

  const compressed = Buffer.concat(idatChunks);
  const inflated = inflateSync(compressed);
  const bytesPerPixel = colorType === 6 ? 4 : colorType === 4 ? 2 : colorType === 2 ? 3 : 1;
  const raw = unfilterScanlines(inflated, width, height, bytesPerPixel);

  if (colorType === 2) {
    return {
      width,
      height,
      bitDepth,
      rgbDeflated: deflateSync(raw),
    };
  }

  if (colorType === 0) {
    const pixels = width * height;
    const rgb = Buffer.alloc(pixels * 3);
    for (let i = 0; i < pixels; i++) {
      const gray = readByte(raw, i);
      const dst = i * 3;
      rgb[dst] = gray;
      rgb[dst + 1] = gray;
      rgb[dst + 2] = gray;
    }
    return {
      width,
      height,
      bitDepth,
      rgbDeflated: deflateSync(rgb),
    };
  }

  if (colorType === 4) {
    const pixels = width * height;
    const rgb = Buffer.alloc(pixels * 3);
    const alpha = Buffer.alloc(pixels);

    for (let i = 0; i < pixels; i++) {
      const src = i * 2;
      const gray = readByte(raw, src);
      const a = readByte(raw, src + 1);
      const dst = i * 3;
      rgb[dst] = gray;
      rgb[dst + 1] = gray;
      rgb[dst + 2] = gray;
      alpha[i] = a;
    }

    return {
      width,
      height,
      bitDepth,
      rgbDeflated: deflateSync(rgb),
      alphaDeflated: deflateSync(alpha),
    };
  }

  const pixels = width * height;
  const rgb = Buffer.alloc(pixels * 3);
  const alpha = Buffer.alloc(pixels);

  for (let i = 0; i < pixels; i++) {
    const src = i * 4;
    const dst = i * 3;
    rgb[dst] = readByte(raw, src);
    rgb[dst + 1] = readByte(raw, src + 1);
    rgb[dst + 2] = readByte(raw, src + 2);
    alpha[i] = readByte(raw, src + 3);
  }

  return {
    width,
    height,
    bitDepth,
    rgbDeflated: deflateSync(rgb),
    alphaDeflated: deflateSync(alpha),
  };
}

function chunkBy<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function createPdf(tiles: ParsedTileFile[], showGuides: boolean): Promise<Buffer> {
  const builder = new PdfBuilder();
  const imageRefs: PdfImageRef[] = [];

  for (const [i, tile] of tiles.entries()) {
    const file = await fs.readFile(tile.filePath);
    const parsed = parsePng(file);

    let smaskId: number | undefined;
    if (parsed.alphaDeflated) {
      smaskId = builder.addStreamObject(
        `<< /Type /XObject /Subtype /Image /Width ${parsed.width} /Height ${parsed.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${parsed.alphaDeflated.length} >>`,
        parsed.alphaDeflated
      );
    }

    const smaskPart = smaskId ? ` /SMask ${smaskId} 0 R` : '';
    const imageId = builder.addStreamObject(
      `<< /Type /XObject /Subtype /Image /Width ${parsed.width} /Height ${parsed.height} /ColorSpace /DeviceRGB /BitsPerComponent ${parsed.bitDepth} /Filter /FlateDecode /Length ${parsed.rgbDeflated.length}${smaskPart} >>`,
      parsed.rgbDeflated
    );

    imageRefs.push({
      name: `Im${i + 1}`,
      objectId: imageId,
    });
  }

  const pageWidthPt = mmToPt(LAYOUT.pageWidthMm);
  const pageHeightPt = mmToPt(LAYOUT.pageHeightMm);
  const cellWidthPt = mmToPt(LAYOUT.cellWidthMm);
  const cellHeightPt = mmToPt(LAYOUT.cellHeightMm);
  const marginLeftPt = mmToPt(LAYOUT.marginLeftMm);
  const marginTopPt = mmToPt(LAYOUT.marginTopMm);
  const gapPt = mmToPt(LAYOUT.gapMm);

  const pagesId = builder.addPlaceholderObject();
  const pageIds: number[] = [];
  const tilePages = chunkBy(tiles, LAYOUT.rowsPerPage);

  for (const [pageIndex, rows] of tilePages.entries()) {
    const commands: string[] = [];
    const xObjectEntries: string[] = [];

    for (let row = 0; row < rows.length; row++) {
      const globalIndex = pageIndex * LAYOUT.rowsPerPage + row;
      const imageRef = imageRefs[globalIndex];
      if (!imageRef) {
        continue;
      }

      xObjectEntries.push(`/${imageRef.name} ${imageRef.objectId} 0 R`);

      const y = pageHeightPt - marginTopPt - cellHeightPt - row * (cellHeightPt + gapPt);
      for (let col = 0; col < LAYOUT.cols; col++) {
        const x = marginLeftPt + col * (cellWidthPt + gapPt);
        commands.push(
          'q',
          `${cellWidthPt.toFixed(4)} 0 0 ${cellHeightPt.toFixed(4)} ${x.toFixed(4)} ${y.toFixed(4)} cm`,
          `/${imageRef.name} Do`,
          'Q'
        );
      }
    }

    if (showGuides) {
      const pageWidthMm = LAYOUT.pageWidthMm;
      const pageHeightMm = LAYOUT.pageHeightMm;
      const gridWidthMm = LAYOUT.cols * LAYOUT.cellWidthMm + (LAYOUT.cols - 1) * LAYOUT.gapMm;
      const gridHeightMm = LAYOUT.rowsPerPage * LAYOUT.cellHeightMm + (LAYOUT.rowsPerPage - 1) * LAYOUT.gapMm;
      const leftMm = LAYOUT.marginLeftMm;
      const rightMm = leftMm + gridWidthMm;
      const topMm = LAYOUT.marginTopMm;
      const bottomMm = topMm + gridHeightMm;
      const centerXPt = mmToPt(pageWidthMm / 2);
      const centerYPt = mmToPt(pageHeightMm / 2);
      const leftPt = mmToPt(leftMm);
      const rightPt = mmToPt(rightMm);
      const topPt = mmToPt(topMm);
      const bottomPt = mmToPt(bottomMm);

      const topYPtFromBottom = pageHeightPt - topPt;
      const bottomYPtFromBottom = pageHeightPt - bottomPt;

      // Page center guides (blue)
      commands.push(
        'q',
        '0.2 0.4 0.9 RG',
        '0.5 w',
        `${centerXPt.toFixed(4)} 0 m ${centerXPt.toFixed(4)} ${pageHeightPt.toFixed(4)} l S`,
        `0 ${centerYPt.toFixed(4)} m ${pageWidthPt.toFixed(4)} ${centerYPt.toFixed(4)} l S`,
        'Q'
      );

      // Grid frame (red)
      commands.push(
        'q',
        '0.9 0.2 0.2 RG',
        '0.8 w',
        `${leftPt.toFixed(4)} ${bottomYPtFromBottom.toFixed(4)} m ${rightPt.toFixed(4)} ${bottomYPtFromBottom.toFixed(4)} l ${rightPt.toFixed(4)} ${topYPtFromBottom.toFixed(4)} l ${leftPt.toFixed(4)} ${topYPtFromBottom.toFixed(4)} l h S`,
        'Q'
      );
    }

    const contentData = Buffer.from(commands.join('\n') + '\n', 'ascii');
    const contentId = builder.addStreamObject(`<< /Length ${contentData.length} >>`, contentData);

    const pageId = builder.addRawObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidthPt.toFixed(4)} ${pageHeightPt.toFixed(4)}] /Resources << /XObject << ${xObjectEntries.join(' ')} >> >> /Contents ${contentId} 0 R >>`
    );
    pageIds.push(pageId);
  }

  const kids = pageIds.map((id) => `${id} 0 R`).join(' ');
  builder.setObject(
    pagesId,
    Buffer.from(`<< /Type /Pages /Kids [${kids}] /Count ${pageIds.length} >>`, 'binary')
  );

  const catalogId = builder.addRawObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  return builder.build(catalogId);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.showHelp) {
    printHelp();
    process.exit(0);
  }

  const inputDir = path.resolve(options.inputDir);
  const outputFile = path.resolve(options.outputFile);

  const tiles = await findPngFiles(inputDir);
  if (tiles.length === 0) {
    throw new Error(`PNGファイルが見つかりませんでした: ${inputDir}`);
  }

  const pdf = await createPdf(tiles, options.showGuides);

  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, pdf);

  const pageCount = Math.ceil(tiles.length / LAYOUT.rowsPerPage);
  console.log(`PDFを出力しました: ${outputFile}`);
  console.log(`対象PNG: ${tiles.length} 枚`);
  console.log(`ページ数: ${pageCount}`);
  console.log(`1ページあたり: ${LAYOUT.rowsPerPage}種類 x ${LAYOUT.cols}枚 = ${LAYOUT.rowsPerPage * LAYOUT.cols}枚`);
  if (options.showGuides) {
    console.log('ガイド線: 有効');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
