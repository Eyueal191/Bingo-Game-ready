const { createInMemoryChatStateStore } = require("./chatStateStore");

const userStatesStore = createInMemoryChatStateStore({ name: "userStates" });
const userStates = userStatesStore.state;

module.exports = {
    userStatesStore,
    userStates,
};
