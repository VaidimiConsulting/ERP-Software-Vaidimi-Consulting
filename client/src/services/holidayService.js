import api from './api';

export const getHolidays = async (params = {}) => {
  const res = await api.get('/holidays', { params });
  return res.data;
};

export const createHoliday = async (holidayData) => {
  const res = await api.post('/holidays', holidayData);
  return res.data;
};

export const updateHoliday = async (id, holidayData) => {
  const res = await api.put(`/holidays/${id}`, holidayData);
  return res.data;
};

export const deleteHoliday = async (id) => {
  const res = await api.delete(`/holidays/${id}`);
  return res.data;
};
