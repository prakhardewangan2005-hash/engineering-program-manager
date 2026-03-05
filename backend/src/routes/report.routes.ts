import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import PDFDocument from 'pdfkit';
import Program from '../models/Program.model';
import Sprint from '../models/Sprint.model';
import Risk from '../models/Risk.model';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get(
  '/status',
  query('programId').isMongoId(),
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const program = await Program.findOne({
        _id: req.query.programId,
        createdBy: req.user!.id,
      }).populate('createdBy', 'name email');
      if (!program) return res.status(404).json({ error: 'Program not found' });

      const [sprints, risks] = await Promise.all([
        Sprint.find({ programId: program._id })
          .populate('tasks.assigneeId', 'name')
          .sort({ startDate: -1 })
          .limit(5),
        Risk.find({ programId: program._id }).populate('reportedBy', 'name').sort({ createdAt: -1 }).limit(10),
      ]);

      const totalTasks = sprints.reduce((acc, s) => acc + s.tasks.length, 0);
      const doneTasks = sprints.reduce(
        (acc, s) => acc + s.tasks.filter((t) => t.status === 'done').length,
        0
      );
      const openRisks = risks.filter((r) => r.status === 'open' || r.status === 'mitigating').length;

      res.json({
        program: {
          id: program._id,
          name: program.name,
          description: program.description,
          milestones: program.milestones,
          initiatives: program.initiatives,
        },
        sprints: sprints.map((s) => ({
          id: s._id,
          name: s.name,
          status: s.status,
          startDate: s.startDate,
          endDate: s.endDate,
          taskSummary: {
            total: s.tasks.length,
            done: s.tasks.filter((t) => t.status === 'done').length,
            inProgress: s.tasks.filter((t) => t.status === 'in_progress').length,
          },
        })),
        risks: risks.map((r) => ({
          title: r.title,
          severity: r.severity,
          status: r.status,
          mitigationPlan: r.mitigationPlan,
        })),
        summary: {
          totalTasks,
          doneTasks,
          completionPercent: totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0,
          openRisks,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  }
);

router.get(
  '/status/pdf',
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

      const [sprints, risks] = await Promise.all([
        Sprint.find({ programId: program._id }).sort({ startDate: -1 }).limit(5),
        Risk.find({ programId: program._id }).sort({ createdAt: -1 }).limit(10),
      ]);

      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=status-${program.name.replace(/\s/g, '-')}-${Date.now()}.pdf`);
      doc.pipe(res);

      doc.fontSize(20).text('Project Status Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(program.name, { align: 'center' });
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(12).text('Program Overview', { underline: true });
      doc.fontSize(10).text(program.description || 'No description.');
      doc.moveDown();

      doc.text('Milestones', { underline: true });
      program.milestones.forEach((m) => {
        doc.text(`• ${m.title} - ${m.status} (Due: ${new Date(m.dueDate).toLocaleDateString()})`);
      });
      doc.moveDown();

      doc.text('Recent Sprints', { underline: true });
      sprints.forEach((s) => {
        const done = s.tasks.filter((t) => t.status === 'done').length;
        doc.text(`• ${s.name}: ${done}/${s.tasks.length} tasks (${s.status})`);
      });
      doc.moveDown();

      doc.text('Risks', { underline: true });
      risks.forEach((r) => {
        doc.text(`• [${r.severity}] ${r.title} - ${r.status}`);
        if (r.mitigationPlan) doc.text(`  Mitigation: ${r.mitigationPlan}`).moveDown(0.5);
      });

      doc.end();
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  }
);

export default router;
