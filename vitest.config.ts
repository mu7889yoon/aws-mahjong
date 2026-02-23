import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // テスト環境
    environment: 'node',
    
    // テストファイルのパターン
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    
    // グローバルなテストAPI（describe, it, expect）を有効化
    globals: true,
    
    // カバレッジ設定
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    },
    
    // タイムアウト設定（プロパティベーステスト用に長めに設定）
    testTimeout: 30000,
    
    // レポーター設定
    reporters: ['verbose'],
  },
});
