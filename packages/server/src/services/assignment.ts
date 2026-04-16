import murmurhash from 'murmurhash-js';
import { query, queryOne } from '../db/pool';
import { evaluateTargeting, TargetingCondition } from './targeting';

interface Variant {
  id: string;
  key: string;
  name: string;
  weight: number;
  payload: any;
  is_control: boolean;
}

interface Experiment {
  id: string;
  project_id: string;
  key: string;
  name: string;
  status: string;
  traffic_allocation: number;
  targeting_rules: TargetingCondition[];
  mutual_exclusion_group: string | null;
}

interface AssignmentResult {
  variant: string;
  payload: any;
  inExperiment: boolean;
}

// In-memory cache for experiment configs to avoid DB lookups on hot path
const experimentCache = new Map<string, { experiment: Experiment; variants: Variant[]; expires: number }>();
const CACHE_TTL = 10_000; // 10s — short TTL so changes propagate fast

/**
 * Hash a string to a deterministic float in [0, 1).
 * MurmurHash3 produces a 32-bit integer; we normalize to [0, 1).
 */
function hashToFloat(input: string, seed: number = 0): number {
  const hash = murmurhash.murmur3(input, seed);
  return (hash >>> 0) / 0xFFFFFFFF;
}

/**
 * Load experiment + variants, with caching.
 */
async function loadExperiment(
  projectId: string,
  experimentKey: string
): Promise<{ experiment: Experiment; variants: Variant[] } | null> {
  const cacheKey = `${projectId}:${experimentKey}`;
  const cached = experimentCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return { experiment: cached.experiment, variants: cached.variants };
  }

  const experiment = await queryOne<Experiment>(
    `SELECT id, project_id, key, name, status, traffic_allocation,
            targeting_rules, mutual_exclusion_group
     FROM experiments
     WHERE project_id = $1 AND key = $2`,
    [projectId, experimentKey]
  );

  if (!experiment) return null;

  const variants = await query<Variant>(
    `SELECT id, key, name, weight, payload, is_control
     FROM variants
     WHERE experiment_id = $1
     ORDER BY is_control DESC, key ASC`,
    [experiment.id]
  );

  experimentCache.set(cacheKey, {
    experiment,
    variants,
    expires: Date.now() + CACHE_TTL,
  });

  return { experiment, variants };
}

/**
 * Check if user is already in a mutually exclusive experiment in the same group.
 */
async function isInMutualExclusionConflict(
  userId: string,
  experimentId: string,
  group: string,
  projectId: string
): Promise<boolean> {
  const result = await queryOne<{ cnt: string }>(
    `SELECT COUNT(*) as cnt
     FROM assignments a
     JOIN experiments e ON e.id = a.experiment_id
     WHERE a.user_id = $1
       AND e.mutual_exclusion_group = $2
       AND e.project_id = $3
       AND e.id != $4
       AND e.status = 'running'`,
    [userId, group, projectId, experimentId]
  );
  return result ? parseInt(result.cnt, 10) > 0 : false;
}

/**
 * Pick a variant based on the hash value and variant weights.
 * Weights are normalized to sum to 1.
 */
function pickVariant(hashValue: number, variants: Variant[]): Variant {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  let cumulative = 0;

  for (const variant of variants) {
    cumulative += variant.weight / totalWeight;
    if (hashValue < cumulative) {
      return variant;
    }
  }

  // Fallback to last variant (floating point edge case)
  return variants[variants.length - 1];
}

/**
 * Core assignment function.
 * Deterministic: same (experimentKey, userId) always produces same variant.
 */
export async function assignVariant(
  projectId: string,
  experimentKey: string,
  userId: string,
  context?: Record<string, any>
): Promise<AssignmentResult> {
  const NOT_IN_EXPERIMENT: AssignmentResult = {
    variant: 'control',
    payload: {},
    inExperiment: false,
  };

  // Load experiment config
  const loaded = await loadExperiment(projectId, experimentKey);
  if (!loaded) {
    return NOT_IN_EXPERIMENT;
  }

  const { experiment, variants } = loaded;

  // Experiment must be running
  if (experiment.status !== 'running') {
    return NOT_IN_EXPERIMENT;
  }

  // Must have variants
  if (variants.length === 0) {
    return NOT_IN_EXPERIMENT;
  }

  // Check existing assignment first (fast path)
  const existing = await queryOne<{ variant_key: string; payload: any }>(
    `SELECT v.key as variant_key, v.payload
     FROM assignments a
     JOIN variants v ON v.id = a.variant_id
     WHERE a.experiment_id = $1 AND a.user_id = $2`,
    [experiment.id, userId]
  );

  if (existing) {
    return {
      variant: existing.variant_key,
      payload: existing.payload,
      inExperiment: true,
    };
  }

  // Evaluate targeting rules
  if (context && experiment.targeting_rules && experiment.targeting_rules.length > 0) {
    const targeted = evaluateTargeting(experiment.targeting_rules, context);
    if (!targeted) {
      return NOT_IN_EXPERIMENT;
    }
  }

  // Traffic allocation check — use a different seed so it's independent of variant assignment
  const trafficHash = hashToFloat(`${experimentKey}:${userId}`, 1);
  if (trafficHash >= experiment.traffic_allocation) {
    return NOT_IN_EXPERIMENT;
  }

  // Mutual exclusion check
  if (experiment.mutual_exclusion_group) {
    const conflict = await isInMutualExclusionConflict(
      userId,
      experiment.id,
      experiment.mutual_exclusion_group,
      experiment.project_id
    );
    if (conflict) {
      return NOT_IN_EXPERIMENT;
    }
  }

  // Deterministic variant assignment
  const variantHash = hashToFloat(`${experimentKey}:${userId}`, 0);
  const selectedVariant = pickVariant(variantHash, variants);

  // Persist assignment (upsert to handle race conditions)
  await queryOne(
    `INSERT INTO assignments (experiment_id, user_id, variant_id, context)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (experiment_id, user_id) DO NOTHING`,
    [experiment.id, userId, selectedVariant.id, JSON.stringify(context || {})]
  );

  return {
    variant: selectedVariant.key,
    payload: selectedVariant.payload,
    inExperiment: true,
  };
}

/**
 * Bulk assignment for multiple experiments at once.
 */
export async function assignVariantBulk(
  projectId: string,
  experimentKeys: string[],
  userId: string,
  context?: Record<string, any>
): Promise<Record<string, AssignmentResult>> {
  const results: Record<string, AssignmentResult> = {};

  // Run assignments in parallel
  await Promise.all(
    experimentKeys.map(async (key) => {
      results[key] = await assignVariant(projectId, key, userId, context);
    })
  );

  return results;
}

/**
 * Clear the experiment cache (useful after experiment updates).
 */
export function clearExperimentCache(projectId?: string, experimentKey?: string): void {
  if (projectId && experimentKey) {
    experimentCache.delete(`${projectId}:${experimentKey}`);
  } else {
    experimentCache.clear();
  }
}
