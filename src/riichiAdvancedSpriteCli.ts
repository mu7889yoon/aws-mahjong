#!/usr/bin/env node
/**
 * riichi-advanced スプライトシート生成 CLI
 *
 * Usage:
 *   npx ts-node src/riichiAdvancedSpriteCli.ts [--output <path>] [--individual-dir <dir>]
 */

import {
  buildRiichiAdvancedAwsSprite,
  RIICHI_ADVANCED_AWS_REPLACEMENTS,
  RED_DORA_MAPPING,
} from './riichiAdvancedSprite';

function parseArgs(argv: string[]): { output?: string; individualDir?: string } {
  const args = argv.slice(2);
  let output: string | undefined;
  let individualDir: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && i + 1 < args.length) {
      output = args[++i];
    } else if (args[i] === '--individual-dir' && i + 1 < args.length) {
      individualDir = args[++i];
    }
  }

  return { output, individualDir };
}

async function main(): Promise<void> {
  const { output, individualDir } = parseArgs(process.argv);

  await buildRiichiAdvancedAwsSprite({
    outputPath: output,
    individualOutputDir: individualDir,
  });

  const tileCount = individualDir
    ? RIICHI_ADVANCED_AWS_REPLACEMENTS.length + RED_DORA_MAPPING.length
    : RIICHI_ADVANCED_AWS_REPLACEMENTS.length;

  console.log(
    `Generated ${tileCount} tiles.` +
      (individualDir ? ` Individual PNGs saved to: ${individualDir}` : '') +
      (output ? ` Sprite sheet saved to: ${output}` : '')
  );
}

main().catch((err) => {
  console.error('Error generating riichi-advanced sprite:', err);
  process.exit(1);
});
