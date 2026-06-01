export type KpiSubmission = {
  created_at: string;
};

export type KpiTask = {
  status: string;
  due_date: string | null;
  assigned_to?: string | null;
  rejection_count?: number;
  task_submissions: KpiSubmission[];
};

export function shouldCountInKpi(task: KpiTask): boolean {
  if (task.status === "open" && !task.assigned_to) return false;
  return true;
}

export function taskScore(task: KpiTask): number {
  // --- timing score (unchanged) ---
  let timingScore: number;

  if (task.status === "completed") {
    if (!task.due_date) {
      timingScore = 100;
    } else {
      const submissions = task.task_submissions ?? [];
      if (submissions.length === 0) {
        timingScore = 100;
      } else {
        const latestSub = submissions.reduce((a, b) =>
          new Date(a.created_at) > new Date(b.created_at) ? a : b
        );
        const due = new Date(task.due_date); due.setHours(0, 0, 0, 0);
        const sub = new Date(latestSub.created_at); sub.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((sub.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) timingScore = 100;
        else if (diffDays <= 3) timingScore = 80;
        else if (diffDays <= 7) timingScore = 60;
        else if (diffDays <= 14) timingScore = 40;
        else timingScore = 20;
      }
    }
  } else if (task.status === "in_progress") {
    if (!task.due_date) {
      timingScore = 100;
    } else {
      const due = new Date(task.due_date); due.setHours(23, 59, 59, 999);
      timingScore = new Date() <= due ? 100 : 70;
    }
  } else if (task.status === "pending_approval") {
    timingScore = 100;
  } else if (task.status === "rejected") {
    timingScore = 80;
  } else {
    // open (with assigned_to) or any other status
    timingScore = 100;
  }

  // --- quality penalty ---
  const qualityPenalty = (task.rejection_count ?? 0) >= 2 ? 20 : 0;

  return Math.max(0, timingScore - qualityPenalty);
}

export function calculateKpiScore(tasks: KpiTask[]): number {
  const countable = tasks.filter(shouldCountInKpi);
  if (countable.length === 0) return 100;
  const sum = countable.reduce((acc, t) => acc + taskScore(t), 0);
  return Math.round(sum / countable.length);
}

export function qualityRecommendation(tasks: KpiTask[]): string {
  const countable = tasks.filter(shouldCountInKpi);
  if (countable.length === 0) return "คุณภาพงานโดยรวมดี";

  const highRejectCount = countable.filter((t) => (t.rejection_count ?? 0) >= 2).length;
  const anyRejectCount = countable.filter((t) => (t.rejection_count ?? 0) >= 1).length;
  const highRejectRatio = highRejectCount / countable.length;

  if (highRejectRatio >= 0.3) return "มีงานถูกแก้ไขหลายครั้ง ควรตรวจสอบรายละเอียดก่อนส่ง";
  if (highRejectCount > 0) return "ควรตรวจสอบรายละเอียดงานก่อนส่งมากขึ้น";
  if (anyRejectCount === 0) return "งานผ่านรอบแรกสม่ำเสมอ";
  return "คุณภาพงานโดยรวมดี";
}
