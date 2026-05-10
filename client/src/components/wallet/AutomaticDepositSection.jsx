import { FormControl, TextField, Button, CircularProgress, FormHelperText } from "@mui/material";
import DepositAccountDetails from "./DepositAccountDetails";

const AutomaticDepositSection = ({
  register,
  errors,
  minAutomaticAmount,
  isSubmitting,
  onSubmit,
  paymentAccounts,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
      <DepositAccountDetails accounts={paymentAccounts} />
      <FormControl fullWidth error={!!errors.amount}>
        <TextField
          label={`Deposit Amount (ETB) (min ${minAutomaticAmount})`}
          type="number"
          {...register("amount", { valueAsNumber: true })}
          error={!!errors.amount}
          helperText={errors.amount?.message}
          className="text-white mb-4 sm:mb-6"
          sx={{ mb: 2 }}
          slotProps={{
            inputLabel: { style: { color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", margin: "0.3rem" } },
            input: { style: { color: "white", border: "none", fontSize: "0.875rem" }, inputProps: { min: minAutomaticAmount, step: "0.01" } },
          }}
        />
      </FormControl>
      <Button type="submit" variant="contained" fullWidth disabled={isSubmitting} sx={{ bgcolor: "#1e88e5", color: "#fff", "&:hover": { bgcolor: "#1565c0" } }}>
        {isSubmitting ? <CircularProgress size={24} sx={{ color: "#fff" }} /> : "Proceed to Automatic Deposit"}
      </Button>
      <FormHelperText className="text-white text-xs sm:text-sm">
        You will be prompted to enter the transaction ID or SMS text after depositing to the provided account.
        Minimum automatic deposit: {minAutomaticAmount} ETB.
      </FormHelperText>
    </form>
  );
};

export default AutomaticDepositSection;