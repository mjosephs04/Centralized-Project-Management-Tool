import axios from "axios";

const LOCAL_API_URL = "http://localhost:8080/api";
const PROD_API_URL = "https://centralized-project-management-tool-backend-710408068302.us-south1.run.app";

const getAuthToken = () => {
  return localStorage.getItem("accessToken");
};

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_ISPROD ? PROD_API_URL : LOCAL_API_URL,
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
    console.log("isProd: " + process.env.REACT_APP_ISPROD);
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

  workerUpdate: async (workOrderId, updates) => {
    const response = await apiClient.patch(`/workorders/${workOrderId}/worker-update`, updates);
    return response.data.workorder;
  },

  deleteWorkOrder: async (workOrderId) => {
    await apiClient.delete(`/workorders/${workOrderId}`);
    return true;
  },
};

export const usersAPI = {
  // Uses GET /api/auth/workers
  getWorkers: async () => {
    const response = await apiClient.get("/auth/workers");
    return response.data.users; // [{ id, firstName, lastName, emailAddress, phoneNumber }, ...]
  },
};

export const authAPI = {
  me: async () => {
    const response = await apiClient.get("/auth/me");
    return response.data.user;
  },
};