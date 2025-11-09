#!/usr/bin/env node

/**
 * i18n Extraction Helper
 *
 * Scans the source tree for likely user-facing strings (JSX text, UI props, etc.)
 * and generates translation keys so they can be moved into the locale files.
 *
 * Usage:
 *   node scripts/extract-i18n-strings.cjs [--write] [--src ./src] [--report ./i18n-report.json]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parseArgs } = require('node:util');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const PROJECT_ROOT = path.join(__dirname, '..');
const DEFAULT_SRC_DIR = path.join(PROJECT_ROOT, 'src');
const DEFAULT_REPORT = path.join(PROJECT_ROOT, 'i18n-candidates.json');
const LOCALES_DIR = path.join(PROJECT_ROOT, 'public', 'locales', 'en');

const FILE_EXTENSIONS = new Set(['.tsx', '.ts', '.jsx', '.js']);
const IGNORE_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  'build',
  '.next',
  '.git',
  'coverage',
  '.turbo',
  '.expo',
  'public',
]);

const NON_USER_FACING_ATTRS = new Set([
  'classname',
  'class',
  'style',
  'stylename',
  'type',
  'variant',
  'size',
  'color',
  'key',
  'id',
  'htmlfor',
  'width',
  'height',
  'min',
  'max',
  'data-testid',
  'data-test',
  'data-track',
  'data-track-id',
  'data-id',
  'data-cy',
  'role',
  'as',
  'to',
  'href',
  'src',
  'alt',
  'icon',
  'name',
  'value',
  'aria-hidden',
  'aria-current',
  'aria-controls',
  'aria-expanded',
  'aria-describedby',
]);

const USER_FACING_HINTS = [
  'label',
  'text',
  'title',
  'subtitle',
  'heading',
  'message',
  'description',
  'placeholder',
  'helper',
  'tooltip',
  'aria-label',
  'ariaLabel',
  'button',
  'cta',
  'empty',
  'dialog',
  'confirm',
  'cancel',
  'success',
  'error',
  'warning',
].map((hint) => hint.toLowerCase());

const USER_FACING_CALLEES = [
  'toast.success',
  'toast.error',
  'toast',
  'alert',
  'confirm',
  'window.alert',
  'window.confirm',
  'notify',
  'notification.success',
  'notification.error',
  'message.success',
  'message.error',
];

const ARGS = parseArgs({
  options: {
    src: { type: 'string' },
    report: { type: 'string' },
    write: { type: 'boolean', default: false },
    namespace: { type: 'string' },
    verbose: { type: 'boolean', default: false },
  },
});

const SRC_DIR = path.resolve(PROJECT_ROOT, ARGS.values.src || DEFAULT_SRC_DIR);
const REPORT_FILE = path.resolve(PROJECT_ROOT, ARGS.values.report || DEFAULT_REPORT);
const FORCE_NAMESPACE = ARGS.values.namespace || null;
const SHOULD_WRITE = Boolean(ARGS.values.write);
const VERBOSE = Boolean(ARGS.values.verbose);

function logVerbose(...messages) {
  if (VERBOSE) {
    console.log(...messages);
  }
}

function collectFiles(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const item of items) {
    if (item.name.startsWith('.DS_Store')) continue;
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      if (IGNORE_DIRECTORIES.has(item.name)) continue;
      files.push(...collectFiles(fullPath));
    } else if (item.isFile()) {
      const ext = path.extname(item.name);
      if (FILE_EXTENSIONS.has(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function normalizeText(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

function isTranslationKey(text) {
  return /^[a-z0-9_-]+[:.][a-z0-9_.-]+$/i.test(text);
}

function isMostlyPunctuation(text) {
  return /^[\s\d_~`!@#$%^&*()+=\[\]{}|\\;:'",.<>/?-]+$/.test(text);
}

function isUserFacingText(text) {
  if (!text) return false;
  if (text.length === 1 && /[,.]/.test(text)) return false;
  if (isTranslationKey(text)) return false;
  if (isMostlyPunctuation(text)) return false;
  return true;
}

function getAttrName(attrNode) {
  if (!attrNode || attrNode.type !== 'JSXAttribute') return null;
  if (attrNode.name.type === 'JSXIdentifier') {
    return attrNode.name.name;
  }
  if (attrNode.name.type === 'JSXNamespacedName') {
    return `${attrNode.name.namespace.name}:${attrNode.name.name.name}`;
  }
  return null;
}

function hasUserFacingHint(name) {
  if (!name) return false;
  const lower = name.toLowerCase();
  if (NON_USER_FACING_ATTRS.has(lower)) return false;
  return USER_FACING_HINTS.some((hint) => lower.includes(hint));
}

function determineNamespace(filePath) {
  if (FORCE_NAMESPACE) return FORCE_NAMESPACE;
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.includes('/features/finance/') || normalized.includes('/features/finance')) {
    return 'finance';
  }
  if (normalized.includes('/features/settings/') || normalized.includes('/pages/settings')) {
    return 'settings';
  }
  if (normalized.includes('/features/auth/') || normalized.includes('/pages/auth')) {
    return 'auth';
  }
  if (normalized.includes('/shared/') || normalized.includes('/components/common/')) {
    return 'shared';
  }
  return 'common';
}

function createEntry({ file, line, text, kind, attribute }) {
  const namespace = determineNamespace(file);
  return {
    file,
    line,
    text,
    kind,
    attribute: attribute || null,
    namespace,
    key: null,
  };
}

function parseFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  try {
    return parser.parse(code, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        'classProperties',
        'objectRestSpread',
        'dynamicImport',
        'decorators-legacy',
        'optionalChaining',
        'nullishCoalescingOperator',
      ],
      sourceFilename: filePath,
      errorRecovery: true,
    });
  } catch (err) {
    console.warn(`⚠️  Unable to parse ${path.relative(PROJECT_ROOT, filePath)}: ${err.message}`);
    return null;
  }
}

function extractFromFile(filePath) {
  const fileName = path.basename(filePath);
  if (fileName.includes('.example.') || fileName.includes('.improvements.')) {
    return [];
  }

  const ast = parseFile(filePath);
  if (!ast) return [];

  const entries = [];

  traverse(ast, {
    JSXText(pathState) {
      if (!pathState.node.loc) return;
      const text = normalizeText(pathState.node.value);
      if (!isUserFacingText(text)) return;
      const entry = createEntry({
        file: filePath,
        line: pathState.node.loc.start.line,
        text,
        kind: 'jsx-text',
      });
      entries.push(entry);
    },
    StringLiteral(pathState) {
      handleLiteral(pathState, pathState.node.value);
    },
    TemplateLiteral(pathState) {
      if (pathState.node.expressions.length > 0) return;
      handleLiteral(pathState, pathState.node.quasis.map((q) => q.value.cooked).join(''));
    },
  });

  function handleLiteral(pathState, rawValue) {
    if (!pathState.node.loc) return;
    const text = normalizeText(rawValue);
    if (!isUserFacingText(text)) return;

    const ancestors = pathState.getAncestry();
    const parent = pathState.parentPath;

    // Detect JSX attribute direct value
    if (parent && parent.node.type === 'JSXAttribute') {
      const attrName = getAttrName(parent.node);
      if (!hasUserFacingHint(attrName)) return;
      const entry = createEntry({
        file: filePath,
        line: pathState.node.loc.start.line,
        text,
        kind: 'jsx-attr',
        attribute: attrName,
      });
      entries.push(entry);
      return;
    }

    // Detect JSX attribute like foo={"Text"}
    if (
      parent &&
      parent.node.type === 'JSXExpressionContainer' &&
      parent.parentPath &&
      parent.parentPath.node.type === 'JSXAttribute'
    ) {
      const attrName = getAttrName(parent.parentPath.node);
      if (!hasUserFacingHint(attrName)) return;
      const entry = createEntry({
        file: filePath,
        line: pathState.node.loc.start.line,
        text,
        kind: 'jsx-attr',
        attribute: attrName,
      });
      entries.push(entry);
      return;
    }

    // Detect JSX children {"Text"}
    if (
      parent &&
      parent.node.type === 'JSXExpressionContainer' &&
      parent.parentPath &&
      parent.parentPath.isJSXElement()
    ) {
      const entry = createEntry({
        file: filePath,
        line: pathState.node.loc.start.line,
        text,
        kind: 'jsx-text',
      });
      entries.push(entry);
      return;
    }

    // Detect object properties { label: 'Foo' }
    if (
      parent &&
      parent.node.type === 'ObjectProperty' &&
      !parent.node.computed &&
      parent.node.key
    ) {
      let keyName = null;
      if (parent.node.key.type === 'Identifier') keyName = parent.node.key.name;
      if (parent.node.key.type === 'StringLiteral') keyName = parent.node.key.value;

      if (!hasUserFacingHint(keyName)) return;

      const entry = createEntry({
        file: filePath,
        line: pathState.node.loc.start.line,
        text,
        kind: 'object-prop',
        attribute: keyName,
      });
      entries.push(entry);
      return;
    }

    // Detect assignments like const label = 'Foo';
    if (
      parent &&
      parent.node.type === 'VariableDeclarator' &&
      parent.node.id.type === 'Identifier' &&
      hasUserFacingHint(parent.node.id.name)
    ) {
      const entry = createEntry({
        file: filePath,
        line: pathState.node.loc.start.line,
        text,
        kind: 'variable',
        attribute: parent.node.id.name,
      });
      entries.push(entry);
      return;
    }

    // Detect call expressions like toast.success('Saved')
    const callExprParent = ancestors.find((ancestor) => ancestor.isCallExpression && ancestor.isCallExpression());
    if (callExprParent) {
      const calleeName = getCalleeName(callExprParent);
      if (calleeName && isUserFacingCall(calleeName, pathState)) {
        const entry = createEntry({
          file: filePath,
          line: pathState.node.loc.start.line,
          text,
          kind: 'call-arg',
          attribute: calleeName,
        });
        entries.push(entry);
      }
    }
  }

  return entries;
}

function getCalleeName(pathState) {
  const callee = pathState.node.callee;
  if (!callee) return null;
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression') {
    const parts = [];
    let current = callee;
    while (current) {
      if (current.property && current.property.type === 'Identifier') {
        parts.unshift(current.property.name);
      }
      if (current.object.type === 'Identifier') {
        parts.unshift(current.object.name);
        break;
      }
      if (current.object.type === 'MemberExpression') {
        current = current.object;
      } else {
        break;
      }
    }
    return parts.join('.');
  }
  return null;
}

function isUserFacingCall(name, literalPath) {
  if (!name) return false;
  if (!USER_FACING_CALLEES.includes(name)) return false;
  if (!literalPath.parentPath || literalPath.parentPath.node.type !== 'CallExpression') return false;
  // Ensure argument isn't part of template literal interpolation etc.
  return true;
}

function generateKey(entry) {
  const relPath = path.relative(SRC_DIR, entry.file).replace(/\\/g, '/');
  const pathSegment = relPath
    .replace(/\.[^.]+$/, '')
    .split('/')
    .map((segment) => segment.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, ''))
    .filter(Boolean)
    .join('.');
  const textSnippet = entry.text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .slice(0, 4)
    .join('_')
    .replace(/^_+|_+$/g, '') || 'text';
  const hash = crypto.createHash('md5').update(`${entry.text}:${relPath}:${entry.line}:${entry.kind}`).digest('hex').slice(0, 6);
  const segments = ['auto', pathSegment || 'root', `${textSnippet}_${entry.line}_${hash}`];
  return segments.join('.');
}

function ensureTranslationFile(namespace) {
  const filePath = path.join(LOCALES_DIR, `${namespace}.json`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '{}\n', 'utf8');
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return { filePath, data };
}

function getDeep(obj, parts) {
  return parts.reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
}

function setDeep(obj, parts, value) {
  let current = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

function assignKey(store, namespace, entry) {
  if (!store.has(namespace)) {
    store.set(namespace, ensureTranslationFile(namespace));
  }

  const { data } = store.get(namespace);
  const baseKey = generateKey(entry);
  let candidate = baseKey;
  let suffix = 1;
  let status = 'added';

  while (true) {
    const parts = candidate.split('.');
    const existing = getDeep(data, parts);
    if (existing === undefined) {
      setDeep(data, parts, entry.text);
      break;
    }
    if (existing === entry.text) {
      status = 'existing';
      break;
    }
    suffix += 1;
    candidate = `${baseKey}_${suffix}`;
  }

  entry.key = candidate;
  entry.status = status;
  return status;
}

function writeTranslations(store) {
  let totalWrites = 0;
  for (const [namespace, { filePath, data }] of store.entries()) {
    const content = `${JSON.stringify(data, null, 2)}\n`;
    if (SHOULD_WRITE) {
      fs.writeFileSync(filePath, content, 'utf8');
      totalWrites += 1;
    }
  }
  return totalWrites;
}

function createReport(entries, namespaceStats) {
  return {
    generatedAt: new Date().toISOString(),
    totalEntries: entries.length,
    namespaces: namespaceStats,
    entries: entries.map((entry) => ({
      file: path.relative(PROJECT_ROOT, entry.file),
      line: entry.line,
      text: entry.text,
      namespace: entry.namespace,
      key: entry.key,
      kind: entry.kind,
      attribute: entry.attribute,
      status: entry.status,
    })),
  };
}

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`Source directory not found: ${SRC_DIR}`);
    process.exit(1);
  }

  const srcStat = fs.statSync(SRC_DIR);
  const sourceFiles = srcStat.isDirectory() ? collectFiles(SRC_DIR) : [SRC_DIR];
  if (sourceFiles.length === 0) {
    console.log('No source files found to analyze.');
    return;
  }

  console.log(`🔍 Scanning ${sourceFiles.length} files for user-facing strings...\n`);

  const allEntries = [];
  for (const file of sourceFiles) {
    const entries = extractFromFile(file);
    if (entries.length > 0) {
      logVerbose(`• ${path.relative(PROJECT_ROOT, file)} -> ${entries.length} strings`);
    }
    allEntries.push(...entries);
  }

  if (allEntries.length === 0) {
    console.log('✅ No literal user-facing strings detected. Great job!');
    return;
  }

  allEntries.sort((a, b) => {
    if (a.file === b.file) {
      return a.line - b.line;
    }
    return a.file.localeCompare(b.file);
  });

  const translationStore = new Map();
  const namespaceStats = {};

  for (const entry of allEntries) {
    const status = assignKey(translationStore, entry.namespace, entry);
    namespaceStats[entry.namespace] = namespaceStats[entry.namespace] || { total: 0, added: 0, existing: 0 };
    namespaceStats[entry.namespace].total += 1;
    if (status === 'added') {
      namespaceStats[entry.namespace].added += 1;
    } else {
      namespaceStats[entry.namespace].existing += 1;
    }
  }

  const writes = writeTranslations(translationStore);

  const report = createReport(allEntries, namespaceStats);
  fs.writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Found ${allEntries.length} candidate strings across ${Object.keys(namespaceStats).length} namespace(s).`);
  for (const [ns, stats] of Object.entries(namespaceStats)) {
    console.log(
      `  • ${ns}: ${stats.total} detected (${stats.added} new, ${stats.existing} already present)`
    );
  }
  console.log(`Report written to ${path.relative(PROJECT_ROOT, REPORT_FILE)}`);

  if (SHOULD_WRITE) {
    console.log(
      writes > 0
        ? `✅ Updated ${writes} locale file(s) with auto-generated keys.`
        : 'ℹ️  No locale files changed (all keys already existed).'
    );
  } else {
    console.log('ℹ️  Dry run complete. Re-run with --write to update locale files.');
  }
}

main();
