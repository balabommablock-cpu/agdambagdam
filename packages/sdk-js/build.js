const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');

// Read all compiled modules
const indexJs = fs.readFileSync(path.join(distDir, 'index.js'), 'utf8');
const hashJs = fs.readFileSync(path.join(distDir, 'hash.js'), 'utf8');
const storageJs = fs.readFileSync(path.join(distDir, 'storage.js'), 'utf8');
const queueJs = fs.readFileSync(path.join(distDir, 'queue.js'), 'utf8');

// Strip import/export statements for inlining into UMD
function stripModuleSyntax(code, moduleName) {
  return code
    .replace(/^export\s+(default\s+)?/gm, '')
    .replace(/^import\s+.*from\s+['"].*['"];?\s*$/gm, '');
}

const hashInlined = stripModuleSyntax(hashJs, 'hash');
const storageInlined = stripModuleSyntax(storageJs, 'storage');
const queueInlined = stripModuleSyntax(queueJs, 'queue');
const indexInlined = stripModuleSyntax(indexJs, 'index');

// UMD bundle
const umd = `(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Abacus = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  ${hashInlined}

  ${storageInlined}

  ${queueInlined}

  ${indexInlined}

  return Abacus;
}));
`;

// ESM bundle
const esm = `${hashJs}

${storageJs}

${queueJs}

${indexJs}
`;

fs.writeFileSync(path.join(distDir, 'abacus.js'), umd);
fs.writeFileSync(path.join(distDir, 'abacus.esm.js'), esm);

const umdSize = Buffer.byteLength(umd, 'utf8');
console.log(`UMD bundle: ${(umdSize / 1024).toFixed(1)}KB`);
console.log(`ESM bundle: ${(Buffer.byteLength(esm, 'utf8') / 1024).toFixed(1)}KB`);
console.log('Build complete.');
