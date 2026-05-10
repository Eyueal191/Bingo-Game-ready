import { styled } from "@mui/system";

export const MainContainer = styled("div")(({ theme }) => ({
  minHeight: "100vh",
  width: "100%",
  padding: theme.spacing(6, 2, 10),
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: theme.spacing(4),
  position: "relative",
}));
