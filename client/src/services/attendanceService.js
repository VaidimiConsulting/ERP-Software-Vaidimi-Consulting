import api from './api';

export const checkIn = async () => {
  const res = await api.post('/attendance/check-in');
  return res.data;
};

export const checkOut = async () => {
  const res = await api.post('/attendance/check-out');
  return res.data;
};

export const startBreak = async () => {
  const res = await api.post('/attendance/break-start');
  return res.data;
};

export const endBreak = async () => {
  const res = await api.post('/attendance/break-end');
  return res.data;
};

export const getTodayAttendance = async (employeeId) => {
  const params = employeeId ? { employee_id: employeeId } : {};
  const res = await api.get('/attendance/today', { params });
  return res.data;
};

export const getMonthlyAttendance = async (month, employeeId) => {
  const params = {};
  if (month) params.month = month;
  if (employeeId) params.employee_id = employeeId;
  const res = await api.get('/attendance/monthly', { params });
  return res.data;
};

export const getAllAttendance = async (params = {}) => {
  const res = await api.get('/attendance', { params });
  return res.data;
};

export const overrideAttendance = async (overrideData) => {
  const res = await api.post('/attendance/override', overrideData);
  return res.data;
};
