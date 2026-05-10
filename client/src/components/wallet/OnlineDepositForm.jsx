import { FormControl, TextField, Button, CircularProgress, FormHelperText } from "@mui/material";
import TransactionCard from "./TransactionCard";

const OnlineDepositForm = ({
  register,
  errors,
  minDepositAmount,
  onlineMethods,
  selectedMethod,
  setSelectedMethod,
  isSubmitting,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
      <FormControl fullWidth error={!!errors.amount}>
        <TextField
          label={`Deposit Amount (ETB) (min ${minDepositAmount})`}
          type="number"
          {...register("amount", { valueAsNumber: true })}
          error={!!errors.amount}
          helperText={errors.amount?.message}
          className="bg-white/20 backdrop-blur-lg text-white rounded-lg border-0 mb-4 sm:mb-6"
          sx={{ mb: 2 }}
          slotProps={{
            inputLabel: { style: { color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", margin: "0.3rem" } },
            input: { style: { color: "white", border: "none", fontSize: "0.875rem" }, inputProps: { min: minDepositAmount, step: "0.01" } },
          }}
        />
      </FormControl>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
        {onlineMethods.map((method) => (
          <div key={method.type} onClick={() => setSelectedMethod(method.title)} className="cursor-pointer">
            <TransactionCard
              type={method.type}
              title={method.title}
              logo={method.logo}
              isFeatured={method.isFeatured}
              isSelected={selectedMethod === method.title}
            />
          </div>
        ))}
      </div>
      <Button type="submit" variant="contained" fullWidth disabled={isSubmitting} sx={{ bgcolor: "#1e88e5", color: "#fff", "&:hover": { bgcolor: "#1565c0" } }}>
        {isSubmitting ? <CircularProgress size={24} sx={{ color: "#fff" }} /> : "Proceed to Deposit"}
      </Button>
      <FormHelperText className="text-white text-xs sm:text-sm">
        {selectedMethod && selectedMethod !== "Others"
          ? "You will receive a prompt on your phone to complete the payment."
          : "You may be redirected to a secure payment gateway for some methods."}
      </FormHelperText>
    </form>
  );
};

export default OnlineDepositForm;