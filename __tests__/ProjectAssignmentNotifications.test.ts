import apiClient from '../src/api/client';
import {buildNotifications} from '../src/notifications/notifications';
import {getQcProjects} from '../src/api/projects';
import {getAccessNotices} from '../src/api/userAccess';
jest.mock('../src/api/client', () => ({__esModule:true, default:{get:jest.fn()}}));
jest.mock('../src/api/projects', () => ({getQcProjects:jest.fn()}));
jest.mock('../src/api/userAccess', () => ({getAccessNotices:jest.fn().mockResolvedValue({data:[]})}));
test('audit assignment replaces the derived duplicate and retains authorized project navigation', async () => {
  (getQcProjects as jest.Mock).mockResolvedValue({data:[{projectId:'p1',projectName:'Project One',jobNo:'J1'}]});
  (apiClient.get as jest.Mock).mockResolvedValue({data:[{id:'event1',projectId:'p1',title:'New Project Assigned',message:'Assigned By: Manager A\nAssigned To: QC B',time:'2026-11-16T12:00:00Z'}]});
  const result = await buildNotifications('Qc');
  expect(result.filter(n => n.type === 'assigned')).toHaveLength(1);
  expect(result[0]).toMatchObject({id:'assignment:event1',message:expect.stringContaining('Assigned By: Manager A'),target:{kind:'qcProject',projectId:'p1'}});
});
test('legacy notifications remain available when no assignment audit exists', async () => {
  (apiClient.get as jest.Mock).mockResolvedValue({data:[]});
  const result = await buildNotifications('Qc');
  expect(result[0]).toMatchObject({id:'qc-assigned:p1',title:'New project assigned to you'});
});
test('inspection review notice opens the exact reviewed activity', async () => {
  (apiClient.get as jest.Mock).mockResolvedValue({data:[]});
  (getAccessNotices as jest.Mock).mockResolvedValueOnce({data:[{id:'review-1',kind:'InspectionReview',title:'Changes requested',message:'Correct the seal',inspectionActivityId:'activity-1',createdAt:'2026-11-17T10:00:00Z'}]});
  const result = await buildNotifications('Surveyor');
  expect(result.find(n => n.serverId === 'review-1')).toMatchObject({type:'comments',target:{kind:'inspectionActivity',activityId:'activity-1'}});
});
