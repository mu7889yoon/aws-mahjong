import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const docsDir = path.join(repoRoot, 'docs');
const docsOutputDir = path.join(docsDir, 'output');
const webDir = path.join(repoRoot, 'web');
const docsWebDir = path.join(docsDir, 'web');
const legacyDocsWrapperPath = path.join(docsDir, 'merjong-wrapper.js');
mkdirSync(docsDir, { recursive: true });

if (existsSync(docsWebDir)) {
  rmSync(docsWebDir, { recursive: true, force: true });
}
mkdirSync(docsWebDir, { recursive: true });
if (existsSync(legacyDocsWrapperPath)) {
  rmSync(legacyDocsWrapperPath, { force: true });
}

// 牌SVGをGitHub Pages用ディレクトリへ再生成する。
execSync('npm run generate -- --format svg --output ./docs/output', {
  cwd: repoRoot,
  stdio: 'inherit',
});

copyFileSync(path.join(repoRoot, 'theme.json'), path.join(docsDir, 'theme.json'));
copyFileSync(path.join(webDir, 'merjong-wrapper.js'), path.join(docsWebDir, 'merjong-wrapper.js'));

const docsHtml = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AWS Mahjong + Merjong</title>
  <style>
    body {
      margin: 0;
      padding: 24px;
      font-family: "Helvetica Neue", Arial, sans-serif;
      background: #f4f6f8;
      color: #1f2937;
    }

    main {
      max-width: 960px;
      margin: 0 auto;
      display: grid;
      gap: 16px;
    }

    .card {
      background: #fff;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      padding: 16px;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 22px;
    }

    h2 {
      margin: 0 0 10px;
      font-size: 16px;
    }

    p, code {
      font-size: 14px;
    }
  </style>
</head>
<body>
  <main>
    <section class="card">
      <h1>AWS Mahjong + Merjong</h1>
      <p>GitHub Pages向けに生成した静的サンプルです。</p>
      <p><code>./output/*.svg</code> をカスタム牌テーマとして利用します。</p>
    </section>

    <section class="card">
      <h2>Custom Theme (output/*.svg)</h2>
      <div id="custom-sample"></div>
    </section>

    <section class="card">
      <h2>Default Theme</h2>
      <div id="default-sample"></div>
    </section>
  </main>

  <script type="module">
    import {
      loadTheme,
      renderDefault,
      renderWithCustomTheme
    } from "./web/merjong-wrapper.js?v=20260223-1";

    const config = await loadTheme("./theme.json");
    const mpsz = "123456789m-123456789p-123456789s-1234567z";
    document.getElementById("custom-sample").innerHTML = renderWithCustomTheme(mpsz, config);
    document.getElementById("default-sample").innerHTML = renderDefault(mpsz);
  </script>
</body>
</html>
`;

writeFileSync(path.join(docsDir, 'index.html'), docsHtml, 'utf-8');
writeFileSync(path.join(docsDir, '.nojekyll'), '', 'utf-8');

console.log('docs build completed');
console.log(`- docs: ${docsDir}`);
console.log(`- tiles: ${docsOutputDir}`);
