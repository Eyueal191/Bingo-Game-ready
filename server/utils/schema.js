const Joi = require("joi");

const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .required();

const registerSchema = Joi.object({
  telegramId: Joi.string().required(),
  password: Joi.string().min(6).max(50).optional(),
  fullName: Joi.string().min(1).max(200).trim().required(),
  phone: Joi.string()
    .pattern(/^\+?\d+$/)
    .required(),
  invitedBy: Joi.string().optional(),
});

const loginSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^\+?\d+$/)
    .required(),
  password: Joi.string().required(),
});

const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(2).max(20).trim().optional(),
  phone: Joi.string()
    .pattern(/^\+?\d+$/)
    .optional(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).max(25).trim().required(),
});

const forgotPasswordSchema = Joi.object({
  phone: Joi.string().required(),
});

const passwordSchema = Joi.object({
  password: Joi.string().min(6).max(25).trim().required(),
});

const prizeTierSchema = Joi.object({
  rank: Joi.number().integer().min(1).required(),
  percent: Joi.number().min(0).max(100).required(),
});

const createGameSchema = Joi.object({
  bet_amount: Joi.number().positive().required(),
  max_players: Joi.number().integer().positive().required(),
  gameType: Joi.string().valid("keshkesh", "fetan-spin").default("keshkesh"),
  system_benefit: Joi.number().min(0).max(100).optional(),
  prize_tiers: Joi.array()
    .items(prizeTierSchema)
    .custom((value, helpers) => {
      // Ensure unique ranks
      const ranks = value.map((v) => v.rank);
      const hasDup = new Set(ranks).size !== ranks.length;
      if (hasDup) return helpers.error("any.invalid");
      return value;
    })
    .optional(),
}).custom((obj, helpers) => {
  const tiers = Array.isArray(obj.prize_tiers) ? obj.prize_tiers : [];
  const sum = tiers.reduce((s, t) => s + Number(t.percent || 0), 0);
  const sys = Number(obj.system_benefit || 0);
  if (sum + sys > 100) return helpers.error("any.invalid");
  return obj;
});



const updateGameSchema = Joi.object({
  bet_amount: Joi.number().positive().optional(),
  max_players: Joi.number().integer().positive().optional(),
  gameType: Joi.string().valid("keshkesh", "fetan-spin").optional(),
  status: Joi.string().valid("pending", "in_progress", "completed").optional(),
  system_benefit: Joi.number().min(0).max(100).optional(),
  prize_tiers: Joi.array()
    .items(prizeTierSchema)
    .custom((value, helpers) => {
      const ranks = value.map((v) => v.rank);
      const hasDup = new Set(ranks).size !== ranks.length;
      if (hasDup) return helpers.error("any.invalid");
      return value;
    })
    .optional(),
}).custom((obj, helpers) => {
  const tiers = Array.isArray(obj.prize_tiers) ? obj.prize_tiers : [];
  const sum = tiers.reduce((s, t) => s + Number(t.percent || 0), 0);
  const sys =
    obj.system_benefit !== undefined && obj.system_benefit !== null
      ? Number(obj.system_benefit)
      : 0;
  if (sum + sys > 100) return helpers.error("any.invalid");
  return obj;
});
module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  passwordSchema,
  createGameSchema,
  updateGameSchema,
};
