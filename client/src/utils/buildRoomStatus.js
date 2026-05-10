import { formatCounter } from "./formatCounter";

export const buildRoomStatus = (room, counters, fakeCounters) => {
    const counterId = `counter${room._id}`;
    const fakeCounterId = `fakeCounter${room._id}`;
    const counterValue = counters[counterId];
    const fakeCounterValue = fakeCounters[fakeCounterId];

    if (room.status === "playing") {
        return {
            label: "Status",
            value: "Game in progress",
            tone: "accent",
        };
    } else if (counterValue > 0) {
        return {
            label: "Starts in",
            value: formatCounter(counterValue),
            tone: "countdown",
        };
    } else if (fakeCounterValue > 0) {
        return {
            label: "Starts in",
            value: formatCounter(fakeCounterValue),
            tone: "countdown",
        };
    } else if (room.status === "waiting" && fakeCounterValue === 0) {
        return {
            label: "Status",
            value: "Starting soon",
            tone: "focus",
        };
    }

    return {
        label: "Status",
        value: room.status,
        tone: "focus",
    };
};