import api from './api';

export const sendHeartbeat = async () => {
  const res = await api.post('/chat/heartbeat');
  return res.data;
};

export const getPresenceRoster = async () => {
  const res = await api.get('/chat/presence');
  return res.data;
};

export const getConversations = async () => {
  const res = await api.get('/chat/conversations');
  return res.data;
};

export const createConversation = async (data) => {
  const res = await api.post('/chat/conversations', data);
  return res.data;
};

export const getMessages = async (conversationId) => {
  const res = await api.get(`/chat/conversations/${conversationId}/messages`);
  return res.data;
};

export const sendMessage = async (conversationId, messageData) => {
  const res = await api.post(`/chat/conversations/${conversationId}/messages`, messageData);
  return res.data;
};

export const addGroupMembers = async (conversationId, userIds) => {
  const res = await api.post(`/chat/conversations/${conversationId}/members`, { user_ids: userIds });
  return res.data;
};

export const removeGroupMember = async (conversationId, userId) => {
  const res = await api.delete(`/chat/conversations/${conversationId}/members/${userId}`);
  return res.data;
};
