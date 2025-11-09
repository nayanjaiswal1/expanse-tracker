#!/usr/bin/env node

/**
 * i18n Key Validator
 * Checks for missing or invalid translation keys in the codebase
 */

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Load all translation files
const translationsDir = path.join(__dirname, '../public/locales/en');
const translations = {
  common: JSON.parse(fs.readFileSync(path.join(translationsDir, 'common.json'), 'utf8')),
  finance: JSON.parse(fs.readFileSync(path.join(translationsDir, 'finance.json'), 'utf8')),
  settings: JSON.parse(fs.readFileSync(path.join(translationsDir, 'settings.json'), 'utf8')),
  auth: JSON.parse(fs.readFileSync(path.join(translationsDir, 'auth.json'), 'utf8')),
  shared: JSON.parse(fs.readFileSync(path.join(translationsDir, 'shared.json'), 'utf8')),
};

// Helper to check if a key exists in a nested object
function hasNestedKey(obj, keyPath) {
  const keys = keyPath.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return false;
    }
  }
  
  return true;
}

// Recursively get all files with specific extensions
function getFilesRecursively(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory() && item.name !== 'node_modules' && item.name !== '.git') {
      files.push(...getFilesRecursively(fullPath, extensions));
    } else if (item.isFile() && extensions.some(ext => item.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Extract translation keys from source files
function extractKeysFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const keys = [];
  
  // Skip example and improvements files
  const fileName = path.basename(filePath);
  if (fileName.includes('.example.') || fileName.includes('.improvements.')) {
    return keys;
  }
  
  // Pattern 1: t('key') or t("key") or t(`key`)
  // Matches: t('common.save'), t("finance:goal.title"), etc.
  const tFunctionPattern = /\bt\s*\(\s*['"`]([^'"`$\n{]+)['"`]/g;
  
  // Pattern 2: key properties like titleKey="finance.goals.delete.title"
  // But NOT when using namespace:key format
const keyPropPattern = /(\w+Key)\s*[=:]\s*['"`]([a-zA-Z0-9_.]+)['"`]/g;
  
  // Pattern 3: namespace:key format in props
  const namespacedKeyPropPattern = /\w+Key\s*[=:]\s*['"`]([a-zA-Z0-9_]+):([a-zA-Z0-9_.]+)['"`]/g;
  
  // Extract t() function calls
  let match;
  while ((match = tFunctionPattern.exec(content)) !== null) {
    const fullKey = match[1];
    const offset = match.index;
    const line = content.substring(0, offset).split('\n').length;
    
    // Skip template literals and validation patterns
    if (fullKey.includes('${') || fullKey.includes('))') || fullKey.length > 100) {
      continue;
    }
    
    // Parse namespace:key format (explicit namespace)
    if (fullKey.includes(':')) {
      const [namespace, key] = fullKey.split(':', 2);
      keys.push({
        key,
        namespace,
        line,
        pattern: match[0].substring(0, 50),
      });
    } else {
      // No colon means the entire string is a key path within the default namespace
      // Examples: 'actions.confirm', 'modals.deleteConfirmation.title', 'save'
      keys.push({
        key: fullKey,
        namespace: null,  // Will use default from useTranslation
        line,
        pattern: match[0].substring(0, 50),
      });
    }
  }
  
const ignoredPropNames = new Set(['accessorKey', 'searchKey', 'pageKey', 'pageSizeKey', 'orderingKey']);

// Extract namespace:key format in props (e.g., titleKey="common:warning")
  while ((match = namespacedKeyPropPattern.exec(content)) !== null) {
    const namespace = match[1];
    const key = match[2];
    const offset = match.index;
    const line = content.substring(0, offset).split('\n').length;
    
    keys.push({
      key,
      namespace,
      line,
      pattern: match[0].substring(0, 50),
    });
  }
  
  // Extract dot-notation keys in props (e.g., titleKey="finance.goals.delete.title")
  while ((match = keyPropPattern.exec(content)) !== null) {
    const propName = match[1];
    if (ignoredPropNames.has(propName)) {
      continue;
    }
    const fullKey = match[2];
    const offset = match.index;
    const line = content.substring(0, offset).split('\n').length;
    
    // Skip if already matched by namespacedKeyPropPattern
    if (fullKey.includes(':')) {
      continue;
    }
    
    keys.push({
      key: fullKey,
      namespace: null,
      line,
      pattern: match[0].substring(0, 50),
    });
  }
  
  return keys;
}

// Get the namespace from useTranslation hook
function getDefaultNamespace(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/useTranslation\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
  return match ? match[1] : 'common';
}

function resolveNamespace(keyInfo, defaultNs) {
  if (keyInfo.namespace) {
    return { namespace: keyInfo.namespace, keyPath: keyInfo.key };
  }

  let namespace = defaultNs;
  let keyPath = keyInfo.key;
  const segments = keyPath.split('.');
  const firstSegment = segments[0];
  const isKnownNamespace = translations.hasOwnProperty(firstSegment);

  if (isKnownNamespace) {
    namespace = firstSegment;
    keyPath = segments.slice(1).join('.');
  } else if (firstSegment === defaultNs && segments.length > 1) {
    keyPath = segments.slice(1).join('.');
  }

  return {
    namespace,
    keyPath,
  };
}

function checkAllFiles() {
  const srcDir = path.join(__dirname, '../src');
  const files = getFilesRecursively(srcDir);
  
  const missingKeys = [];
  const validKeys = [];
  
  console.log(`${colors.cyan}Checking ${files.length} files for i18n keys...${colors.reset}\n`);
  
  for (const file of files) {
    const relPath = path.relative(srcDir, file);
    const defaultNs = getDefaultNamespace(file);
    const keys = extractKeysFromFile(file);
    
    for (const keyInfo of keys) {
      const { namespace, keyPath } = resolveNamespace(keyInfo, defaultNs);
      
      // Check if key exists in translations
      if (!translations[namespace]) {
        missingKeys.push({
          file: relPath,
          line: keyInfo.line,
          namespace,
          key: keyPath,
          fullKey: `${namespace}.${keyPath}`,
          pattern: keyInfo.pattern,
          reason: `Namespace "${namespace}" does not exist`,
        });
      } else if (!hasNestedKey(translations[namespace], keyPath)) {
        missingKeys.push({
          file: relPath,
          line: keyInfo.line,
          namespace,
          key: keyPath,
          fullKey: `${namespace}.${keyPath}`,
          pattern: keyInfo.pattern,
          reason: `Key not found in ${namespace}.json`,
        });
      } else {
        validKeys.push({ file: relPath, namespace, key: keyPath });
      }
    }
  }
  
  // Print results
  console.log(`${colors.green}✓ Valid keys: ${validKeys.length}${colors.reset}`);
  console.log(`${colors.red}✗ Missing keys: ${missingKeys.length}${colors.reset}\n`);
  
  if (missingKeys.length > 0) {
    console.log(`${colors.yellow}Missing Translation Keys:${colors.reset}\n`);
    
    // Group by file
    const byFile = {};
    for (const item of missingKeys) {
      if (!byFile[item.file]) {
        byFile[item.file] = [];
      }
      byFile[item.file].push(item);
    }
    
    for (const [file, items] of Object.entries(byFile)) {
      console.log(`${colors.magenta}${file}${colors.reset}`);
      for (const item of items) {
        console.log(`  Line ${item.line}: ${colors.red}${item.fullKey}${colors.reset}`);
        console.log(`    Pattern: ${colors.cyan}${item.pattern}${colors.reset}`);
        console.log(`    Reason: ${item.reason}\n`);
      }
    }
    
    // Generate suggestions
    console.log(`${colors.yellow}Suggestions:${colors.reset}\n`);
    
    const suggestions = new Map();
    for (const item of missingKeys) {
      const key = `${item.namespace}.${item.key}`;
      if (!suggestions.has(key)) {
        suggestions.set(key, { namespace: item.namespace, key: item.key, files: [] });
      }
      suggestions.get(key).files.push(`${item.file}:${item.line}`);
    }
    
    for (const [fullKey, info] of suggestions) {
      console.log(`${colors.cyan}${fullKey}${colors.reset}`);
      console.log(`  Used in: ${info.files.join(', ')}`);
      console.log(`  Add to: public/locales/en/${info.namespace}.json\n`);
    }
    
    return 1;
  } else {
    console.log(`${colors.green}All translation keys are valid! ✓${colors.reset}`);
    return 0;
  }
}

// Run the check
try {
  const exitCode = checkAllFiles();
  process.exit(exitCode);
} catch (error) {
  console.error(`${colors.red}Error:${colors.reset}`, error);
  process.exit(1);
}
