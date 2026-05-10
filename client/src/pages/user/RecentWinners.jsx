import { useEffect, useState } from "react";
import {
    Box,
    CircularProgress,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Avatar,
} from "@mui/material";
import { useApi } from "../../contexts/ApiContext";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";

// Glass container for theme consistency
const GlassCard = ({ children, sx = {} }) => (
    <Box
        sx={{
            background: "var(--color-bingo-surface)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderRadius: "24px",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
            p: { xs: 2.5, md: 4 },
            ...sx
        }}
    >
        {children}
    </Box>
);
const RecentWinners = () => {
    const api = useApi();
    const [winners, setWinners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const fetchRecentWinners = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await api.get("/api/v1/games-history/recent-winners");
                if (isMounted) {
                    setWinners(response.data?.winners || []);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err.response?.data?.message || err.message || "Failed to load recent winners");
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchRecentWinners();
        return () => { isMounted = false; };
    }, [api]);

    return (
        <Box
            sx={{
                minHeight: "100vh",
                background: "var(--color-bingo-background)",
                py: { xs: 4, md: 6 },
            }}
        >
            <Box sx={{ maxWidth: 960, mx: "auto", px: { xs: 2, md: 4 } }}>
                <GlassCard>
                    <Box textAlign="center" sx={{ mb: 4 }}>
                        <Box sx={{ display: 'inline-flex', p: 1.5, bgcolor: 'rgba(248, 213, 23, 0.1)', borderRadius: '50%', mb: 2 }}>
                            <EmojiEventsIcon sx={{ color: "var(--color-bingo-yellow)", fontSize: 40 }} />
                        </Box>
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 900,
                                color: "var(--color-bingo-white)",
                                textTransform: "uppercase",
                                letterSpacing: 1,
                                mb: 1,
                                fontSize: { xs: "1.5rem", md: "2rem" },
                            }}
                        >
                            Recent Winners
                        </Typography>
                        <Typography variant="body1" sx={{ color: "var(--color-bingo-muted)" }}>
                            Real-time feed of the most recent champions!
                        </Typography>
                    </Box>

                    {loading ? (
                        <Box sx={{ py: 8, textAlign: "center" }}>
                            <CircularProgress sx={{ color: "var(--color-bingo-yellow)" }} />
                        </Box>
                    ) : error ? (
                        <Box sx={{ py: 4, textAlign: 'center', bgcolor: 'rgba(255, 59, 48, 0.1)', borderRadius: 3, border: '1px solid rgba(255, 59, 48, 0.2)' }}>
                            <Typography sx={{ color: "var(--color-bingo-red)", fontWeight: 600 }}>
                                {error}
                            </Typography>
                        </Box>
                    ) : (
                        <TableContainer sx={{ overflowX: "auto" }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: "rgba(255,255,255,0.03)" }}>
                                        <TableCell align="center" sx={{ color: "var(--color-bingo-muted)", borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 700 }}>#</TableCell>
                                        <TableCell sx={{ color: "var(--color-bingo-muted)", borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 700 }}>Player</TableCell>
                                        <TableCell align="right" sx={{ color: "var(--color-bingo-muted)", borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 700 }}>Won Amount</TableCell>
                                        <TableCell align="right" sx={{ color: "var(--color-bingo-muted)", borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 700 }}>Game & Time</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {winners.map((winner, index) => {
                                        const displayDate = new Date(winner.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        return (
                                            <TableRow 
                                                key={winner.id || index}
                                                sx={{ 
                                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
                                                }}
                                            >
                                                <TableCell align="center" sx={{ fontWeight: 800, color: "var(--color-bingo-yellow)", borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{index + 1}</TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'var(--color-bingo-surface)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-bingo-white)' }}>
                                                            {(winner.displayName || "P")[0].toUpperCase()}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography sx={{ fontWeight: 700, color: "var(--color-bingo-white)", fontSize: '0.9rem' }}>{winner.displayName || "Player"}</Typography>
                                                            <Typography variant="caption" sx={{ color: "var(--color-bingo-muted)" }}>{winner.maskedPhone}</Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="right" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <Typography sx={{ fontWeight: 800, color: 'var(--color-bingo-green)', fontSize: '1rem' }}>
                                                        {winner.amount.toLocaleString()} <Typography component="span" variant="caption" sx={{ opacity: 0.8 }}>coins</Typography>
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="right" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <Typography sx={{ color: "var(--color-bingo-white)", fontSize: '0.85rem', fontWeight: 500, textTransform: 'capitalize' }}>{winner.gameType}</Typography>
                                                    <Typography variant="caption" sx={{ color: "var(--color-bingo-muted)" }}>{displayDate}</Typography>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {!loading && !error && winners.length === 0 && (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                            <Typography sx={{ color: "var(--color-bingo-muted)" }}>
                                No recent winners found. Join a game to claim a spot!
                            </Typography>
                        </Box>
                    )}
                </GlassCard>
            </Box>
        </Box>
    );
};

export default RecentWinners;
