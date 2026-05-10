import { Box, Button, Typography } from "@mui/material";
import TelegramIcon from '@mui/icons-material/Telegram';
import LoginTextField from "./LoginTextField";
import LoginButton from "./LoginButton";

const RegisterForm = ({
  fullName, setFullName,
  phone, setPhone,
  password, setPassword,
  showPassword, setShowPassword,
  loading, handleRegister, config
}) => {
  return (
    <Box 
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        handleRegister();
      }}
      sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
    >
      <LoginTextField
        label="Full Name"
        value={fullName}
        onChange={setFullName}
        disabled={loading}
      />
      <LoginTextField
        label="Phone Number"
        value={phone}
        onChange={setPhone}
        disabled={loading}
      />
      <LoginTextField
        label="Password"
        value={password}
        onChange={setPassword}
        disabled={loading}
        showPasswordToggle
        showPassword={showPassword}
        setShowPassword={setShowPassword}
      />
      <LoginButton loading={loading}>
        Register Account
      </LoginButton>
      <Typography variant="body2" sx={{ mt: 2, color: "var(--color-txt-muted)", fontWeight: 600 }}>
        Already have an account?{" "}
        <span
          onClick={() => window.dispatchEvent(new CustomEvent("AUTH_TOGGLE", { detail: "login" }))}
          style={{ color: "var(--color-bingo-accent)", fontWeight: "800", textDecoration: "none", marginLeft: "4px", cursor: "pointer" }}
        >
          Sign in
        </span>
      </Typography>
      {config?.bot?.botUserName && (
        <Button
          variant="outlined"
          startIcon={<TelegramIcon />}
          href={`https://t.me/${config.bot.botUserName}`}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            mt: 0.5,
            borderRadius: "12px",
            color: "#2AABEE",
            borderColor: "rgba(42, 171, 238, 0.5)",
            textTransform: "none",
            fontWeight: "bold",
            padding: "10px",
            "&:hover": {
              borderColor: "#2AABEE",
              backgroundColor: "rgba(42, 171, 238, 0.08)",
            }
          }}
        >
          Continue with Telegram
        </Button>
      )}
    </Box>
  );
};

export default RegisterForm;
