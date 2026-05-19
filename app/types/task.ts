export type TaskStatus = "pending" | "in_progress" | "submitted" | "approved" | "overdue";

export type Task = {
  id: string;
  title: string;
  description: string;
  assigneeId: string | null;
  createdBy: string | null;
  status: TaskStatus;
  dueDate: string;
  attachmentUrl?: string;
  createdAt: string;
  updatedAt: string;
};
