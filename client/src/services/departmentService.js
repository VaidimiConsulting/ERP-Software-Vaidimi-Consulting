import api from './api';

export const getDepartments = async () => {
  const response = await api.get('/departments');
  return response.data;
};

export const createDepartment = async (departmentData) => {
  const response = await api.post('/departments', departmentData);
  return response.data;
};
