import { Box } from "@mui/material";
import BingoLoading from "../common/BingoLoading";

const AuthLoading = () => {
    return (
        <Box sx={{
            minHeight: "100vh", display: "flex", alignItems: "center",
            justifyContent: "center", background: "var(--color-bingo-bg)"
        }}>
            <BingoLoading message="Authenticating..." variant="balls-only" />
        </Box>
    );
};

export default AuthLoading;