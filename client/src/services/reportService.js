import api from './api';

export const getEmployeeReport = async (params = {}) => {
  const res = await api.get('/reports/employee', { params });
  return res.data;
};

export const getInternReport = async (params = {}) => {
  const res = await api.get('/reports/intern', { params });
  return res.data;
};

export const getAttendanceReport = async (params = {}) => {
  const res = await api.get('/reports/attendance', { params });
  return res.data;
};

export const getLeaveReport = async (params = {}) => {
  const res = await api.get('/reports/leave', { params });
  return res.data;
};

export const getProjectReport = async (params = {}) => {
  const res = await api.get('/reports/project', { params });
  return res.data;
};

export const getTaskReport = async (params = {}) => {
  const res = await api.get('/reports/task', { params });
  return res.data;
};
