export type HazardousAreaPlanFile = {
  name: string;
  type: string;
  uri?: string;
  webFile?: any;
};

export const PLAN_TYPE_ERROR = 'Only JPG, JPEG and PDF files are allowed.';
export const validateHazardousAreaPlan = (file: {
  name?: string | null;
  type?: string | null;
}) => {
  const extension = String(file.name || '')
    .split('.')
    .pop()
    ?.toLowerCase();
  if (!['jpg', 'jpeg', 'pdf'].includes(extension || '')) return PLAN_TYPE_ERROR;
  const expected = extension === 'pdf' ? 'application/pdf' : 'image/jpeg';
  if (
    file.type &&
    file.type !== 'application/octet-stream' &&
    file.type.toLowerCase() !== expected
  )
    return PLAN_TYPE_ERROR;
  return '';
};

export type PlanUploadProps = {
  value: HazardousAreaPlanFile | null;
  onChange: (file: HazardousAreaPlanFile | null) => void;
  disabled?: boolean;
};

export type PlanViewerProps = {
  title?: string;
  path: string;
  fileName?: string | null;
  contentType?: string | null;
  onClose: () => void;
};
