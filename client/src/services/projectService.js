import api from './api';

export const getProjects = async (params = {}) => {
  const response = await api.get('/projects', { params });
  return response.data;
};

export const getProjectById = async (id) => {
  const response = await api.get(`/projects/${id}`);
  return response.data;
};

export const createProject = async (projectData) => {
  const response = await api.post('/projects', projectData);
  return response.data;
};

export const updateProject = async (id, projectData) => {
  const response = await api.put(`/projects/${id}`, projectData);
  return response.data;
};

export const deleteProject = async (id) => {
  const response = await api.delete(`/projects/${id}`);
  return response.data;
};

// Project Members
export const addProjectMember = async (projectId, memberData) => {
  const response = await api.post(`/projects/${projectId}/members`, memberData);
  return response.data;
};

export const removeProjectMember = async (projectId, employeeId) => {
  const response = await api.delete(`/projects/${projectId}/members/${employeeId}`);
  return response.data;
};

// Project Milestones
export const createMilestone = async (projectId, milestoneData) => {
  const response = await api.post(`/projects/${projectId}/milestones`, milestoneData);
  return response.data;
};

export const updateMilestone = async (projectId, milestoneId, milestoneData) => {
  const response = await api.put(`/projects/${projectId}/milestones/${milestoneId}`, milestoneData);
  return response.data;
};

export const deleteMilestone = async (projectId, milestoneId) => {
  const response = await api.delete(`/projects/${projectId}/milestones/${milestoneId}`);
  return response.data;
};

// Project Tasks
export const createProjectTask = async (projectId, taskData) => {
  const response = await api.post(`/projects/${projectId}/tasks`, taskData);
  return response.data;
};
