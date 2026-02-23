/**
 * AWS麻雀牌 - CLI テスト
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseArgs, printHelp, CliOptions } from '../src/cli';

// ============================================================================
// parseArgs テスト
// ============================================================================

describe('parseArgs', () => {
  // process.exit をモック
  const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {
    throw new Error('process.exit called');
  }) as any);
  const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    mockExit.mockClear();
    mockConsoleError.mockClear();
  });

  describe('--format オプション', () => {
    it('デフォルトのformatは "svg" (Requirements: 1.2)', () => {
      const options = parseArgs([]);
      expect(options.format).toBe('svg');
    });

    it('--format svg を正しくパースする', () => {
      const options = parseArgs(['--format', 'svg']);
      expect(options.format).toBe('svg');
    });

    it('--format png を正しくパースする', () => {
      const options = parseArgs(['--format', 'png']);
      expect(options.format).toBe('png');
    });

    it('--format svg,png を正しくパースする', () => {
      const options = parseArgs(['--format', 'svg,png']);
      expect(options.format).toBe('svg,png');
    });

    it('-f ショートオプションを正しくパースする', () => {
      const options = parseArgs(['-f', 'png']);
      expect(options.format).toBe('png');
    });

    it('無効なformat値でprocess.exitが呼ばれる (Requirements: 1.3)', () => {
      expect(() => parseArgs(['--format', 'jpeg'])).toThrow('process.exit called');
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('無効な出力形式です')
      );
    });

    it('無効なformat値で有効な形式一覧が表示される (Requirements: 1.3)', () => {
      expect(() => parseArgs(['-f', 'bmp'])).toThrow('process.exit called');
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('svg, png, svg,png')
      );
    });
  });

  describe('他のオプションとの組み合わせ', () => {
    it('--config, --output, --format を同時に指定できる', () => {
      const options = parseArgs([
        '--config', 'my-config.json',
        '--output', './tiles',
        '--format', 'svg,png',
      ]);
      expect(options.configPath).toBe('my-config.json');
      expect(options.outputDir).toBe('./tiles');
      expect(options.format).toBe('svg,png');
    });

    it('ショートオプションの組み合わせ', () => {
      const options = parseArgs(['-c', 'config.json', '-o', 'out', '-f', 'png']);
      expect(options.configPath).toBe('config.json');
      expect(options.outputDir).toBe('out');
      expect(options.format).toBe('png');
    });

    it('--help フラグが正しく設定される', () => {
      const options = parseArgs(['--help']);
      expect(options.showHelp).toBe(true);
    });
  });
});

// ============================================================================
// printHelp テスト
// ============================================================================

describe('printHelp', () => {
  it('ヘルプメッセージに --format オプションの説明が含まれる (Requirements: 1.4)', () => {
    const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    printHelp();

    const output = mockLog.mock.calls.map(call => call[0]).join('\n');
    expect(output).toContain('--format');
    expect(output).toContain('-f');
    expect(output).toContain('svg, png, svg,png');

    mockLog.mockRestore();
  });

  it('ヘルプメッセージに --format の使用例が含まれる (Requirements: 1.4)', () => {
    const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    printHelp();

    const output = mockLog.mock.calls.map(call => call[0]).join('\n');
    expect(output).toContain('--format png');
    expect(output).toContain('--format svg,png');

    mockLog.mockRestore();
  });
});
