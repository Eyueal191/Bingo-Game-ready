import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TextField, Button, FormControl, FormHelperText } from "@mui/material";
import { Phone } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  amount: z
    .number()
    .min(10, "Amount must be at least 10 ETB")
    .positive("Amount must be positive"),
  friendPhoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^\+?\d+$/, "Invalid phone number format"),
});

const TransferForm = ({ onSubmit, availableBalance }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { amount: "", friendPhoneNumber: "" },
  });

  const onFormSubmit = async (data) => {
    if (data.amount > availableBalance) {
      toast.error("Insufficient balance for transfer");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(data.amount, data.friendPhoneNumber);
      reset();
      // toast.success("Transfer initiated");
    } catch (error) {
      toast.error("Failed to process transfer");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="transition-opacity duration-500">
      <form
        onSubmit={handleSubmit(onFormSubmit)}
        className="space-y-4 sm:space-y-6"
      >
        <FormControl fullWidth error={!!errors.amount}>
          <TextField
            label="Transfer Amount (ETB)"
            type="number"
            {...register("amount", { valueAsNumber: true })}
            error={!!errors.amount}
            sx={{
                      mb: 2,
                      boxShadow: 2,
                    }}
            helperText={
              errors.amount?.message ||
              `Available: ETB ${availableBalance?.toFixed(2) || "0.00"}`
            }
            className="bg-white/20 backdrop-blur-lg text-white rounded-lg border-0"
            InputLabelProps={{
              style: {
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: "0.875rem",
              },
            }}
            InputProps={{
              style: { color: "white", border: "none", fontSize: "0.875rem" },
              inputProps: { min: 10, step: "0.01" },
            }}
          />
        </FormControl>
        <FormControl fullWidth error={!!errors.friendPhoneNumber}>
          <TextField
            label="Recipient Phone Number"
            {...register("friendPhoneNumber")}
            error={!!errors.friendPhoneNumber}
            sx={{
                      mb: 2,
                      boxShadow: 2,
                    }}
            helperText={
              errors.friendPhoneNumber?.message || "Use format: +251912345678"
            }
            className="bg-white/20 backdrop-blur-lg text-white rounded-lg border-0"
            InputLabelProps={{
              style: {
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: "0.875rem",
              },
            }}
            InputProps={{
              style: { color: "white", border: "none", fontSize: "0.875rem" },
              startAdornment: (
                <Phone className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-white/70" />
              ),
            }}
          />
        </FormControl>
        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={isSubmitting}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-2 sm:py-3 rounded-lg shadow-md transition-all duration-300 text-sm sm:text-base"
        >
          {isSubmitting ? "Processing..." : "Transfer Funds"}
        </Button>
      </form>
    </div>
  );
};

export default TransferForm;
