import { api } from "./apiClient";

export const revenueService = {
    getBreakdown: async (params) => {
        const response = await api.get("/api/v1/revenue/breakdown", { params });
        return response.data;
    },

    getTransactions: async (params) => {
        const response = await api.get("/api/v1/revenue/transactions", { params });
        return response.data;
    },

    getRobots: async () => {
        const response = await api.get("/api/v1/revenue/robots");
        return response.data;
    },

    getTrend: async (params) => {
        const response = await api.get("/api/v1/revenue/trend", { params });
        return response.data;
    },

    createRobot: async (data) => {
        const response = await api.post("/api/v1/robots", data);
        return response.data;
    },

    deleteRobot: async (id) => {
        const response = await api.delete(`/api/v1/robots/${id}`);
        return response.data;
    },

    adjustRobotWallet: async (id, data) => {
        const response = await api.put(`/api/v1/robots/${id}/wallet`, data);
        return response.data;
    },

    getRobotNames: async (id) => {
        const response = await api.get(`/api/v1/robots/${id}/names`);
        return response.data;
    },

    updateRobotNames: async (id, names) => {
        const response = await api.put(`/api/v1/robots/${id}/names`, { names });
        return response.data;
    },
};
