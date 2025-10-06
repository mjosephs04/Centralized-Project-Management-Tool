import axios from "axios";

const API_URL = "http://localhost:8080/api";

const getAuthToken = () => {
  return localStorage.getItem("accessToken");
};

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const projectsAPI = {
  getProjects: async () => {
    const response = await apiClient.get("/projects/");
    return response.data.projects;
  },

  getProject: async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}`);
    return response.data.project;
  },

  createProject: async (projectData) => {
    const response = await apiClient.post("/projects/", projectData);
    return response.data.project;
  },

  updateProject: async (projectId, updates) => {
    const response = await apiClient.put(`/projects/${projectId}`, updates);
    return response.data.project;
  },

  deleteProject: async (projectId) => {
    await apiClient.delete(`/projects/${projectId}`);
    return true;
  },
};

export const workOrdersAPI = {
  getWorkOrdersByProject: async (projectId) => {
    const response = await apiClient.get(`/workorders/project/${projectId}`);
    return response.data.workorders;
  },

  createWorkOrder: async (workOrderData) => {
    const response = await apiClient.post(`/workorders/`, workOrderData);
    return response.data.workorder;
  },

  updateWorkOrder: async (workOrderId, updates) => {
    const response = await apiClient.put(`/workorders/${workOrderId}`, updates);
    return response.data.workorder;
  },

  deleteWorkOrder: async (workOrderId) => {
    await apiClient.delete(`/workorders/${workOrderId}`);
    return true;
  },
};
