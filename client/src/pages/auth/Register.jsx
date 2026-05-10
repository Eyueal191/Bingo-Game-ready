import React, { useState, useCallback } from "react";
import {
    TextField,
    Button,
    Container,
    Typography,
    Card,
    CardContent,
    Alert,
    CircularProgress,
    Box,
    useMediaQuery,
    useTheme,
    Divider,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { useApi } from "../../contexts/ApiContext";
import { usePhoneValidation } from "../../utils/phoneUtils";
import { toast } from "sonner";

const Register = () => {
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [invitedBy, setInvitedBy] = useState("");
    const [country, setCountry] = useState("ET");
    const [countries, setCountries] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const api = useApi();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const { validatePhone } = usePhoneValidation();

    React.useEffect(() => {
        const fetchCountries = async () => {
            try {
                const response = await api.get("/api/v1/countries/active");
                setCountries(response.data || []);
            } catch (err) {
                console.error("Failed to fetch countries:", err);
            }
        };
        fetchCountries();
    }, [api]);

    const handleRegister = useCallback(async () => {
        // Validate
        if (!fullName.trim()) {
            setError("Full name is required.");
            return;
        }
        if (!phone.trim()) {
            setError("Phone number is required.");
            return;
        }
        if (!password.trim() || password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setError(null);
        setSuccess(null);
        setIsSubmitting(true);

        try {
            // Use multi-country phone validation with the selected country
            const phoneValidation = validatePhone(phone.trim(), country);
            if (!phoneValidation.isValid) {
                setError(phoneValidation.error);
                setIsSubmitting(false); // Ensure submitting is reset if validation fails
                return;
            }

            const registrationData = {
                fullName: fullName.trim(),
                phone: phoneValidation.phone,
                password,
                country,
            };
            if (email.trim()) registrationData.email = email.trim();
            if (invitedBy.trim()) registrationData.invitedBy = invitedBy.trim();

            const response = await api.post("/api/v1/auth/register", registrationData);
            const { token, user } = response.data;

            // Store auth data
            localStorage.setItem("token", token);
            localStorage.setItem("fullName", user.fullName);
            localStorage.setItem("phone", user.phone || "");
            localStorage.setItem("wallet", user.wallet?.toString() || "0");
            localStorage.setItem("bonus", user.bonus?.toString() || "0");
            localStorage.setItem("referralCode", user.referralCode || "");
            localStorage.setItem("role", user.role);

            login(token);
            setSuccess("Registration successful! Redirecting...");

            setTimeout(() => navigate("/game-center", { replace: true }), 1500);
        } catch (err) {
            if (err.message === "Network Error") {
                setError("Network error. Please check your connection.");
            } else {
                setError(
                    err.response?.data?.message || "Registration failed. Please try again."
                );
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [fullName, phone, email, password, confirmPassword, invitedBy, navigate, login, api]);

    return (
        <Box
            className="dynamic-bg"
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: isMobile ? 1 : 2,
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                <Container maxWidth="xs">
                    <Card
                        elevation={10}
                        sx={{
                            p: isMobile ? 2 : 3,
                            textAlign: "center",
                            borderRadius: 3,
                            background: "#ffffff",
                        }}
                    >
                        <CardContent>
                            <Typography
                                variant={isMobile ? "h5" : "h4"}
                                sx={{ fontWeight: "bold", mb: 2, color: "#116e51" }}
                            >
                                Create Account
                            </Typography>

                            {error && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {error}
                                </Alert>
                            )}
                            {success && (
                                <Alert severity="success" sx={{ mb: 2 }}>
                                    {success}
                                </Alert>
                            )}

                            <TextField
                                fullWidth
                                label="Full Name *"
                                variant="outlined"
                                margin="dense"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                disabled={isSubmitting}
                            />
                            <TextField
                                fullWidth
                                label="Phone Number *"
                                variant="outlined"
                                margin="dense"
                                placeholder="09..."
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                disabled={isSubmitting}
                            />

                            <TextField
                                select
                                fullWidth
                                label="Country *"
                                variant="outlined"
                                margin="dense"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                SelectProps={{
                                    native: true,
                                }}
                                disabled={isSubmitting}
                            >
                                {countries.length > 0 ? (
                                    countries.map((c) => (
                                        <option key={c.code} value={c.code}>
                                            {c.name} ({c.dialCode})
                                        </option>
                                    ))
                                ) : (
                                    <option value="ET">Ethiopia (+251)</option>
                                )}
                            </TextField>
                            <TextField
                                fullWidth
                                label="Email (Optional)"
                                variant="outlined"
                                margin="dense"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isSubmitting}
                                helperText="If provided, you'll need to verify it"
                            />
                            <TextField
                                fullWidth
                                label="Password *"
                                variant="outlined"
                                margin="dense"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isSubmitting}
                            />
                            <TextField
                                fullWidth
                                label="Confirm Password *"
                                variant="outlined"
                                margin="dense"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={isSubmitting}
                            />
                            <TextField
                                fullWidth
                                label="Referral Code (Optional)"
                                variant="outlined"
                                margin="dense"
                                value={invitedBy}
                                onChange={(e) => setInvitedBy(e.target.value)}
                                disabled={isSubmitting}
                            />

                            <Button
                                variant="contained"
                                color="primary"
                                fullWidth
                                sx={{ mt: 2, py: 1.5, fontSize: "1rem" }}
                                onClick={handleRegister}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <CircularProgress size={24} color="inherit" />
                                ) : (
                                    "Register"
                                )}
                            </Button>

                            <Divider sx={{ my: 2 }} />

                            <Typography variant="body2" sx={{ mt: 1 }}>
                                Already have an account?{" "}
                                <Link
                                    to="/login"
                                    style={{
                                        color: "#116e51",
                                        fontWeight: "bold",
                                        textDecoration: "none",
                                    }}
                                >
                                    Login
                                </Link>
                            </Typography>

                            <Typography variant="body2" sx={{ mt: 1, color: "#116e51" }}>
                                or{" "}
                                <Link
                                    to="/login"
                                    state={{ guestAccess: true }}
                                    style={{
                                        color: "#ff3b30",
                                        fontWeight: "bold",
                                        textDecoration: "none",
                                    }}
                                >
                                    Continue as Guest
                                </Link>
                            </Typography>
                        </CardContent>
                    </Card>
                </Container>
            </motion.div>
        </Box>
    );
};

export default Register;
