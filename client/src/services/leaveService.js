import api from './api';

export const getLeaveBalances = async (employeeId, year) => {
  const params = {};
  if (employeeId) params.employee_id = employeeId;
  if (year) params.year = year;
  const res = await api.get('/leaves/balances', { params });
  return res.data;
};

export const applyLeave = async (leaveData) => {
  const res = await api.post('/leaves', leaveData);
  return res.data;
};

export const getMyLeaves = async () => {
  const res = await api.get('/leaves/my');
  return res.data;
};

export const getAllLeaves = async (params = {}) => {
  const res = await api.get('/leaves', { params });
  return res.data;
};

export const updateLeaveStatus = async (id, status, admin_remarks) => {
  const res = await api.put(`/leaves/${id}/status`, { status, admin_remarks });
  return res.data;
};

export const scheduleLeave = async (leaveData) => {
  const res = await api.post('/leaves/schedule', leaveData);
  return res.data;
};

export const getLeavePolicies = async () => {
  const res = await api.get('/leaves/policies');
  return res.data;
};

export const adjustLeaveBalance = async (data) => {
  const res = await api.post('/leaves/balances/adjust', data);
  return res.data;
};

export const createLeavePolicy = async (data) => {
  const res = await api.post('/leaves/policies', data);
  return res.data;
};

export const updateLeavePolicy = async (id, data) => {
  const res = await api.put(`/leaves/policies/${id}`, data);
  return res.data;
};

export const deleteLeavePolicy = async (id) => {
  const res = await api.delete(`/leaves/policies/${id}`);
  return res.data;
};

export const getLeaveSummaryReport = async (params = {}) => {
  const res = await api.get('/leaves/summary-report', { params });
  return res.data;
};



