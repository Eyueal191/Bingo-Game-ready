import api from "./apiClient";

export async function submitAutomaticDeposit(payload) {
  const res = await api.post(`/api/v1/sms-deposit/automatic-deposit`, payload);
  return res.data;
}

export async function validateAutomaticDeposit(payload) {
  const res = await api.post(
    `/api/v1/sms-deposit/automatic-deposit/validate`,
    payload
  );
  return res.data;
}