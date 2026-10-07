export const qcAssignmentLabel = (user: {
  displayName: string;
  managerName?: string | null;
}) =>
  `${user.displayName} — QC — Manager: ${
    user.managerName?.trim() || 'Not Assigned'
  }`;
