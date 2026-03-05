import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import Program from '../models/Program.model';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const programs = await Program.find({ createdBy: req.user!.id })
      .populate('createdBy', 'name email')
      .sort({ updatedAt: -1 });
    res.json(programs);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post(
  '/',
  [body('name').trim().notEmpty(), body('description').optional().trim()],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const program = await Program.create({
        name: req.body.name,
        description: req.body.description,
        createdBy: req.user!.id,
        milestones: req.body.milestones || [],
        initiatives: req.body.initiatives || [],
      });
      res.status(201).json(program);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  }
);

router.get('/:id', param('id').isMongoId(), async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const program = await Program.findOne({ _id: req.params.id, createdBy: req.user!.id })
      .populate('createdBy', 'name email');
    if (!program) return res.status(404).json({ error: 'Program not found' });
    res.json(program);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.patch(
  '/:id',
  param('id').isMongoId(),
  body('name').optional().trim().notEmpty(),
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const program = await Program.findOneAndUpdate(
        { _id: req.params.id, createdBy: req.user!.id },
        { $set: req.body },
        { new: true }
      );
      if (!program) return res.status(404).json({ error: 'Program not found' });
      res.json(program);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  }
);

router.delete('/:id', param('id').isMongoId(), async (req: AuthRequest, res) => {
  try {
    const program = await Program.findOneAndDelete({ _id: req.params.id, createdBy: req.user!.id });
    if (!program) return res.status(404).json({ error: 'Program not found' });
    res.json({ message: 'Program deleted' });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Milestones
router.post(
  '/:id/milestones',
  param('id').isMongoId(),
  body('title').trim().notEmpty(),
  body('dueDate').isISO8601(),
  body('status').optional().isIn(['pending', 'in_progress', 'completed']),
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const program = await Program.findOneAndUpdate(
        { _id: req.params.id, createdBy: req.user!.id },
        { $push: { milestones: req.body } },
        { new: true }
      );
      if (!program) return res.status(404).json({ error: 'Program not found' });
      res.json(program);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  }
);

router.patch(
  '/:id/milestones/:milestoneId',
  param('id').isMongoId(),
  param('milestoneId').isMongoId(),
  async (req: AuthRequest, res) => {
    try {
      const program = await Program.findOne({ _id: req.params.id, createdBy: req.user!.id });
      if (!program) return res.status(404).json({ error: 'Program not found' });
      const m = program.milestones.id(req.params.milestoneId);
      if (!m) return res.status(404).json({ error: 'Milestone not found' });
      Object.assign(m, req.body);
      await program.save();
      res.json(program);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  }
);

// Initiatives
router.post(
  '/:id/initiatives',
  param('id').isMongoId(),
  body('title').trim().notEmpty(),
  body('description').optional().trim(),
  body('status').optional().isIn(['planned', 'active', 'completed']),
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const program = await Program.findOneAndUpdate(
        { _id: req.params.id, createdBy: req.user!.id },
        { $push: { initiatives: req.body } },
        { new: true }
      );
      if (!program) return res.status(404).json({ error: 'Program not found' });
      res.json(program);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  }
);

router.patch(
  '/:id/initiatives/:initiativeId',
  param('id').isMongoId(),
  param('initiativeId').isMongoId(),
  async (req: AuthRequest, res) => {
    try {
      const program = await Program.findOne({ _id: req.params.id, createdBy: req.user!.id });
      if (!program) return res.status(404).json({ error: 'Program not found' });
      const i = program.initiatives.id(req.params.initiativeId);
      if (!i) return res.status(404).json({ error: 'Initiative not found' });
      Object.assign(i, req.body);
      await program.save();
      res.json(program);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  }
);

export default router;
