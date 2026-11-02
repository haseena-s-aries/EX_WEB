export type PlannedTask = {
  id: string;
  assignedUserId?: string | null;
  scheduledAt?: string | null;
  dueAt?: string | null;
  statusCode?: string | null;
  isInaccessible?: boolean;
  areaEquipmentId?: string | null;
  plannedGrade?: string | null;
  routeOrder?: number | null;
  [key: string]: unknown;
};

export type PlanningWorkPackage = {
  id: string;
  reference: string;
  site?: string | null;
  area?: string | null;
  tasks?: PlannedTask[];
};

export type InspectorWorkload = {
  userId: string;
  name: string;
  total: number;
  open: number;
  overdue: number;
  inaccessible: number;
  completed: number;
};

export type ScheduledTask = PlannedTask & {
  packageId: string;
  packageReference: string;
  site?: string | null;
  area?: string | null;
  inspectorName: string;
  overdue: boolean;
};

const isCompleted = (task: PlannedTask) => task.statusCode?.toLowerCase() === 'completed';
const timestamp = (value?: string | null) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
};

/** Pure projection of existing package/task responses; it does not infer productivity or compliance. */
export function buildInspectorWorkload(
  packages: PlanningWorkPackage[],
  inspectors: Array<{id: string; displayName: string}>,
  now: Date = new Date(),
) {
  const names = new Map(inspectors.map(user => [user.id, user.displayName]));
  const grouped = new Map<string, InspectorWorkload>();
  const agenda: ScheduledTask[] = [];

  for (const workPackage of packages) {
    for (const task of workPackage.tasks || []) {
      const userId = task.assignedUserId || 'unassigned';
      const completed = isCompleted(task);
      const overdue = !completed && !task.isInaccessible && timestamp(task.dueAt) < now.getTime();
      const workload = grouped.get(userId) || {
        userId,
        name: userId === 'unassigned' ? 'Unassigned' : names.get(userId) || `Inspector ${userId}`,
        total: 0,
        open: 0,
        overdue: 0,
        inaccessible: 0,
        completed: 0,
      };
      workload.total++;
      if (completed) workload.completed++;
      else {
        workload.open++;
        if (overdue) workload.overdue++;
        if (task.isInaccessible) workload.inaccessible++;
      }
      grouped.set(userId, workload);
      agenda.push({
        ...task,
        packageId: workPackage.id,
        packageReference: workPackage.reference,
        site: workPackage.site,
        area: workPackage.area,
        inspectorName: workload.name,
        overdue,
      });
    }
  }

  agenda.sort((a, b) => timestamp(a.scheduledAt || a.dueAt) - timestamp(b.scheduledAt || b.dueAt) ||
    (a.routeOrder ?? Number.MAX_SAFE_INTEGER) - (b.routeOrder ?? Number.MAX_SAFE_INTEGER));

  return {
    inspectors: [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name)),
    agenda,
  };
}
