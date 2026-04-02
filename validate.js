#!/usr/bin/env node
/**
 * validate.js
 * -----------
 * Validates every JSON file in ./papers/ against the paper schema.
 * Run manually:  node validate.js
 * Or via git hook (see .git/hooks/pre-push) it runs automatically before push.
 *
 * Exit 0 = all valid. Exit 1 = one or more errors found.
 */

const fs = require('fs');
const path = require('path');

// ── Schema definition ─────────────────────────────────────────────────────────
const SCHEMA = {
  required: ['id', 'title'],
  fields: {
    id: { type: 'string', required: true, pattern: /^[a-z0-9-]+$/, hint: 'lowercase letters, numbers, hyphens only' },
    title: { type: 'string', required: true },
    authors: { type: 'array', items: 'string' },
    year: { type: 'number', min: 1900, max: new Date().getFullYear() + 1 },
    dataset_type: { type: 'array', items: 'string' },
    link: { type: 'string', pattern: /^https?:\/\//, hint: 'must be a valid URL starting with http:// or https://' },
    dataset_schema: { type: 'labeled_array' },
    original_intent: { type: 'labeled_array' },
    repurposed_use: { type: 'string' },
    limitations: { type: 'labeled_array' },
    transformations: { type: 'labeled_array' },
    notes: { type: 'string' },

  },
  // Fields not listed above are flagged as unknown
};

// ── Colour helpers ────────────────────────────────────────────────────────────
const isTTY = process.stdout.isTTY;
const c = {
  red: s => isTTY ? `\x1b[31m${s}\x1b[0m` : s,
  green: s => isTTY ? `\x1b[32m${s}\x1b[0m` : s,
  yellow: s => isTTY ? `\x1b[33m${s}\x1b[0m` : s,
  bold: s => isTTY ? `\x1b[1m${s}\x1b[0m` : s,
  dim: s => isTTY ? `\x1b[2m${s}\x1b[0m` : s,
};

// ── Validator ─────────────────────────────────────────────────────────────────
function validatePaper(paper, filename) {
  const errors = [];
  const warnings = [];

  // 1. File name should match id
  const expectedFilename = paper.id + '.json';
  if (paper.id && path.basename(filename) !== expectedFilename) {
    warnings.push(`filename is "${path.basename(filename)}" but id is "${paper.id}" — expected filename "${expectedFilename}"`);
  }

  // 2. Check each defined field
  for (const [key, rules] of Object.entries(SCHEMA.fields)) {
    const val = paper[key];

    if (val === undefined || val === null || val === '') {
      if (rules.required) errors.push(`"${key}" is required but missing`);
      continue; // skip further checks for absent optional fields
    }

    // Type check
    if (rules.type === 'array') {
      if (!Array.isArray(val)) {
        errors.push(`"${key}" must be an array`);
      } else if (rules.items) {
        val.forEach((item, i) => {
          if (typeof item !== rules.items)
            errors.push(`"${key}[${i}]" must be a ${rules.items}, got ${typeof item}`);
        });
      }
    } else if (rules.type === 'labeled_array') {
      // Must be an array of { label: string, description: string }
      if (!Array.isArray(val)) {
        errors.push(`"${key}" must be an array of { label, description } objects`);
      } else {
        val.forEach((item, i) => {
          if (typeof item !== 'object' || Array.isArray(item) || item === null) {
            errors.push(`"${key}[${i}]" must be an object with "label" and "description"`);
          } else {
            if (typeof item.label !== 'string' || !item.label.trim())
              errors.push(`"${key}[${i}].label" must be a non-empty string`);
            if (typeof item.description !== 'string' || !item.description.trim())
              errors.push(`"${key}[${i}].description" must be a non-empty string`);
            const knownKeys = new Set(['label', 'description']);
            Object.keys(item).forEach(k => {
              if (!knownKeys.has(k))
                errors.push(`"${key}[${i}]" has unexpected property "${k}" — only "label" and "description" are allowed`);
            });
          }
        });
      }
    } else if (typeof val !== rules.type) {
      errors.push(`"${key}" must be a ${rules.type}, got ${typeof val}`);
    }

    // Pattern check (strings)
    if (rules.pattern && typeof val === 'string' && !rules.pattern.test(val)) {
      errors.push(`"${key}" is invalid — ${rules.hint || `must match ${rules.pattern}`}`);
    }

    // Range check (numbers)
    if (rules.type === 'number' && typeof val === 'number') {
      if (rules.min !== undefined && val < rules.min)
        errors.push(`"${key}" must be >= ${rules.min}, got ${val}`);
      if (rules.max !== undefined && val > rules.max)
        errors.push(`"${key}" must be <= ${rules.max}, got ${val}`);
    }
  }

  // 3. Flag unknown fields
  for (const key of Object.keys(paper)) {
    if (!SCHEMA.fields[key]) {
      warnings.push(`unknown field "${key}" — not in schema (this is allowed but worth checking)`);
    }
  }

  return { errors, warnings };
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  const papersDir = path.join(__dirname, 'papers');

  if (!fs.existsSync(papersDir)) {
    console.error(c.red('✗ papers/ directory not found. Run this script from the repo root.'));
    process.exit(1);
  }

  const files = fs.readdirSync(papersDir).filter(f => f.endsWith('.json') && !f.startsWith('_') && f !== 'manifest.json');

  if (!files.length) {
    console.log(c.yellow('⚠ No JSON files found in papers/'));
    process.exit(0);
  }

  console.log(c.bold(`\nValidating ${files.length} paper(s) in papers/\n`));

  let totalErrors = 0;
  let totalWarnings = 0;
  const ids = new Set();

  for (const file of files) {
    const filepath = path.join(papersDir, file);
    let paper;

    // Parse JSON
    try {
      paper = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    } catch (e) {
      console.log(`  ${c.red('✗')} ${c.bold(file)}`);
      console.log(`      ${c.red('JSON parse error:')} ${e.message}\n`);
      totalErrors++;
      continue;
    }

    // Check for duplicate ids
    if (paper.id) {
      if (ids.has(paper.id)) {
        console.log(`  ${c.red('✗')} ${c.bold(file)}`);
        console.log(`      ${c.red('Duplicate id:')} "${paper.id}" already used by another file\n`);
        totalErrors++;
        continue;
      }
      ids.add(paper.id);
    }

    const { errors, warnings } = validatePaper(paper, filepath);

    if (!errors.length && !warnings.length) {
      console.log(`  ${c.green('✓')} ${c.bold(file)}`);
    } else {
      const icon = errors.length ? c.red('✗') : c.yellow('⚠');
      console.log(`  ${icon} ${c.bold(file)}`);
      errors.forEach(e => console.log(`      ${c.red('error:')}   ${e}`));
      warnings.forEach(w => console.log(`      ${c.yellow('warning:')} ${w}`));
      console.log('');
    }

    totalErrors += errors.length;
    totalWarnings += warnings.length;
  }

  console.log('');

  if (totalErrors === 0) {
    console.log(c.green(c.bold(`✓ All papers valid.`)) + c.dim(` (${totalWarnings} warning(s))\n`));
    process.exit(0);
  } else {
    console.log(c.red(c.bold(`✗ ${totalErrors} error(s), ${totalWarnings} warning(s). Fix errors before pushing.\n`)));
    process.exit(1);
  }
}

main();
