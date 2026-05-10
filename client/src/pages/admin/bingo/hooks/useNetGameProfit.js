import { useState, useEffect } from "react";
import { useApi } from "../../../../contexts/ApiContext";

// Renamed for clarity
const useNetGameProfit = () => {
  const [profit, setProfit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const api = useApi();

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        const response = await api.get("/api/v1/revenue/breakdown");
        // Accessing the specific value we want
        setProfit(response.data.summary.netGameProfit);
      } catch (error) {
        console.error("Error fetching revenue:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRevenueData();
  }, [api]);

  // Returning an object allows you to expand this hook later (e.g., adding error states)
  return { profit, isLoading };
};
export default useNetGameProfit;