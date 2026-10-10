import api from './api';

export const getCompanySettings = async () => {
  const res = await api.get('/settings');
  return res.data;
};

export const updateCompanySettings = async (settings) => {
  const res = await api.put('/settings', settings);
  return res.data;
};
