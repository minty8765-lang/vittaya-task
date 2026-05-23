export type KpiSubmission = {
  created_at: string;
};

export type KpiTask = {
  status: string;
  due_date: string | null;
  task_submissions: KpiSubmission[];
};

export function taskScore(task: KpiTask): number {
  if (task.status !== "completed") return 0;
  if (!task.due_date) return 100;
  const submissions = task.task_submissions ?? [];
  if (submissions.length === 0) return 0;
  const latestSub = submissions.reduce((a, b) =>
    new Date(a.created_at) > new Date(b.created_at) ? a : b
  );
  const due = new Date(task.due_date); due.setHours(0, 0, 0, 0);
  const sub = new Date(latestSub.created_at); sub.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((sub.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 100;
  if (diffDays <= 3) return 80;
  if (diffDays <= 7) return 60;
  if (diffDays <= 14) return 40;
  return 20;
}

export function calculateKpiScore(tasks: KpiTask[]): number {
  if (tasks.length === 0) return 0;
  const sum = tasks.reduce((acc, t) => acc + taskScore(t), 0);
  return Math.round(sum / tasks.length);
}
