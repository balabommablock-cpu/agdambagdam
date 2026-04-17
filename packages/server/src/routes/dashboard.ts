import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db/pool';
import { authenticate } from '../middleware/auth';
import { sendError } from '../lib/errors';

/**
 * Dashboard overview stats. Powers the four metric cards + side panels on
 * the Dashboard.tsx home page. Aggregated by project, scoped to the last
 * 7 days where windowed.
 */

const router = Router();
router.use(authenticate);

router.get('/stats', async (req: Request, res: Response) => {
  const projectId = req.projectId;
  if (!projectId) {
    sendError(res, 'MISSING_PROJECT_ID');
    return;
  }

  // Active experiments (status = running)
  const activeExperimentsRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM experiments
     WHERE project_id = $1 AND status = 'running'`,
    [projectId],
  );

  // Total events in the last 7 days
  const totalEventsRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM events
     WHERE project_id = $1 AND timestamp >= now() - interval '7 days'`,
    [projectId],
  );

  // Distinct users in the last 7 days (powers "Unique Users (7d)" card)
  const uniqueUsersRow = await queryOne<{ count: string }>(
    `SELECT COUNT(DISTINCT user_id)::text AS count FROM events
     WHERE project_id = $1 AND timestamp >= now() - interval '7 days'`,
    [projectId],
  );

  // Enabled feature flags
  const totalFlagsRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM feature_flags
     WHERE project_id = $1 AND enabled = TRUE`,
    [projectId],
  );

  // Recent activity — last 10 events with their experiment context, joined
  // through the assignments table. Plain enough that the dashboard's
  // "Recent Activity" panel feels live without us standing up a real
  // audit_log query.
  const recentActivity = await query<{
    id: string;
    action: string;
    experimentName: string;
    experimentId: string;
    timestamp: string;
    user: string;
  }>(
    `SELECT e.id::text AS id,
            'Conversion: ' || e.metric_key AS action,
            COALESCE(exp.name, e.metric_key) AS "experimentName",
            COALESCE(exp.id::text, '') AS "experimentId",
            e.timestamp::text AS timestamp,
            substring(e.user_id from 1 for 18) AS "user"
     FROM events e
     LEFT JOIN assignments a ON a.user_id = e.user_id
     LEFT JOIN experiments exp ON exp.id = a.experiment_id
                                AND exp.project_id = e.project_id
     WHERE e.project_id = $1
     ORDER BY e.timestamp DESC
     LIMIT 10`,
    [projectId],
  );

  // Experiments needing attention — placeholder for now (SRM detection
  // lives elsewhere). Returning an empty array keeps the panel tidy with
  // the "All experiments are running smoothly" empty-state.
  const experimentsNeedingAttention: Array<{
    id: string;
    name: string;
    reason: string;
    status: string;
  }> = [];

  res.json({
    activeExperiments: parseInt(activeExperimentsRow?.count ?? '0', 10),
    totalEvents: parseInt(totalEventsRow?.count ?? '0', 10),
    uniqueUsers: parseInt(uniqueUsersRow?.count ?? '0', 10),
    totalFlags: parseInt(totalFlagsRow?.count ?? '0', 10),
    experimentsNeedingAttention,
    recentActivity,
  });
});

export default router;
