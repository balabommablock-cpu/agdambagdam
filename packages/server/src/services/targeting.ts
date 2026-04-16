export interface TargetingRule {
  attribute: string;
  operator: string;
  value: any;
}

export interface TargetingCondition {
  rules: TargetingRule[];
  logic?: 'and' | 'or';
}

/**
 * Evaluate a single targeting rule against a context value.
 */
function evaluateRule(rule: TargetingRule, context: Record<string, any>): boolean {
  const contextValue = context[rule.attribute];

  switch (rule.operator) {
    case 'equals':
    case 'eq':
      return contextValue === rule.value;

    case 'not_equals':
    case 'neq':
      return contextValue !== rule.value;

    case 'contains':
      if (typeof contextValue === 'string') {
        return contextValue.includes(String(rule.value));
      }
      if (Array.isArray(contextValue)) {
        return contextValue.includes(rule.value);
      }
      return false;

    case 'gt':
      return typeof contextValue === 'number' && contextValue > Number(rule.value);

    case 'lt':
      return typeof contextValue === 'number' && contextValue < Number(rule.value);

    case 'gte':
      return typeof contextValue === 'number' && contextValue >= Number(rule.value);

    case 'lte':
      return typeof contextValue === 'number' && contextValue <= Number(rule.value);

    case 'in':
      if (Array.isArray(rule.value)) {
        return rule.value.includes(contextValue);
      }
      return false;

    case 'not_in':
      if (Array.isArray(rule.value)) {
        return !rule.value.includes(contextValue);
      }
      return true;

    case 'regex':
      if (typeof contextValue === 'string') {
        try {
          return new RegExp(String(rule.value)).test(contextValue);
        } catch {
          return false;
        }
      }
      return false;

    case 'exists':
      return rule.value ? contextValue !== undefined && contextValue !== null : contextValue === undefined || contextValue === null;

    default:
      return false;
  }
}

/**
 * Evaluate a single targeting condition (a group of rules combined with AND/OR).
 */
function evaluateCondition(condition: TargetingCondition, context: Record<string, any>): boolean {
  const logic = condition.logic || 'and';

  if (logic === 'and') {
    return condition.rules.every((rule) => evaluateRule(rule, context));
  } else {
    return condition.rules.some((rule) => evaluateRule(rule, context));
  }
}

/**
 * Evaluate an array of targeting conditions.
 * Multiple conditions are OR'd together (user must match at least one condition group).
 * Within each condition, rules are combined with the condition's logic (default AND).
 *
 * Empty rules array means "target everyone".
 */
/**
 * Normalize input that may be flat rules or proper conditions.
 * Flat format: [{attribute, operator, value}, ...]
 * Proper format: [{rules: [...], logic: "and"}, ...]
 *
 * Detects by checking whether the first element has a `rules` property.
 */
function normalizeConditions(input: any[]): TargetingCondition[] {
  if (input.length === 0) return [];

  // If the first element has a `rules` array, assume proper TargetingCondition[] format
  if (Array.isArray((input[0] as any).rules)) {
    return input as TargetingCondition[];
  }

  // Otherwise treat the entire array as flat TargetingRule[] and wrap it
  return [{ rules: input as TargetingRule[], logic: 'and' }];
}

export function evaluateTargeting(
  conditions: TargetingCondition[] | TargetingRule[],
  context: Record<string, any>
): boolean {
  if (!conditions || conditions.length === 0) {
    return true; // No targeting = everyone qualifies
  }

  const normalized = normalizeConditions(conditions as any[]);
  return normalized.some((condition) => evaluateCondition(condition, context));
}
