export type GeneratedReport = {uri: string; fileName: string; dispose: () => void};
export const reportFileName = (job: string) => `${job.replace(/[^a-z0-9_-]/gi, '') || 'project'}_Explosion_Proof_Survey_Report.pdf`;
