import { Container, Box } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useLoginForm } from "../../hooks/useLoginForm";
import { useRegisterForm } from "../../hooks/useRegisterForm";
import { LoginBackground, LoginHeader, LoginForm, RegisterForm, AuthLoading } from "../../components/auth";

const Login = () => {
  const [view, setView] = useState("login"); // "login" or "register"

  useEffect(() => {
    const handleToggle = (e) => {
      if (e.detail === "login" || e.detail === "register") {
        setView(e.detail);
      }
    };
    window.addEventListener("AUTH_TOGGLE", handleToggle);
    return () => window.removeEventListener("AUTH_TOGGLE", handleToggle);
  }, []);

  
  const loginProps = useLoginForm();
  const registerProps = useRegisterForm();

  // Primary loading state for Telegram users during authentication
  if ((loginProps.isTelegramUser && loginProps.isLoading) || (registerProps.isTelegramUser && registerProps.isLoading)) {
    return <AuthLoading />;
  }

  return (
    <LoginBackground>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Container maxWidth="xs">
          <Box
            sx={{
              p: { xs: 3, sm: 5 },
              textAlign: "center",
              borderRadius: "28px",
              background: "linear-gradient(180deg, var(--color-bingo-surface) 0%, var(--color-bingo-bg) 100%)",
              border: "1px solid var(--color-bingo-border-strong)",
              position: "relative",
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0, left: 0, right: 0, bottom: 0,
                borderRadius: "inherit",
                border: "1px solid transparent",
                background: "linear-gradient(135deg, hsla(45, 92%, 52%, 0.2), transparent 40%) border-box",
                pointerEvents: "none"
              },
              boxShadow: "0 25px 50px -12px var(--color-bingo-shadow), 0 0 40px hsla(215, 85%, 25%, 0.15)",
              overflow: "hidden",
            }}
          >
            <LoginHeader config={loginProps.config} />
            <AnimatePresence mode="wait">
              {view === "login" ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <LoginForm 
                    phone={loginProps.phone}
                    setPhone={loginProps.setPhone}
                    password={loginProps.password}
                    setPassword={loginProps.setPassword}
                    showPassword={loginProps.showPassword}
                    setShowPassword={loginProps.setShowPassword}
                    loading={loginProps.isSubmitLoading}
                    handleLogin={loginProps.handleLogin}
                    config={loginProps.config}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <RegisterForm 
                    fullName={registerProps.fullName}
                    setFullName={registerProps.setFullName}
                    phone={registerProps.phone}
                    setPhone={registerProps.setPhone}
                    password={registerProps.password}
                    setPassword={registerProps.setPassword}
                    showPassword={registerProps.showPassword}
                    setShowPassword={registerProps.setShowPassword}
                    loading={registerProps.isSubmitLoading}
                    handleRegister={registerProps.handleRegister}
                    config={registerProps.config}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
        </Container>
      </motion.div>
    </LoginBackground>
  );
};

export default Login;
