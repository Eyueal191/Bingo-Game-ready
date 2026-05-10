import { TextField, InputAdornment, IconButton } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

const LoginTextField = ({ 
  label, 
  value, 
  onChange, 
  disabled, 
  type = "text",
  showPasswordToggle = false,
  showPassword,
  setShowPassword
}) => {
  return (
    <TextField
      fullWidth
      label={label}
      variant="outlined"
      type={showPasswordToggle ? (showPassword ? "text" : "password") : type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      slotProps={{
        input: {
          endAdornment: showPasswordToggle && (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShowPassword(!showPassword)}
                onMouseDown={(e) => e.preventDefault()}
                edge="end"
                sx={{ color: "var(--color-txt-muted)" }}
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
          sx: {
            color: "var(--color-txt-main)",
            borderRadius: "12px",
            backgroundColor: "hsla(215, 60%, 10%, 0.4)",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--color-bingo-border-strong)",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "hsla(45, 92%, 52%, 0.4)",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--color-bingo-accent)",
              borderWidth: "2px",
            },
          }
        },
        inputLabel: {
          sx: {
            color: "var(--color-txt-muted)",
            fontSize: "0.95rem",
            fontWeight: 500,
            "&.Mui-focused": {
              color: "var(--color-bingo-accent)",
            }
          }
        }
      }}
    />
  );
};

export default LoginTextField;
