import api from './api';

export const getBranches = async () => {
  const res = await api.get('/branches');
  return res.data;
};

export const getBranchById = async (id) => {
  const res = await api.get(`/branches/${id}`);
  return res.data;
};

export const createBranch = async (branchData) => {
  const res = await api.post('/branches', branchData);
  return res.data;
};

export const updateBranch = async (id, branchData) => {
  const res = await api.put(`/branches/${id}`, branchData);
  return res.data;
};

export const deleteBranch = async (id) => {
  const res = await api.delete(`/branches/${id}`);
  return res.data;
};
