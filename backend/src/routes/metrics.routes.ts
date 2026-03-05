import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import MetricsSnapshot from '../models/MetricsSnapshot.model';
import Sprint from '../models/Sprint.model';
import Program from '../models/Program.model';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get(
  '/dashboard',
  query('programId').optional().isMongoId(),
  async (req: AuthRequest, res) => {
    try {
      const programs = await Program.find({ createdBy: req.user!.id }).select('_id');
      const programIds = programs.map((p) => p._id);
      const programId = req.query.programId as string | undefined;
      const filter = programId && programIds.some((id) => id.toString() === programId)
        ? { programId }
        : { programId: { $in: programIds } };

      const snapshots = await MetricsSnapshot.find(filter).sort({ periodEnd: -1 }).limit(12);
      const sprints = await Sprint.find({ programId: { $in: programIds }, status: 'completed' })
        .populate('programId', 'name')
        .sort({ endDate: -1 })
        .limit(10);

      const velocityHistory = snapshots.map((s) => ({
        period: s.periodEnd,
        velocity: s.velocity,
        deploymentFrequency: s.deploymentFrequency,
        bugRate: s.bugRate,
        featureCompletionPercent: s.featureCompletionPercent,
      }));

      const latest = snapshots[0];
      res.json({
        velocity: latest?.velocity ?? 0,
        deploymentFrequency: latest?.deploymentFrequency ?? 0,
        bugRate: latest?.bugRate ?? 0,
        featureCompletionPercent: latest?.featureCompletionPercent ?? 0,
        velocityHistory,
        recentSprints: sprints,
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  }
);

router.post(
  '/snapshot',
  [
    body('programId').isMongoId(),
    body('periodStart').isISO8601(),
    body('periodEnd').isISO8601(),
    body('velocity').isFloat({ min: 0 }),
    body('deploymentFrequency').isFloat({ min: 0 }),
    body('bugRate').isFloat({ min: 0 }),
    body('featureCompletionPercent').isFloat({ min: 0, max: 100 }),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const program = await Program.findOne({ _id: req.body.programId, createdBy: req.user!.id });
      if (!program) return res.status(404).json({ error: 'Program not found' });
      const snapshot = await MetricsSnapshot.create({
        programId: req.body.programId,
        sprintId: req.body.sprintId,
        periodStart: req.body.periodStart,
        periodEnd: req.body.periodEnd,
        velocity: req.body.velocity,
        deploymentFrequency: req.body.deploymentFrequency,
        bugRate: req.body.bugRate,
        featureCompletionPercent: req.body.featureCompletionPercent,
      });
      res.status(201).json(snapshot);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  }
);

export default router;
