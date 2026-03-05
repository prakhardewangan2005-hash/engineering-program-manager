import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import Sprint from '../models/Sprint.model';
import Program from '../models/Program.model';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { programId, status } = req.query;
    const filter: any = {};
    if (programId) filter.programId = programId;
    if (status) filter.status = status;
    const programs = await Program.find({ createdBy: req.user!.id }).select('_id');
    filter.programId = { $in: programs.map((p) => p._id) };
    const sprints = await Sprint.find(filter)
      .populate('programId', 'name')
      .populate('createdBy', 'name')
      .populate('tasks.assigneeId', 'name email')
      .sort({ startDate: -1 });
    res.json(sprints);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('programId').isMongoId(),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('goal').optional().trim(),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const program = await Program.findOne({ _id: req.body.programId, createdBy: req.user!.id });
      if (!program) return res.status(404).json({ error: 'Program not found' });
      const sprint = await Sprint.create({
        ...req.body,
        createdBy: req.user!.id,
        tasks: req.body.tasks || [],
      });
      const populated = await Sprint.findById(sprint._id)
        .populate('programId', 'name')
        .populate('createdBy', 'name');
      res.status(201).json(populated);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  }
);

router.get('/:id', param('id').isMongoId(), async (req: AuthRequest, res) => {
  try {
    const sprint = await Sprint.findById(req.params.id)
      .populate('programId', 'name')
      .populate('createdBy', 'name')
      .populate('tasks.assigneeId', 'name email');
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
    const program = await Program.findOne({ _id: sprint.programId, createdBy: req.user!.id });
    if (!program) return res.status(404).json({ error: 'Sprint not found' });
    res.json(sprint);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.patch(
  '/:id',
  param('id').isMongoId(),
  body('status').optional().isIn(['planned', 'active', 'completed']),
  async (req: AuthRequest, res) => {
    try {
      const sprint = await Sprint.findById(req.params.id);
      if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
      const program = await Program.findOne({ _id: sprint.programId, createdBy: req.user!.id });
      if (!program) return res.status(404).json({ error: 'Sprint not found' });
      Object.assign(sprint, req.body);
      await sprint.save();
      const populated = await Sprint.findById(sprint._id)
        .populate('programId', 'name')
        .populate('tasks.assigneeId', 'name email');
      res.json(populated);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  }
);

// Tasks
router.post(
  '/:id/tasks',
  param('id').isMongoId(),
  body('title').trim().notEmpty(),
  body('description').optional().trim(),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('assigneeId').optional().isMongoId(),
  body('storyPoints').optional().isInt({ min: 0 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  async (req: AuthRequest, res) => {
    try {
      const sprint = await Sprint.findById(req.params.id);
      if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
      const program = await Program.findOne({ _id: sprint.programId, createdBy: req.user!.id });
      if (!program) return res.status(404).json({ error: 'Sprint not found' });
      sprint.tasks.push({
        ...req.body,
        status: req.body.status || 'todo',
        priority: req.body.priority || 'medium',
      });
      await sprint.save();
      const populated = await Sprint.findById(sprint._id)
        .populate('programId', 'name')
        .populate('tasks.assigneeId', 'name email');
      res.status(201).json(populated);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  }
);

router.patch(
  '/:id/tasks/:taskId',
  param('id').isMongoId(),
  param('taskId').isMongoId(),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('assigneeId').optional(),
  async (req: AuthRequest, res) => {
    try {
      const sprint = await Sprint.findById(req.params.id);
      if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
      const program = await Program.findOne({ _id: sprint.programId, createdBy: req.user!.id });
      if (!program) return res.status(404).json({ error: 'Sprint not found' });
      const task = sprint.tasks.id(req.params.taskId);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      if (req.body.assigneeId === '') req.body.assigneeId = undefined;
      Object.assign(task, req.body);
      await sprint.save();
      const populated = await Sprint.findById(sprint._id)
        .populate('programId', 'name')
        .populate('tasks.assigneeId', 'name email');
      res.json(populated);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  }
);

router.delete('/:id/tasks/:taskId', param('id').isMongoId(), param('taskId').isMongoId(), async (req: AuthRequest, res) => {
  try {
    const sprint = await Sprint.findById(req.params.id);
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
    const program = await Program.findOne({ _id: sprint.programId, createdBy: req.user!.id });
    if (!program) return res.status(404).json({ error: 'Sprint not found' });
    sprint.tasks.pull(req.params.taskId);
    await sprint.save();
    res.json(await Sprint.findById(sprint._id).populate('tasks.assigneeId', 'name email'));
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
