import api from "./api";

// Fetch all stake bonus settings (for client display)
export const fetchAllStakeBonuses = async () => {
  const res = await api.get("/api/v1/stake-bonus");
  return res.data;
};
