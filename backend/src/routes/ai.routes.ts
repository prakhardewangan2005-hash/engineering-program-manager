import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import OpenAI from 'openai';
import Sprint from '../models/Sprint.model';
import Program from '../models/Program.model';
import Risk from '../models/Risk.model';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function getPlaceholderDelayPrediction(sprint: any): string {
  const total = sprint.tasks.length;
  const done = sprint.tasks.filter((t: any) => t.status === 'done').length;
  const remaining = total - done;
  const totalPoints = sprint.tasks.reduce((acc: number, t: any) => acc + (t.storyPoints || 0), 0);
  const completedPoints = sprint.tasks
    .filter((t: any) => t.status === 'done')
    .reduce((acc: number, t: any) => acc + (t.storyPoints || 0), 0);
  if (remaining === 0) return 'Sprint is on track; all tasks are done.';
  const percentComplete = total ? (done / total) * 100 : 0;
  if (percentComplete < 50) return `Risk of delay: only ${Math.round(percentComplete)}% tasks complete. Consider scope reduction or adding capacity.`;
  return `Moderate risk: ${remaining} tasks remaining. Velocity suggests possible slip if no scope change.`;
}

router.get(
  '/predict-delay',
  query('sprintId').isMongoId(),
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const sprint = await Sprint.findById(req.query.sprintId)
        .populate('programId', 'name')
        .populate('tasks.assigneeId', 'name');
      if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
      const program = await Program.findOne({ _id: sprint.programId, createdBy: req.user!.id });
      if (!program) return res.status(404).json({ error: 'Sprint not found' });

      const summary = {
        name: sprint.name,
        status: sprint.status,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        totalTasks: sprint.tasks.length,
        doneTasks: sprint.tasks.filter((t) => t.status === 'done').length,
        inProgress: sprint.tasks.filter((t) => t.status === 'in_progress').length,
        totalStoryPoints: sprint.tasks.reduce((acc, t) => acc + (t.storyPoints || 0), 0),
        completedPoints: sprint.tasks
          .filter((t) => t.status === 'done')
          .reduce((acc, t) => acc + (t.storyPoints || 0), 0),
      };

      let prediction: string;
      if (openai) {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an engineering program manager. In 2-4 sentences, predict if this sprint is at risk of delay and suggest one concrete action.',
            },
            {
              role: 'user',
              content: `Sprint: ${JSON.stringify(summary)}. Today's date: ${new Date().toISOString().slice(0, 10)}.`,
            },
          ],
          max_tokens: 200,
        });
        prediction = completion.choices[0]?.message?.content?.trim() || getPlaceholderDelayPrediction(sprint);
      } else {
        prediction = getPlaceholderDelayPrediction(sprint);
      }
      res.json({ sprintId: sprint._id, prediction });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  }
);

router.get(
  '/weekly-summary',
  query('programId').isMongoId(),
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const program = await Program.findOne({
        _id: req.query.programId,
        createdBy: req.user!.id,
      });
      if (!program) return res.status(404).json({ error: 'Program not found' });

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const [sprints, risks] = await Promise.all([
        Sprint.find({ programId: program._id, updatedAt: { $gte: weekAgo } })
          .populate('tasks.assigneeId', 'name')
          .sort({ endDate: -1 }),
        Risk.find({ programId: program._id }).populate('reportedBy', 'name'),
      ]);

      const payload = {
        programName: program.name,
        milestones: program.milestones,
        initiatives: program.initiatives,
        sprints: sprints.map((s) => ({
          name: s.name,
          status: s.status,
          tasksTotal: s.tasks.length,
          tasksDone: s.tasks.filter((t) => t.status === 'done').length,
        })),
        risks: risks.map((r) => ({ title: r.title, severity: r.severity, status: r.status })),
      };

      let summary: string;
      if (openai) {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Summarize this engineering program status in 3-5 bullet points for stakeholders. Be concise and highlight risks and progress.',
            },
            { role: 'user', content: JSON.stringify(payload) },
          ],
          max_tokens: 400,
        });
        summary = completion.choices[0]?.message?.content?.trim() || 'Summary unavailable.';
      } else {
        summary = [
          `Program: ${program.name}.`,
          `Sprints: ${sprints.length} updated this week; ${sprints.filter((s) => s.status === 'completed').length} completed.`,
          `Risks: ${risks.filter((r) => r.status === 'open' || r.status === 'mitigating').length} open.`,
        ].join(' ');
      }
      res.json({ programId: program._id, summary });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  }
);

export default router;
