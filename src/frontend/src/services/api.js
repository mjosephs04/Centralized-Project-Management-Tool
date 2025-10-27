import axios from "axios";

const LOCAL_API_URL = "http://localhost:8080/api";
const PROD_API_URL = "https://centralized-project-management-tool-backend-710408068302.us-south1.run.app/api"

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

  if (config.url && config.url.includes("/auth/upload-profile")) {
    delete config.headers["Content-Type"];
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
    console.log("isProd: " + process.env.REACT_APP_ISPROD)
    const response = await apiClient.post("/projects/", projectData);
    return response.data.project;
  },

  updateProject: async (projectId, updates) => {
    const response = await apiClient.put(`/projects/${projectId}`, updates);
    return response.data.project;
  },

  workerUpdateProject: async (projectId, updates) => {
    const response = await apiClient.patch(`/projects/${projectId}/worker-update`, updates);
    return response.data.project;
  },

  deleteProject: async (projectId) => {
    await apiClient.delete(`/projects/${projectId}`);
    return true;
  },

  getProjectAuditLogs: async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}/audit-logs`);
    return response.data;
  },

  postSupplies: async (projectId, payload) => {
    const response = await apiClient.post(`/projects/${projectId}/supplies`, payload);
    return response;
  },
  getSupplies:  async (projectId) => {
    const response = await apiClient.get(`/projects/${projectId}/supplies`);
    return response;
  },
  patchSupplies: async (projectId, supplyID, payload) => {
    const response = await apiClient.patch(`/projects/${projectId}/supplies/${supplyID}/status`, payload);
    return response;
  },
  deleteSupplies:  async (projectId, supplyID) => {
    const response = await apiClient.delete(`/projects/${projectId}/supplies/${supplyID}`);
    return response;
  },

  inviteUser: async (projectId, invitationData) => {
    const response = await apiClient.post(`/projects/${projectId}/invite`, invitationData);
    return response.data;
  },

  validateInvitationToken: async (token) => {
    const response = await apiClient.get(`/projects/invitations/validate/${token}`);
    return response.data;
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
  getWorkers: async () => {
    const response = await apiClient.get("/auth/workers");
    return response.data.users;
  },
};

export const authAPI = {
  me: async () => {
    const response = await apiClient.get("/auth/me");
    return response.data.user;
  },
  register: async (payload) => {
    const response = await apiClient.post("/auth/register", payload)
    return response.status;
  },
  login: async (payload) => {
    const response = await apiClient.post("/auth/login", payload)
    return response;
  },
  forgotPassword: async (payload) => {
    const response = await apiClient.post("/auth/forgot-password", payload)
    return response;
  },
  
  validateInvitationToken: async (token) => {
    const response = await apiClient.get(`/projects/invitations/validate/${token}`);
    return response.data;
  },
  
  registerWithInvitation: async (payload) => {
    const response = await apiClient.post("/auth/register-with-invitation", payload);
    return response.data;
  },

  uploadProfilePic: async (formData) => {
    const response = await apiClient.post("/auth/upload-profile", formData);
    return response;
  }
};