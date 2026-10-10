import api from './api';

export const getCalendarEvents = async (params = {}) => {
  const res = await api.get('/calendar/events', { params });
  return res.data;
};

export const createCompanyEvent = async (eventData) => {
  const res = await api.post('/calendar/events', eventData);
  return res.data;
};

export const deleteCompanyEvent = async (id) => {
  const res = await api.delete(`/calendar/events/${id}`);
  return res.data;
};
