const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

const legacyPublicReaderFiles = [
  'index.html',
  'article.html',
  'premium.html',
  'preferences.html',
  'about.html',
  'archive.html',
  'app.js',
  'reader.js',
  'v21.js',
  'styles.css',
  'v21.css'
];

test('Phase 12 fail-closed dual-serving regression gate', () => {
  const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  expect(vercel.outputDirectory).toBe('apps/mobile/dist');
  expect(vercel.outputDirectory).not.toBe('.');
  expect(vercel.outputDirectory).not.toBe('');

  const pages = fs.readFileSync('.github/workflows/pages.yml', 'utf8');
  expect(pages).toContain('path: apps/mobile/dist');
  expect(pages).not.toMatch(/path:\s*\.\s*$/m);
  expect(pages).not.toContain('node --check app.js');
  expect(pages).not.toContain("required = ['index.html'");
  expect(pages).toContain('npm run native:check');

  const validate = fs.readFileSync('.github/workflows/validate.yml', 'utf8');
  expect(validate).not.toContain('node --check app.js');
  expect(validate).not.toContain("public_pages = ['index.html'");
  expect(validate).not.toContain("js = Path('app.js')");
  expect(validate).toContain('apps/mobile');
  expect(validate).toContain('newsroom.html');
  expect(validate).toContain('api/newsroom.js');

  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  expect(pkg.scripts['test:uat']).toBe('playwright test tests/phase12-canonical-uat.spec.js');
  expect(pkg.scripts['test:legacy:public-ui']).toContain('tests/uat.spec.js');
  expect(pkg.scripts['test:legacy:public-ui']).toContain('tests/reader.spec.js');
  expect(pkg.scripts['test:legacy:public-ui']).toContain('tests/mobile-quality.spec.js');

  const canonicalUat = fs.readFileSync('tests/phase12-canonical-uat.spec.js', 'utf8');
  for (const navigation of [
    "page.goto('/index.html'",
    "page.goto('/article.html'",
    "page.goto('/premium.html'",
    "page.goto('/archive.html'"
  ]) {
    expect(canonicalUat).not.toContain(navigation);
  }
  expect(canonicalUat).toContain('historical root public URLs cannot expose the retired legacy Reader implementation');

  for (const file of legacyPublicReaderFiles) {
    expect(fs.existsSync(file), file + ' historical evidence must be retained').toBe(true);
  }

  const prepare = fs.readFileSync('scripts/web/prepare-phase4-vercel.js', 'utf8');
  expect(prepare).toContain('newsroom.html');
  expect(prepare).toContain('newsroom.js');
  expect(prepare).toContain('newsroom.css');
  expect(fs.existsSync('api/newsroom.js')).toBe(true);
  expect(fs.existsSync('newsroom.html')).toBe(true);

  const legacySuites = [
    fs.readFileSync('tests/uat.spec.js', 'utf8'),
    fs.readFileSync('tests/reader.spec.js', 'utf8'),
    fs.readFileSync('tests/mobile-quality.spec.js', 'utf8')
  ];
  for (const suite of legacySuites) {
    expect(suite).toContain('LEGACY / SUPERSEDED / NON-SERVING EVIDENCE');
  }
});
