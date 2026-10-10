import api from './api';

export const generateMonthlyPayroll = async (data = {}) => {
  const response = await api.post('/payroll/generate', data);
  return response.data;
};

export const getPayrollRecords = async (params = {}) => {
  const response = await api.get('/payroll', { params });
  return response.data;
};

export const updatePayrollStatus = async (id, data) => {
  const response = await api.put(`/payroll/${id}/status`, data);
  return response.data;
};

export const getMyPayroll = async () => {
  const response = await api.get('/payroll/my');
  return response.data;
};

// Admin Only: Add custom payroll / salary record
export const createPayrollRecord = async (data) => {
  const response = await api.post('/payroll', data);
  return response.data;
};

// Admin Only: Edit payroll / increase salary
export const updatePayrollRecord = async (id, data) => {
  const response = await api.put(`/payroll/${id}`, data);
  return response.data;
};

// Admin Only: Delete payroll record
export const deletePayrollRecord = async (id) => {
  const response = await api.delete(`/payroll/${id}`);
  return response.data;
};

// Admin Only: Send single payroll to employee portal
export const sendPayrollToEmployee = async (id) => {
  const response = await api.post(`/payroll/${id}/send`);
  return response.data;
};

// Admin Only: Send all month payrolls to employee portals
export const sendBulkPayrollToEmployees = async (data) => {
  const response = await api.post('/payroll/send-bulk', data);
  return response.data;
};

