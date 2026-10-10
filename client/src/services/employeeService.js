import api from './api';

export const getEmployees = async (params = {}) => {
  const response = await api.get('/employees', { params });
  return response.data;
};

export const getEmployeeById = async (id) => {
  const response = await api.get(`/employees/${id}`);
  return response.data;
};

export const createEmployee = async (employeeData) => {
  const response = await api.post('/employees', employeeData);
  return response.data;
};

export const updateEmployee = async (id, employeeData) => {
  const response = await api.put(`/employees/${id}`, employeeData);
  return response.data;
};

export const toggleEmployeeStatus = async (id) => {
  const response = await api.put(`/employees/${id}/toggle-status`);
  return response.data;
};

export const deleteEmployee = async (id) => {
  const response = await api.delete(`/employees/${id}`);
  return response.data;
};

export const resetEmployeePassword = async (id, newPassword) => {
  const response = await api.put(`/employees/${id}/reset-password`, { newPassword });
  return response.data;
};
