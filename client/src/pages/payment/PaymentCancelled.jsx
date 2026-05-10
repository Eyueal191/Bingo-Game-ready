import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, XCircle } from "lucide-react";
import { Button } from "@mui/material";

const PaymentCancelled = () => {
  return (
    <div className="min-h-screen bg-purple-rays flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center mt-16 glass-card p-8 rounded-xl shadow-lg">
        <div className="bg-yellow-100 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-6">
          <XCircle className="text-yellow-600 h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Cancelled</h1>
        <p className="text-gray-600 mb-6">
          You have cancelled your subscription payment. No funds have been deducted.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            component={Link}
            to="/wallet"
            variant="outlined"
            color="secondary"
            startIcon={<ArrowLeft />}
            className="w-full sm:w-auto"
          >
            Back to Wallet
          </Button>
          <Button
            component={Link}
            to="/wallet"
            variant="contained"
            color="primary"
            startIcon={<ArrowLeft />}
            className="w-full sm:w-auto bg-app-purple hover:bg-app-purple-dark"
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelled;