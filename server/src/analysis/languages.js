// Language table: extensions, comment syntax, and how functions are found.
export const LANGUAGES = {
  JavaScript: { exts: ['.js', '.mjs', '.cjs', '.jsx'], style: 'brace', line: ['//'], block: true, template: true },
  TypeScript: { exts: ['.ts', '.tsx', '.mts', '.cts'], style: 'brace', line: ['//'], block: true, template: true },
  Python: { exts: ['.py'], style: 'indent', line: ['#'], block: false, triple: true },
  Java: { exts: ['.java'], style: 'brace', line: ['//'], block: true },
  Kotlin: { exts: ['.kt', '.kts'], style: 'brace', line: ['//'], block: true },
  'C#': { exts: ['.cs'], style: 'brace', line: ['//'], block: true },
  Go: { exts: ['.go'], style: 'brace', line: ['//'], block: true, template: true },
  Rust: { exts: ['.rs'], style: 'brace', line: ['//'], block: true },
  C: { exts: ['.c', '.h'], style: 'brace', line: ['//'], block: true },
  'C++': { exts: ['.cpp', '.cc', '.cxx', '.hpp', '.hh'], style: 'brace', line: ['//'], block: true },
  PHP: { exts: ['.php'], style: 'brace', line: ['//', '#'], block: true },
  Swift: { exts: ['.swift'], style: 'brace', line: ['//'], block: true },
  Ruby: { exts: ['.rb'], style: 'none', line: ['#'], block: false },
  Shell: { exts: ['.sh', '.bash'], style: 'none', line: ['#'], block: false },
  HTML: { exts: ['.html', '.htm', '.vue', '.svelte'], style: 'none', line: [], block: false },
  CSS: { exts: ['.css', '.scss', '.sass', '.less'], style: 'none', line: ['//'], block: true },
};

const BY_EXT = new Map();
for (const [name, cfg] of Object.entries(LANGUAGES)) for (const ext of cfg.exts) BY_EXT.set(ext, { name, ...cfg });

export function extOf(filePath) {
  const base = filePath.split('/').pop();
  const dot = base.lastIndexOf('.');
  return dot <= 0 ? '' : base.slice(dot).toLowerCase();
}

export const languageOf = (filePath) => BY_EXT.get(extOf(filePath)) ?? null;

export const SKIP_DIRS = /(^|\/)(node_modules|vendor|dist|build|out|target|\.git|\.next|\.nuxt|coverage|__pycache__|\.venv|venv|env|bower_components|\.idea|\.vscode|third_party|Pods|\.gradle|site-packages)(\/|$)/;
export const SKIP_FILES = /(\.min\.(js|css)|\.bundle\.js|\.map|\.lock|-lock\.json|-lock\.ya?ml|\.d\.ts)$/i;
export const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.gz', '.tar', '.jar', '.war', '.class', '.exe', '.dll', '.so', '.dylib', '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4', '.mov', '.avi', '.svg', '.bin', '.pyc', '.psd']);

export const isSkippedPath = (p) => SKIP_DIRS.test(p) || SKIP_FILES.test(p);

export const TEST_PATH = /(^|\/)(tests?|__tests__|spec|specs|e2e|cypress)\//i;
export const TEST_FILE = /(\.(test|spec)\.[a-z]+$|(^|\/)test_[^/]+\.py$|_test\.(go|py|rb)$|Tests?\.(java|kt|cs|swift)$)/i;
export const isTestFile = (p) => TEST_PATH.test(p) || TEST_FILE.test(p);
