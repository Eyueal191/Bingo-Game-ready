import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
  FormControl,
  FormHelperText,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useAuth } from "../../contexts/AuthContext";
import { useApi } from "../../contexts/ApiContext";
import { toast } from "sonner";
import TransactionCard from "../../components/wallet/TransactionCard.jsx";
import { useWallet } from "../../contexts/WalletContext";
import { useAppConfig } from "../../contexts/AppConfigContext";


const telebirrLogo = "/bingo_icon/Telebirr.png";
const cbeLogo = "/bingo_icon/cbe-birr.png";

const WithdrawRequest = ({ onAutomaticWithdraw }) => {
  const { config } = useAppConfig();
  const flows = config?.botPayments?.withdraw?.flows || { manual: true };
  const channels = config?.botPayments?.withdraw?.channels || {};

  const availableTabs = [];
  if (flows.manual) availableTabs.push("manual");
  if (flows.automatic) availableTabs.push("automatic");

  const [activeTab, setActiveTab] = useState(availableTabs[0] || "manual");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const { user } = useAuth();
  const { wallet } = useWallet();
  const api = useApi();

  const walletRules = config?.walletRules || {};
  const minWithdrawal = walletRules.minWithdrawalAmount ?? 0;
  const minBalance = walletRules.minBalanceAfterWithdrawal ?? 0;
  
  React.useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [flows, availableTabs, activeTab]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(
      activeTab === "manual"
        ? z.object({
            amount: z
              .number()
              .min(
                minWithdrawal,
                `Amount must be at least ${minWithdrawal} ETB`
              )
              .positive("Amount must be positive"),
            method: z.string().min(1, "Please select a withdrawal method"),
            accountNumber: z.string().min(1, "Please enter an account number"),
          })
        : z.object({
            amount: z
              .number()
              .min(
                minWithdrawal,
                `Amount must be at least ${minWithdrawal} ETB`
              )
              .positive("Amount must be positive"),
            phone: z
              .string()
              .optional()
              .refine(
                (val) => !val || /^(\+?251|0)[79]\d{8}$/.test(val.replace(/[\s-]/g, "")),
                {
                  message:
                    "Invalid Ethiopian phone format. Use 09..., 07..., or +251... followed by 9 digits",
                }
              ),
          })
    ),
    defaultValues: {
      amount: "",
      method: "",
      accountNumber: "",
      phone: user?.phone || "",
    },
  });

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    reset();
    setSelectedMethod(null);
  };

  const handleManualSubmit = async (data) => {
    if (Number(data.amount) > wallet) {
      return toast.error("Amount exceeds available balance");
    }
    if (minBalance > 0 && Number(wallet) - Number(data.amount) < minBalance) {
      return toast.error(
        `You need to have at least ${minBalance} Birr in your wallet after withdrawal`
      );
    }

    setIsSubmitting(true);
    try {
      const res = await api.post(`/api/v1/withdrawal/request`, {
        amount: Number(data.amount),
        method: data.method,
        accountNumber: data.accountNumber,
      });
      toast.success(res.data.message);
      reset();
    } catch (error) {
      toast.error(error.response?.data?.message || "Withdrawal request failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutomaticSubmit = async (data) => {
    if (!selectedMethod) {
      return toast.error("Please select a payment method");
    }
    if (Number(data.amount) > wallet) {
      return toast.error("Amount exceeds available balance");
    }
    if (minBalance > 0 && Number(wallet) - Number(data.amount) < minBalance) {
      return toast.error(
        `You need to have at least ${minBalance} Birr in your wallet after withdrawal`
      );
    }

    setIsSubmitting(true);
    try {
      const response = await onAutomaticWithdraw(
        Number(data.amount),
        selectedMethod,
        data.phone
      );
      console.log("Automatic withdrawal response:", response);
      setOpenDialog(true);
      reset();
      setSelectedMethod(null);
    } catch (error) {
      console.error("Automatic withdrawal error:", error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Automatic withdrawal failed"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const withdrawalMethods = [
    { value: "CBE", label: "Commercial Bank of Ethiopia (CBE)", key: "cbe" },
    { value: "Telebirr", label: "Telebirr", key: "telebirr" },
    { value: "BOA", label: "Bank of Abyssinia (BOA)", key: "abyssinia" },
    { value: "CBEBirr", label: "CBE Birr", key: "cbebirr" },
    { value: "Dashen", label: "Dashen Bank", key: "dashen" },
  ].filter(m => channels[m.key]);

  const onlineMethods = [
    { type: "CBE", title: "CBE", logo: cbeLogo, isFeatured: true, key: "cbe" },
    { type: "Telebirr", title: "Telebirr", logo: telebirrLogo, isFeatured: true, key: "telebirr" },
  ].filter(m => channels[m.key]);

  return (
    <Box
      sx={{
        p: 3,
        bgcolor: "rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: 2,
        boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
        textAlign: "center",
        width: "100%",
        maxWidth: 600,
      }}
    >
      <Typography variant="h6" sx={{ color: "white", mb: 2, fontWeight: 'bold' }}>
        Withdraw Funds
      </Typography>
      <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.8)", mb: 2 }}>
        Available Balance: {wallet} Birr
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="withdrawal tabs"
          textColor="inherit"
          indicatorColor="secondary"
          sx={{
            "& .MuiTab-root": {
              color: "white",
              opacity: 1,
            },
            "& .Mui-selected": {
              color: "white",
              opacity: 1,
            },
          }}
        >
          {flows.manual && <Tab label="Manual" value="manual" />}
          {flows.automatic && <Tab label="Automatic" value="automatic" />}
        </Tabs>
      </Box>

      {activeTab === "manual" && (
        <form onSubmit={handleSubmit(handleManualSubmit)} className="space-y-4">
          <FormControl fullWidth error={!!errors.amount}>
            <TextField
              label="Amount (Birr)"
              type="number"
              {...register("amount", { valueAsNumber: true })}
              error={!!errors.amount}
              helperText={errors.amount?.message}
              fullWidth
              className="bg-white/20 backdrop-blur-lg text-white rounded-lg border-0"
              sx={{ mb: 2 }}
              disabled={isSubmitting}
              slotProps={{
                inputLabel: { style: { color: "rgba(255, 255, 255, 0.7)", fontSize: "0.875rem", margin: "0.3rem" } },
                input: { style: { color: "white", border: "none", fontSize: "0.875rem" } },
              }}
            />
          </FormControl>
          <FormControl fullWidth error={!!errors.method}>
            <TextField
              select
              label="Withdrawal Method"
              {...register("method")}
              error={!!errors.method}
              helperText={errors.method?.message}
              fullWidth
              className="bg-white/20 backdrop-blur-lg text-white rounded-lg border-0"
              sx={{ mb: 2 }}
              disabled={isSubmitting}
              slotProps={{
                inputLabel: { style: { color: "rgba(255, 255, 255, 0.7)", fontSize: "0.875rem", margin: "0.3rem" } },
                input: { style: { color: "white", border: "none", fontSize: "0.875rem" } },
                select: { MenuProps: { PaperProps: { sx: { color: "white" } } } }
              }}
            >
              {withdrawalMethods.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </FormControl>
          <FormControl fullWidth error={!!errors.accountNumber}>
            <TextField
              label="Account Number"
              {...register("accountNumber")}
              error={!!errors.accountNumber}
              helperText={errors.accountNumber?.message}
              fullWidth
              className="bg-white/20 backdrop-blur-lg text-white rounded-lg border-0"
              sx={{ mb: 2 }}
              disabled={isSubmitting}
              slotProps={{
                inputLabel: { style: { color: "rgba(255, 255, 255, 0.7)", fontSize: "0.875rem", margin: "0.3rem" } },
                input: { style: { color: "white", border: "none", fontSize: "0.875rem" } },
              }}
            />
          </FormControl>
          <Button
            variant="contained"
            type="submit"
            fullWidth
            sx={{ py: 1.5, backgroundColor: "#1e88e5", color: "#fff" }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <CircularProgress size={24} sx={{ color: "#fff" }} />
            ) : (
              "Submit Request"
            )}
          </Button>
        </form>
      )}

      {activeTab === "automatic" && (
        <form
          onSubmit={handleSubmit(handleAutomaticSubmit)}
          className="space-y-4"
        >
          <FormControl fullWidth error={!!errors.amount}>
            <TextField
              label="Amount (Birr)"
              type="number"
              {...register("amount", { valueAsNumber: true })}
              error={!!errors.amount}
              helperText={errors.amount?.message}
              fullWidth
              className="bg-white/20 backdrop-blur-lg text-white rounded-lg border-0"
              sx={{ mb: 2 }}
              disabled={isSubmitting}
              slotProps={{
                inputLabel: { style: { color: "rgba(255, 255, 255, 0.7)", fontSize: "0.875rem", margin: "0.3rem" } },
                input: { style: { color: "white", border: "none", fontSize: "0.875rem" } },
              }}
            />
          </FormControl>
          <FormControl fullWidth error={!!errors.phone}>
            <TextField
              label="Phone Number (Optional)"
              {...register("phone")}
              error={!!errors.phone}
              helperText={
                errors.phone?.message || "Use 09..., 07..., or +251... format"
              }
              fullWidth
              className="bg-white/20 backdrop-blur-lg text-white rounded-lg border-0"
              sx={{ mb: 2 }}
              disabled={isSubmitting}
              slotProps={{
                inputLabel: { style: { color: "rgba(255, 255, 255, 0.7)", fontSize: "0.875rem", margin: "0.3rem" } },
                input: { style: { color: "white", border: "none", fontSize: "0.875rem" } },
              }}
            />
          </FormControl>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {onlineMethods.map((method) => (
              <div
                key={method.type}
                onClick={() => setSelectedMethod(method.type)}
                className="cursor-pointer"
              >
                <TransactionCard
                  type={method.type}
                  title={method.title}
                  logo={method.logo}
                  isFeatured={method.isFeatured}
                  isSelected={selectedMethod === method.type}
                />
              </div>
            ))}
          </div>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={isSubmitting}
            sx={{
              py: 1.5,
              backgroundColor: "#1e88e5",
              color: "#fff",
            }}
          >
            {isSubmitting ? (
              <CircularProgress size={24} sx={{ color: "#fff" }} />
            ) : (
              "Proceed to Withdraw"
            )}
          </Button>
          <FormHelperText className="text-black text-xs sm:text-sm">
            You will receive a notification once the withdrawal is processed.
          </FormHelperText>
        </form>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle className="text-white bg-purple-900">
          Withdrawal Initiated
        </DialogTitle>
        <DialogContent className="bg-purple-800 text-white">
          <p>
            Your withdrawal request has been initiated. You will be notified
            once it is processed.
          </p>
        </DialogContent>
        <DialogActions className="bg-purple-800">
          <Button onClick={() => setOpenDialog(false)} className="text-white">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WithdrawRequest;