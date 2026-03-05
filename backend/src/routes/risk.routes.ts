import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import Risk from '../models/Risk.model';
import Program from '../models/Program.model';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { programId, severity, status } = req.query;
    const programs = await Program.find({ createdBy: req.user!.id }).select('_id');
    const filter: any = { programId: { $in: programs.map((p) => p._id) } };
    if (programId) filter.programId = programId;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    const risks = await Risk.find(filter)
      .populate('programId', 'name')
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(risks);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post(
  '/',
  [
    body('title').trim().notEmpty(),
    body('programId').isMongoId(),
    body('severity').isIn(['low', 'medium', 'high', 'critical']),
    body('description').optional().trim(),
    body('mitigationPlan').optional().trim(),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const program = await Program.findOne({ _id: req.body.programId, createdBy: req.user!.id });
      if (!program) return res.status(404).json({ error: 'Program not found' });
      const risk = await Risk.create({
        ...req.body,
        reportedBy: req.user!.id,
      });
      const populated = await Risk.findById(risk._id)
        .populate('programId', 'name')
        .populate('reportedBy', 'name email');
      res.status(201).json(populated);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  }
);

router.get('/:id', param('id').isMongoId(), async (req: AuthRequest, res) => {
  try {
    const risk = await Risk.findById(req.params.id)
      .populate('programId', 'name')
      .populate('reportedBy', 'name email');
    if (!risk) return res.status(404).json({ error: 'Risk not found' });
    const program = await Program.findOne({ _id: risk.programId, createdBy: req.user!.id });
    if (!program) return res.status(404).json({ error: 'Risk not found' });
    res.json(risk);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.patch(
  '/:id',
  param('id').isMongoId(),
  body('status').optional().isIn(['open', 'mitigating', 'resolved', 'accepted']),
  body('mitigationPlan').optional().trim(),
  async (req: AuthRequest, res) => {
    try {
      const risk = await Risk.findById(req.params.id);
      if (!risk) return res.status(404).json({ error: 'Risk not found' });
      const program = await Program.findOne({ _id: risk.programId, createdBy: req.user!.id });
      if (!program) return res.status(404).json({ error: 'Risk not found' });
      Object.assign(risk, req.body);
      await risk.save();
      const populated = await Risk.findById(risk._id)
        .populate('programId', 'name')
        .populate('reportedBy', 'name email');
      res.json(populated);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  }
);

router.delete('/:id', param('id').isMongoId(), async (req: AuthRequest, res) => {
  try {
    const risk = await Risk.findById(req.params.id);
    if (!risk) return res.status(404).json({ error: 'Risk not found' });
    const program = await Program.findOne({ _id: risk.programId, createdBy: req.user!.id });
    if (!program) return res.status(404).json({ error: 'Risk not found' });
    await risk.deleteOne();
    res.json({ message: 'Risk deleted' });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
