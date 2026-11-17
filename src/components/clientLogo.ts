import {HazardousAreaPlanFile} from './hazardousAreaPlan';
export type ClientLogoFile = HazardousAreaPlanFile;
export function validateClientLogo(file: {name?: string | null; type?: string | null}) {
  const extension = file.name?.split('.').pop()?.toLowerCase();
  const expected = extension === 'png' ? 'image/png' : 'image/jpeg';
  return !['jpg', 'jpeg', 'png'].includes(extension || '') || (!!file.type && file.type !== expected && file.type !== 'application/octet-stream')
    ? 'Only JPG, JPEG and PNG images are allowed.' : '';
}
export type ClientLogoProps = {value: ClientLogoFile | null; onChange: (file: ClientLogoFile | null) => void; disabled?: boolean; label?: string};
