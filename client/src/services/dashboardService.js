import api from './api';

export const getAdminDashboardMetrics = async () => {
  const res = await api.get('/dashboard/admin');
  return res.data;
};

export const getEmployeeDashboardMetrics = async () => {
  const res = await api.get('/dashboard/employee');
  return res.data;
};
