import {getProject} from './projects';

export type EquipmentRow = {
  id: string;
  projectId: string;
  areaId: string;
  projectName: string;
  areaName: string;
  sequenceNo: number;
  tagNumber: string;
  type: string;
  /** Raw inspection status, e.g. NotStarted / InProgress / Completed / ChangesRequested / QcApproved. */
  inspectionStatus: string;
};

/** Normalised key for comparing inspection statuses ("QC Approved" === "QcApproved"). */
export const inspectionKey = (value?: unknown) =>
  String(value ?? 'NotStarted').replace(/\s+/g, '').toLowerCase();

export const inspectionLabel = (value?: unknown) => {
  const key = inspectionKey(value);
  if (key === 'notstarted') return 'Pending Inspection';
  if (key === 'qcapproved') return 'QC Approved';
  return String(value ?? '').replace(/([a-z])([A-Z])/g, '$1 $2');
};

/** Every piece of equipment across the given projects (one request per project). */
export async function loadAllEquipment(
  projects: {id: string; projectName: string}[],
): Promise<EquipmentRow[]> {
  const perProject = await Promise.all(
    projects.map(async project => {
      try {
        const details = (await getProject(project.id)).data;
        return (details.areas || []).flatMap(area =>
          (area.equipment || []).map<EquipmentRow>(item => ({
            id: item.id,
            projectId: project.id,
            areaId: area.id,
            projectName: project.projectName,
            areaName: area.areaName,
            sequenceNo: item.sequenceNo,
            tagNumber: item.tagNumber,
            type: item.type,
            inspectionStatus: String(item.inspectionStatus ?? 'NotStarted'),
          })),
        );
      } catch {
        return [] as EquipmentRow[];
      }
    }),
  );
  return perProject.flat();
}
