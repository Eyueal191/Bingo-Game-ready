import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import KeshGameRoom from "../pages/keshkesh/KeshGameRoom";
import GamePlay from "../pages/keshkesh/GamePlay";
import SpinPlay from "../pages/keshkesh/SpinPlay";
import KeshGame from "../pages/keshkesh/KeshGame.jsx";
import KeshAdminDashboard from "../pages/admin/keshkesh/KeshAdminDashboard.jsx";
import PermissionProtectedRoute from "../pages/common/PermissionProtectedRoute";
import GameDashboard from "../pages/common/GameDashboard";
import NotFound from "../pages/common/NotFound";
import HowToPlay from "../pages/common/HowToPlay";
import AgentDashboard from "../pages/agent/AgentDashboard";
import AdminDashboard from "../pages/admin/bingo/AdminDashboard.jsx";
import GameRooms from "../pages/bingo/GameRooms";
import CardList from "../pages/bingo/cardList";
import Game from "../pages/bingo/Game";
import Login from "../pages/auth/login";
import UserReferral from "../pages/user/UserReferral";
import Leaderboard from "../pages/user/Leaderboard";
import GameHistory from "../pages/user/GameHistory";
import WalletPage from "../pages/user/WalletPage.jsx";
import UserProfile from "../pages/user/UserProfile.jsx";
import Unauthorized from "../pages/common/Unauthorized";
import {
  ProtectedRoute,
  AdminProtectedRoute,
  UnauthenticatedRoute,
} from "./RouteGuards";
import MaterialLotteryGame from "../pages/material/MaterialLotteryGame.jsx";
import MaterialLotteryGamePlay from "../pages/material/MaterialLotteryGamePlay.jsx";
import MaterialLotteryGameRoom from "../pages/material/MaterialLotteryGameRoom.jsx";
import MaterialLotteryAdminDashboard from "../pages/admin/material/MaterialLotteryAdminDashboard.jsx";
import { useAppConfig } from "../contexts/AppConfigContext";

const AppRoutes = ({ redirectPath, isAuthenticated }) => {
  const { config } = useAppConfig();
  return (
  <Routes>
    <Route
      path="/login"
      element={
        <UnauthenticatedRoute element={<Login />} redirectPath={redirectPath} />
      }
    />
    {/* <Route
      path="/game-center"
      element={<ProtectedRoute element={<GameDashboard />} />}
    /> */}
       <Route
      path="/games"
      element={<ProtectedRoute element={<GameRooms />} />}
    />
    <Route
      path="/my-wallet"
      element={<ProtectedRoute element={<WalletPage />} />}
    />
    <Route
      path="/user-profile"
      element={<ProtectedRoute element={<UserProfile />} />}
    />
    <Route
      path="/how-to-play"
      element={<ProtectedRoute element={<HowToPlay />} />}
    />
    <Route
      path="/referral"
      element={<ProtectedRoute element={<UserReferral />} />}
    />
    <Route
      path="/cards-list/:stakeAmount"
      element={<ProtectedRoute element={<CardList />} />}
    />
    <Route
      path="/play-game/:roomId/:stakeAmount"
      element={<ProtectedRoute element={<Game />} />}
    />
    {config.leaderboard?.enabled && (
      <Route
        path="/leader-board"
        element={<ProtectedRoute element={<Leaderboard />} />}
      />
    )}
    <Route
      path="/game-history"
      element={<ProtectedRoute element={<GameHistory />} />}
    />
    <Route
      path="/agent/dashboard"
      element={<ProtectedRoute element={<AgentDashboard />} />}
    />
    {/* <Route
      path="/keshkesh-rooms"
      element={<ProtectedRoute element={<KeshGame />} />}
    /> */}
    <Route path="/kesh-game-room/:id" element={<KeshGameRoom />} />
    <Route path="/game-play/:id" element={<GamePlay />} />
    <Route path="/spin-play/:id" element={<SpinPlay />} />
    <Route
          path="/material-lottery-room/:id"
          element={<MaterialLotteryGameRoom />}
        />
              {/* <Route
          path="/material-lottery-rooms"
          element={<ProtectedRoute element={<MaterialLotteryGame />} />}
        /> */}
        <Route
          path="/material-lottery-game-play/:id"
          element={<ProtectedRoute element={<MaterialLotteryGamePlay />} />}
        />

      <Route
          path="/material-lottery-admin-dash"
          element={
            <PermissionProtectedRoute
              element={<MaterialLotteryAdminDashboard />}
              requiredPermissions={["material_lottery"]}
            />
          }
        />

    <Route
      path="/kesh-admin-dash"
      element={
        <PermissionProtectedRoute
          element={<KeshAdminDashboard />}
          requiredPermissions={["keshkesh"]}
        />
      }
    />
    <Route
      path="/bingo-dashboard"
      element={
        <PermissionProtectedRoute
          element={<AdminDashboard />}
          requiredPermissions={["bingo"]}
        />
      }
    />
    <Route path="/unauthorized" element={<Unauthorized />} />
    <Route path="/not-found" element={<NotFound />} />
    <Route path="/" element={<Navigate to={redirectPath} />} />
    <Route
      path="/*"
      element={isAuthenticated ? <NotFound /> : <Navigate to="/login" />}
    />
  </Routes>
);
}

export default AppRoutes;
