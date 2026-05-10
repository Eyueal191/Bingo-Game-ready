import api from "./apiClient";

export const submitDirectDeposit = async (amount, paymentMethod) => {
  const response = await api.post("/api/v1/addis-pay/deposit", {
    amount,
    paymentMethod: paymentMethod.toLowerCase(),
  });
  if (response.data.status !== "success") {
    throw new Error(response.data.error || "Direct payment failed");
  }
  return response.data;
};

export const submitAutomaticDeposit = async (payload) => {
  const response = await api.post("/api/v1/automatic-deposit/submit", payload);
  return response.data;
};