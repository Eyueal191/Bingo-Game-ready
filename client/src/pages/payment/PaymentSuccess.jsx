import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, ArrowLeft } from "lucide-react";
import { Button } from "@mui/material";

const PaymentSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/wallet"), 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-purple-rays flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center mt-16 glass-card p-8 rounded-xl shadow-lg">
        <div className="bg-green-100 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6">
          <Check className="text-green-600 h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Your subscription payment was processed successfully. Balance updates soon.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Redirecting to wallet in 5 seconds...
        </p>
        <Button
          component={Link}
          to="/wallet"
          variant="contained"
          color="primary"
          startIcon={<ArrowLeft />}
          className="bg-app-purple hover:bg-app-purple-dark"
        >
          Back to Wallet
        </Button>
      </div>
    </div>
  );
};

export default PaymentSuccess;