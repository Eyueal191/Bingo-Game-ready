import { Box } from "@mui/material";
import RoomCard from "./RoomCard";

const RoomsGrid = ({
  rooms,
  buildRoomStatus,
  counters,
  fakeCounters,
  handleJoinGame,
  role,
  isDesktop,
}) => {
  return (
    <Box
      sx={{
        display: "grid",
        gap: { xs: 1.6, sm: 2.1, md: 2.5 },
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 500px))",
        justifyContent: "center",
      }}
    >
      {rooms.map((room) => (
        <RoomCard
          key={room._id}
          room={room}
          status={buildRoomStatus(room, counters, fakeCounters)}
          handleJoinGame={handleJoinGame}
          role={role}
          isDesktop={isDesktop}
        />
      ))}
    </Box>
  );
};

export default RoomsGrid;