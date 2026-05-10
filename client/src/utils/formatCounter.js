export const formatCounter = (counterValue) => {
    const minutes = Math.floor(counterValue / 60);
    const seconds = counterValue % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};