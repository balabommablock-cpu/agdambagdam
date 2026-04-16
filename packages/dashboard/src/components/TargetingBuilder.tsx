import { Plus, Trash2, ChevronDown } from 'lucide-react';

interface Condition {
  id: string;
  attribute: string;
  operator: string;
  value: string;
}

interface ConditionGroup {
  id: string;
  logic: 'and' | 'or';
  conditions: Condition[];
}

interface TargetingBuilderProps {
  groups: ConditionGroup[];
  onChange: (groups: ConditionGroup[]) => void;
}

const ATTRIBUTES = [
  { value: 'country', label: 'Country' },
  { value: 'browser', label: 'Browser' },
  { value: 'device', label: 'Device Type' },
  { value: 'os', label: 'Operating System' },
  { value: 'plan', label: 'Plan' },
  { value: 'language', label: 'Language' },
  { value: 'is_logged_in', label: 'Logged In' },
  { value: 'custom', label: 'Custom Attribute' },
];

const OPERATORS = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'gt', label: 'greater than' },
  { value: 'lt', label: 'less than' },
  { value: 'in', label: 'is one of' },
  { value: 'not_in', label: 'is not one of' },
  { value: 'exists', label: 'exists' },
  { value: 'not_exists', label: 'does not exist' },
];

let nextId = 1;
const genId = () => `cond_${nextId++}`;

export default function TargetingBuilder({ groups, onChange }: TargetingBuilderProps) {
  const addGroup = () => {
    onChange([
      ...groups,
      {
        id: genId(),
        logic: 'and',
        conditions: [{ id: genId(), attribute: 'country', operator: 'eq', value: '' }],
      },
    ]);
  };

  const removeGroup = (groupId: string) => {
    onChange(groups.filter((g) => g.id !== groupId));
  };

  const updateGroupLogic = (groupId: string, logic: 'and' | 'or') => {
    onChange(groups.map((g) => (g.id === groupId ? { ...g, logic } : g)));
  };

  const addCondition = (groupId: string) => {
    onChange(
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              conditions: [
                ...g.conditions,
                { id: genId(), attribute: 'country', operator: 'eq', value: '' },
              ],
            }
          : g
      )
    );
  };

  const removeCondition = (groupId: string, conditionId: string) => {
    onChange(
      groups.map((g) =>
        g.id === groupId
          ? { ...g, conditions: g.conditions.filter((c) => c.id !== conditionId) }
          : g
      )
    );
  };

  const updateCondition = (groupId: string, conditionId: string, field: keyof Condition, value: string) => {
    onChange(
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              conditions: g.conditions.map((c) =>
                c.id === conditionId ? { ...c, [field]: value } : c
              ),
            }
          : g
      )
    );
  };

  const matchEstimate = estimateMatch(groups);

  return (
    <div className="space-y-4">
      {groups.length === 0 && (
        <div className="text-center py-8 px-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          <p className="text-sm text-slate-500 mb-3">
            No targeting rules. This experiment will target all users.
          </p>
          <button type="button" onClick={addGroup} className="btn-secondary text-sm">
            <Plus className="w-4 h-4" />
            Add Targeting Rule
          </button>
        </div>
      )}

      {groups.map((group, gi) => (
        <div key={group.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          {/* Group header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800">
            <div className="flex items-center gap-2">
              {gi > 0 && (
                <span className="text-xs font-semibold text-primary-600 uppercase tracking-wider mr-1">
                  OR
                </span>
              )}
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Rule Group {gi + 1}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Logic toggle */}
              <div className="flex items-center bg-white dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600">
                <button
                  type="button"
                  onClick={() => updateGroupLogic(group.id, 'and')}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors ${
                    group.logic === 'and'
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  AND
                </button>
                <button
                  type="button"
                  onClick={() => updateGroupLogic(group.id, 'or')}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors ${
                    group.logic === 'or'
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  OR
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeGroup(group.id)}
                className="p-1 text-slate-400 hover:text-danger-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Conditions */}
          <div className="p-4 space-y-2">
            {group.conditions.map((condition, ci) => (
              <div key={condition.id} className="flex items-center gap-2">
                {ci > 0 && (
                  <span className="text-[11px] font-semibold text-slate-400 uppercase w-8 text-center shrink-0">
                    {group.logic}
                  </span>
                )}
                {ci === 0 && <span className="w-8 shrink-0" />}

                <div className="relative flex-1 max-w-[180px]">
                  <select
                    value={condition.attribute}
                    onChange={(e) => updateCondition(group.id, condition.id, 'attribute', e.target.value)}
                    className="input appearance-none pr-8"
                  >
                    {ATTRIBUTES.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                <div className="relative flex-1 max-w-[180px]">
                  <select
                    value={condition.operator}
                    onChange={(e) => updateCondition(group.id, condition.id, 'operator', e.target.value)}
                    className="input appearance-none pr-8"
                  >
                    {OPERATORS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                {condition.operator !== 'exists' && condition.operator !== 'not_exists' && (
                  <input
                    type="text"
                    value={condition.value}
                    onChange={(e) => updateCondition(group.id, condition.id, 'value', e.target.value)}
                    placeholder="Value..."
                    className="input flex-1"
                  />
                )}

                <button
                  type="button"
                  onClick={() => removeCondition(group.id, condition.id)}
                  className="p-1.5 text-slate-400 hover:text-danger-500 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addCondition(group.id)}
              className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium mt-2 ml-10"
            >
              <Plus className="w-3.5 h-3.5" />
              Add condition
            </button>
          </div>
        </div>
      ))}

      {groups.length > 0 && (
        <button type="button" onClick={addGroup} className="btn-secondary text-sm w-full justify-center">
          <Plus className="w-4 h-4" />
          Add Rule Group (OR)
        </button>
      )}

      {/* Match preview */}
      {groups.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="w-2 h-2 bg-primary-500 rounded-full" />
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Estimated reach: <span className="font-semibold text-slate-900 dark:text-white">{matchEstimate}</span>
          </span>
        </div>
      )}
    </div>
  );
}

function estimateMatch(groups: ConditionGroup[]): string {
  if (groups.length === 0) return '100% of users';
  const filled = groups.flatMap((g) => g.conditions).filter((c) => c.value || c.operator === 'exists' || c.operator === 'not_exists');
  if (filled.length === 0) return 'Configure conditions to see estimate';
  return `Subset of users matching ${filled.length} condition${filled.length > 1 ? 's' : ''}`;
}
