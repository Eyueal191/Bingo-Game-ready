const generateUniqueId = () => {
  return Date.now().toString() + Math.random().toString(36).slice(2, 11);
};

module.exports = generateUniqueId;
