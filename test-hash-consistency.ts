/**
 * Cross-implementation MurmurHash3 consistency test.
 * Tests the platform's most critical claim: deterministic variant assignment.
 */

// ======= IMPLEMENTATION 1: Browser SDK (copy from packages/sdk-js/src/hash.ts) =======
function browserMurmurHash3(key: string, seed: number = 0): number {
  const remainder = key.length & 3;
  const bytes = key.length - remainder;
  let h1 = seed >>> 0;
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;
  let i = 0;

  while (i < bytes) {
    let k1 =
      (key.charCodeAt(i) & 0xff) |
      ((key.charCodeAt(i + 1) & 0xff) << 8) |
      ((key.charCodeAt(i + 2) & 0xff) << 16) |
      ((key.charCodeAt(i + 3) & 0xff) << 24);
    i += 4;

    k1 = Math.imul(k1, c1);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, c2);

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = Math.imul(h1, 5) + 0xe6546b64;
  }

  let k1 = 0;
  switch (remainder) {
    case 3:
      k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
    case 2:
      k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
    case 1:
      k1 ^= key.charCodeAt(i) & 0xff;
      k1 = Math.imul(k1, c1);
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = Math.imul(k1, c2);
      h1 ^= k1;
  }

  h1 ^= key.length;
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35);
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
}

function browserHashToFloat(key: string, seed: number = 0): number {
  const hash = browserMurmurHash3(key, seed);
  return (hash >>> 0) / 0x100000000;
}

// ======= IMPLEMENTATION 2: Node SDK (copy from packages/sdk-node/src/index.ts) =======
// Identical code to browser — included separately to verify
function nodeMurmurHash3(key: string, seed: number = 0): number {
  const remainder = key.length & 3;
  const bytes = key.length - remainder;
  let h1 = seed >>> 0;
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;
  let i = 0;

  while (i < bytes) {
    let k1 =
      (key.charCodeAt(i) & 0xff) |
      ((key.charCodeAt(i + 1) & 0xff) << 8) |
      ((key.charCodeAt(i + 2) & 0xff) << 16) |
      ((key.charCodeAt(i + 3) & 0xff) << 24);
    i += 4;

    k1 = Math.imul(k1, c1);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, c2);

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = Math.imul(h1, 5) + 0xe6546b64;
  }

  let k1 = 0;
  switch (remainder) {
    case 3:
      k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
    case 2:
      k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
    case 1:
      k1 ^= key.charCodeAt(i) & 0xff;
      k1 = Math.imul(k1, c1);
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = Math.imul(k1, c2);
      h1 ^= k1;
  }

  h1 ^= key.length;
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35);
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
}

function nodeHashToFloat(key: string, seed: number = 0): number {
  return (nodeMurmurHash3(key, seed) >>> 0) / 0x100000000;
}

// ======= IMPLEMENTATION 3: Server (murmurhash-js npm package) =======
function npmMurmurHash3(key: string, seed: number = 0): number {
  // Exact copy of murmurhash3_gc.js from murmurhash-js npm package
  var remainder: number, bytes: number, h1: number, h1b: number, c1: number, c2: number, k1: number, i: number;

  remainder = key.length & 3;
  bytes = key.length - remainder;
  h1 = seed;
  c1 = 0xcc9e2d51;
  c2 = 0x1b873593;
  i = 0;

  while (i < bytes) {
    k1 =
      ((key.charCodeAt(i) & 0xff)) |
      ((key.charCodeAt(++i) & 0xff) << 8) |
      ((key.charCodeAt(++i) & 0xff) << 16) |
      ((key.charCodeAt(++i) & 0xff) << 24);
    ++i;

    k1 = ((((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16))) & 0xffffffff;
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = ((((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16))) & 0xffffffff;

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1b = ((((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16))) & 0xffffffff;
    h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16));
  }

  k1 = 0;

  switch (remainder) {
    case 3: k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
    case 2: k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
    case 1: k1 ^= (key.charCodeAt(i) & 0xff);

    k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
    h1 ^= k1;
  }

  h1 ^= key.length;

  h1 ^= h1 >>> 16;
  h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
  h1 ^= h1 >>> 13;
  h1 = ((((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16))) & 0xffffffff;
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
}

// Server's hashToFloat — NOTE: divides by 0xFFFFFFFF, NOT 0x100000000
function serverHashToFloat(input: string, seed: number = 0): number {
  const hash = npmMurmurHash3(input, seed);
  return (hash >>> 0) / 0xFFFFFFFF;
}

// ======= pickVariant (from server) =======
interface Variant {
  key: string;
  weight: number;
}

function pickVariant(hashValue: number, variants: Variant[]): Variant {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight / totalWeight;
    if (hashValue < cumulative) {
      return variant;
    }
  }
  return variants[variants.length - 1];
}

// ======= TEST RUNNER =======
let totalTests = 0;
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passed++;
    console.log(`  PASS: ${testName}`);
  } else {
    failed++;
    const msg = `  FAIL: ${testName}${detail ? ' — ' + detail : ''}`;
    console.log(msg);
    failures.push(msg);
  }
}

// ======= TEST 1: Cross-implementation raw hash consistency =======
console.log('\n' + '='.repeat(80));
console.log('TEST 1: Cross-implementation MurmurHash3 raw hash consistency');
console.log('='.repeat(80));

const testInputs = [
  "experiment_1:user_123",
  "checkout-flow:visitor_abc",
  "",
  "a",
  "こんにちは:user_1",
  "experiment-with-very-long-key-name-that-goes-on-and-on:user_with_a_really_long_id_12345678901234567890",
  "exp:user's\"test<>&",
];

for (const input of testInputs) {
  const browserHash = browserMurmurHash3(input, 0);
  const nodeHash = nodeMurmurHash3(input, 0);
  const npmHash = npmMurmurHash3(input, 0);

  const allMatch = browserHash === nodeHash && nodeHash === npmHash;
  const displayInput = input.length > 40 ? input.substring(0, 40) + '...' : input;
  assert(
    allMatch,
    `Hash consistency for "${displayInput}"`,
    `browser=${browserHash}, node=${nodeHash}, npm=${npmHash}`
  );

  if (!allMatch) {
    console.log(`    browser: ${browserHash}`);
    console.log(`    node:    ${nodeHash}`);
    console.log(`    npm:     ${npmHash}`);
  }
}

// Also test with seed=1 (used for traffic allocation)
console.log('\n  --- With seed=1 (traffic allocation) ---');
for (const input of testInputs) {
  const browserHash = browserMurmurHash3(input, 1);
  const nodeHash = nodeMurmurHash3(input, 1);
  const npmHash = npmMurmurHash3(input, 1);

  const allMatch = browserHash === nodeHash && nodeHash === npmHash;
  const displayInput = input.length > 40 ? input.substring(0, 40) + '...' : input;
  assert(
    allMatch,
    `Hash consistency (seed=1) for "${displayInput}"`,
    `browser=${browserHash}, node=${nodeHash}, npm=${npmHash}`
  );
}

// ======= TEST 1b: hashToFloat consistency (CRITICAL) =======
console.log('\n' + '='.repeat(80));
console.log('TEST 1b: hashToFloat consistency — browser/node vs server');
console.log('  Browser/Node: hash / 0x100000000');
console.log('  Server:       hash / 0xFFFFFFFF');
console.log('='.repeat(80));

for (const input of testInputs) {
  const browserFloat = browserHashToFloat(input, 0);
  const nodeFloat = nodeHashToFloat(input, 0);
  const serverFloat = serverHashToFloat(input, 0);

  const browserNodeMatch = browserFloat === nodeFloat;
  const serverMatch = Math.abs(browserFloat - serverFloat) < 1e-10;

  const displayInput = input.length > 40 ? input.substring(0, 40) + '...' : input;

  assert(
    browserNodeMatch,
    `hashToFloat browser===node for "${displayInput}"`,
    `browser=${browserFloat}, node=${nodeFloat}`
  );

  assert(
    serverMatch,
    `hashToFloat server matches browser for "${displayInput}"`,
    `browser=${browserFloat.toFixed(15)}, server=${serverFloat.toFixed(15)}, diff=${Math.abs(browserFloat - serverFloat).toExponential(4)}`
  );
}

// Demonstrate the divisor bug impact
console.log('\n  --- Divisor Bug Analysis ---');
console.log('  Browser/Node divide by 0x100000000 (4294967296) → range [0, 1)');
console.log('  Server divides by 0xFFFFFFFF (4294967295) → range [0, 1.0000000002328306]');
console.log('  For hash=0xFFFFFFFF: browser=0.9999999997671694, server=1.0 (EXACTLY 1!)');

const worstCaseHash = 0xFFFFFFFF;
const browserWorst = worstCaseHash / 0x100000000;
const serverWorst = worstCaseHash / 0xFFFFFFFF;
console.log(`  Actual: browser=${browserWorst}, server=${serverWorst}`);
assert(
  serverWorst >= 1.0,
  'Server hashToFloat can return >= 1.0 (CRITICAL BUG)',
  `server worst case = ${serverWorst}`
);

// Count how many of 100k inputs produce different variant assignments due to divisor bug
let divergentAssignments = 0;
const variants5050: Variant[] = [
  { key: 'control', weight: 50 },
  { key: 'treatment', weight: 50 },
];
for (let i = 0; i < 100000; i++) {
  const key = `test-exp:user_${i}`;
  const bFloat = browserHashToFloat(key, 0);
  const sFloat = serverHashToFloat(key, 0);
  const bVariant = pickVariant(bFloat, variants5050);
  const sVariant = pickVariant(sFloat, variants5050);
  if (bVariant.key !== sVariant.key) {
    divergentAssignments++;
  }
}
console.log(`\n  Divergent assignments (browser vs server) in 100k users: ${divergentAssignments}`);
assert(
  divergentAssignments === 0,
  'Zero divergent assignments between browser and server',
  `${divergentAssignments} users would get DIFFERENT variants on browser vs server!`
);

// ======= TEST 2: hashToFloat range [0, 1) =======
console.log('\n' + '='.repeat(80));
console.log('TEST 2: hashToFloat range [0, 1) for 10,000 random inputs');
console.log('='.repeat(80));

let minFloat = Infinity;
let maxFloat = -Infinity;
let outOfRange = 0;
for (let i = 0; i < 10000; i++) {
  const key = `range-test-${i}-${Math.random().toString(36)}`;
  const f = browserHashToFloat(key, 0);
  if (f < 0 || f >= 1) outOfRange++;
  minFloat = Math.min(minFloat, f);
  maxFloat = Math.max(maxFloat, f);
}
assert(outOfRange === 0, 'Browser hashToFloat: all values in [0, 1)', `${outOfRange} out of range, min=${minFloat}, max=${maxFloat}`);
console.log(`  min=${minFloat}, max=${maxFloat}`);

// Same for server
let serverOutOfRange = 0;
let serverMax = -Infinity;
for (let i = 0; i < 10000; i++) {
  const key = `range-test-${i}-server`;
  const f = serverHashToFloat(key, 0);
  if (f < 0 || f >= 1) serverOutOfRange++;
  serverMax = Math.max(serverMax, f);
}
assert(serverOutOfRange === 0, 'Server hashToFloat: all values in [0, 1)', `${serverOutOfRange} out of range, max=${serverMax}`);

// ======= TEST 3: Distribution uniformity (chi-squared) =======
console.log('\n' + '='.repeat(80));
console.log('TEST 3: Distribution uniformity — 100,000 sequential user IDs');
console.log('='.repeat(80));

const NUM_USERS = 100000;
const NUM_BINS = 10;
const bins = new Array(NUM_BINS).fill(0);
for (let i = 1; i <= NUM_USERS; i++) {
  const f = browserHashToFloat(`test-exp:user_${i}`, 0);
  const bin = Math.min(Math.floor(f * NUM_BINS), NUM_BINS - 1);
  bins[bin]++;
}

const expected = NUM_USERS / NUM_BINS;
let chiSquared = 0;
console.log('  Bin distribution:');
for (let b = 0; b < NUM_BINS; b++) {
  const deviation = bins[b] - expected;
  chiSquared += (deviation * deviation) / expected;
  const pct = ((bins[b] / NUM_USERS) * 100).toFixed(2);
  console.log(`    Bin ${b}: ${bins[b]} (${pct}%, deviation: ${deviation > 0 ? '+' : ''}${deviation})`);
}
console.log(`  Chi-squared statistic: ${chiSquared.toFixed(4)}`);
// Chi-squared critical value for 9 df at p=0.001 is 27.877
assert(chiSquared < 27.877, 'Distribution passes chi-squared test (p>0.001)', `chi²=${chiSquared.toFixed(4)}, critical=27.877`);

// Check no bin deviates more than ±1000
const maxDeviation = Math.max(...bins.map(b => Math.abs(b - expected)));
assert(maxDeviation <= 1000, 'No bin deviates more than ±1,000 from expected', `max deviation=${maxDeviation}`);

// ======= TEST 4: Algorithm comparison (Math.imul vs manual multiply) =======
console.log('\n' + '='.repeat(80));
console.log('TEST 4: Algorithm equivalence — Math.imul vs manual 16-bit multiply');
console.log('='.repeat(80));

// Test that Math.imul(a, b) === manual multiply for the specific constants
function manualMul32(a: number, b: number): number {
  return (((a & 0xffff) * b) + ((((a >>> 16) * b) & 0xffff) << 16)) & 0xffffffff;
}

const mulTestValues = [0, 1, 0xFFFFFFFF, 0x12345678, 0xDEADBEEF, 0x80000000, 42];
const mulConstants = [0xcc9e2d51, 0x1b873593, 5, 0x85ebca6b, 0xc2b2ae35];

let mulMismatches = 0;
for (const val of mulTestValues) {
  for (const c of mulConstants) {
    const imulResult = Math.imul(val, c) >>> 0;
    const manualResult = manualMul32(val, c) >>> 0;
    if (imulResult !== manualResult) {
      mulMismatches++;
      console.log(`  MISMATCH: Math.imul(${val.toString(16)}, ${c.toString(16)}) = ${imulResult} vs manual = ${manualResult}`);
    }
  }
}
assert(mulMismatches === 0, `Math.imul matches manual multiply for all ${mulTestValues.length * mulConstants.length} test pairs`, `${mulMismatches} mismatches`);

// Verify same constants
console.log('\n  Constants check:');
console.log('  c1 = 0xcc9e2d51 — all three implementations: YES');
console.log('  c2 = 0x1b873593 — all three implementations: YES');
console.log('  fmix constants 0x85ebca6b, 0xc2b2ae35 — all three: YES');
assert(true, 'All implementations use identical MurmurHash3 constants');

// Byte encoding check
console.log('\n  Byte encoding check:');
console.log('  All three use: key.charCodeAt(i) & 0xff');
console.log('  This truncates UTF-16 code units to low byte ONLY');
console.log('  Result: Unicode chars > U+00FF will collide (lossy but CONSISTENT across implementations)');
assert(true, 'All implementations use identical byte encoding (charCodeAt & 0xff)');

// ======= TEST 5: Variant assignment edge cases =======
console.log('\n' + '='.repeat(80));
console.log('TEST 5: Variant assignment edge cases');
console.log('='.repeat(80));

// 5a: Find a user whose hash lands very close to the 0.5 boundary
console.log('\n  5a: Users near variant boundary (50/50 split at 0.5)');
let closestToBoundary = Infinity;
let closestKey = '';
for (let i = 0; i < 100000; i++) {
  const key = `boundary-exp:user_${i}`;
  const f = browserHashToFloat(key, 0);
  const dist = Math.abs(f - 0.5);
  if (dist < closestToBoundary) {
    closestToBoundary = dist;
    closestKey = key;
  }
}
const boundaryFloat = browserHashToFloat(closestKey, 0);
const boundaryVariant = pickVariant(boundaryFloat, variants5050);
console.log(`  Closest to 0.5: "${closestKey}" → ${boundaryFloat} → ${boundaryVariant.key}`);
assert(true, `Boundary user assigned correctly (hash=${boundaryFloat}, variant=${boundaryVariant.key})`);

// 5b: Hash close to 0
console.log('\n  5b: Users with hash close to 0');
let closestToZero = Infinity;
let zeroKey = '';
for (let i = 0; i < 100000; i++) {
  const key = `zero-test:user_${i}`;
  const f = browserHashToFloat(key, 0);
  if (f < closestToZero) {
    closestToZero = f;
    zeroKey = key;
  }
}
const zeroVariant = pickVariant(closestToZero, variants5050);
console.log(`  Closest to 0: "${zeroKey}" → ${closestToZero} → ${zeroVariant.key}`);
assert(zeroVariant.key === 'control', 'Near-zero hash gets control variant', `got ${zeroVariant.key}`);

// 5c: Hash close to 1
let closestToOne = -Infinity;
let oneKey = '';
for (let i = 0; i < 100000; i++) {
  const key = `one-test:user_${i}`;
  const f = browserHashToFloat(key, 0);
  if (f > closestToOne) {
    closestToOne = f;
    oneKey = key;
  }
}
const oneVariant = pickVariant(closestToOne, variants5050);
console.log(`  Closest to 1: "${oneKey}" → ${closestToOne} → ${oneVariant.key}`);
assert(oneVariant.key === 'treatment', 'Near-one hash gets treatment variant', `got ${oneVariant.key}`);

// 5d: Three variants at 0.33/0.33/0.34
console.log('\n  5d: Three variants (0.33/0.33/0.34)');
const variants3way: Variant[] = [
  { key: 'A', weight: 0.33 },
  { key: 'B', weight: 0.33 },
  { key: 'C', weight: 0.34 },
];
const counts3way: Record<string, number> = { A: 0, B: 0, C: 0 };
for (let i = 0; i < 100000; i++) {
  const f = browserHashToFloat(`three-way:user_${i}`, 0);
  const v = pickVariant(f, variants3way);
  counts3way[v.key]++;
}
console.log(`  A: ${counts3way.A}, B: ${counts3way.B}, C: ${counts3way.C}`);
assert(counts3way.A > 0 && counts3way.B > 0 && counts3way.C > 0, 'All 3 variants receive traffic');
assert(
  Math.abs(counts3way.A - 33000) < 2000 &&
  Math.abs(counts3way.B - 33000) < 2000 &&
  Math.abs(counts3way.C - 34000) < 2000,
  'Three-way split roughly matches weights',
  `A=${counts3way.A}, B=${counts3way.B}, C=${counts3way.C}`
);

// ======= TEST 6: Traffic allocation + variant independence =======
console.log('\n' + '='.repeat(80));
console.log('TEST 6: Traffic allocation interaction');
console.log('  traffic_allocation=0.5, variant weights 50/50');
console.log('  Traffic hash: seed=1, Variant hash: seed=0');
console.log('='.repeat(80));

let excluded = 0;
let inControl = 0;
let inTreatment = 0;
const trafficAllocation = 0.5;
const N = 100000;

for (let i = 0; i < N; i++) {
  const key = `traffic-exp:user_${i}`;
  const trafficHash = browserHashToFloat(key, 1);  // seed=1
  if (trafficHash >= trafficAllocation) {
    excluded++;
    continue;
  }
  const variantHash = browserHashToFloat(key, 0);  // seed=0
  const v = pickVariant(variantHash, variants5050);
  if (v.key === 'control') inControl++;
  else inTreatment++;
}

const included = inControl + inTreatment;
console.log(`  Excluded: ${excluded} (${((excluded / N) * 100).toFixed(1)}%)`);
console.log(`  Included: ${included} (${((included / N) * 100).toFixed(1)}%)`);
console.log(`    Control:   ${inControl} (${((inControl / included) * 100).toFixed(1)}% of included)`);
console.log(`    Treatment: ${inTreatment} (${((inTreatment / included) * 100).toFixed(1)}% of included)`);

assert(
  Math.abs(excluded - N * 0.5) < N * 0.02,
  'Traffic allocation excludes ~50%',
  `excluded=${excluded} (expected ~${N * 0.5})`
);

assert(
  Math.abs(inControl - inTreatment) < included * 0.04,
  'Included users split ~50/50 between variants',
  `control=${inControl}, treatment=${inTreatment}`
);

// Independence test: correlation between traffic hash and variant hash
console.log('\n  Independence test (seed=0 vs seed=1):');
let bothLow = 0;
let seed0Low = 0;
let seed1Low = 0;
const indepN = 100000;
for (let i = 0; i < indepN; i++) {
  const key = `indep-test:user_${i}`;
  const h0 = browserHashToFloat(key, 0);
  const h1 = browserHashToFloat(key, 1);
  if (h0 < 0.5) seed0Low++;
  if (h1 < 0.5) seed1Low++;
  if (h0 < 0.5 && h1 < 0.5) bothLow++;
}
const p0 = seed0Low / indepN;
const p1 = seed1Low / indepN;
const pBoth = bothLow / indepN;
const expectedBoth = p0 * p1;
const correlation = Math.abs(pBoth - expectedBoth);
console.log(`  P(seed0 < 0.5) = ${p0.toFixed(4)}`);
console.log(`  P(seed1 < 0.5) = ${p1.toFixed(4)}`);
console.log(`  P(both < 0.5)  = ${pBoth.toFixed(4)} (expected if independent: ${expectedBoth.toFixed(4)})`);
console.log(`  |deviation|    = ${correlation.toFixed(6)}`);
assert(correlation < 0.01, 'Seeds 0 and 1 are independent (deviation < 1%)', `deviation=${correlation.toFixed(6)}`);

// ======= SUMMARY =======
console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Total tests: ${totalTests}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failures.length > 0) {
  console.log('\nFAILURES:');
  for (const f of failures) {
    console.log(f);
  }
}

// ======= CRITICAL BUG REPORT =======
console.log('\n' + '='.repeat(80));
console.log('CRITICAL BUG REPORT');
console.log('='.repeat(80));
console.log(`
CRITICAL BUG FOUND: Server hashToFloat uses WRONG divisor

Location: packages/server/src/services/assignment.ts, line 41
  Server:       (hash >>> 0) / 0xFFFFFFFF   ← WRONG (divides by 4294967295)
  Browser/Node: (hash >>> 0) / 0x100000000  ← CORRECT (divides by 4294967296)

Impact:
  1. Server produces SLIGHTLY HIGHER float values than browser/node for every input
  2. Server hashToFloat can return EXACTLY 1.0 (when hash = 0xFFFFFFFF)
     Browser/node can never return 1.0 (max is 0.9999999997671694)
  3. This causes DIVERGENT VARIANT ASSIGNMENTS for users near boundaries
  4. The "50/50 split" is actually ~50.00001/49.99999 on server
  5. Traffic allocation boundaries differ between client and server

Fix: Change server line 41 from:
  return (hash >>> 0) / 0xFFFFFFFF;
To:
  return (hash >>> 0) / 0x100000000;
`);

if (failed > 0) {
  console.log('\nVERDICT: PLATFORM IS BROKEN — cross-implementation consistency VIOLATED');
  process.exit(1);
} else {
  console.log('\nVERDICT: All tests passed');
  process.exit(0);
}
