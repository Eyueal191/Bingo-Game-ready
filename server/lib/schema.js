const Joi = require("joi");

// ObjectId validation for MongoDB
const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .required();

const paramsSchema = Joi.object({
  id: objectId,
});

const registerSchema = Joi.object({
  telegramId: Joi.string().optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).max(50).optional(),
  fullName: Joi.string().min(1).max(200).trim().required(),
  phone: Joi.string()
    .pattern(/^\+?\d+$/)
    .required(),
  invitedBy: Joi.string().optional(),
  country: Joi.string().min(2).max(3).uppercase().optional(),
});

const guestRegisterSchema = Joi.object({
  fullName: Joi.string().min(1).max(100).optional(),
});

const staffRegisterSchema = Joi.object({
  fullName: Joi.string().min(1).max(200).trim().required(),
  phone: Joi.string()
    .pattern(/^\+?\d+$/)
    .required(),
  password: Joi.string().min(6).max(50).required(),
  email: Joi.string().email().optional(),
  role: Joi.string()
    .valid("finance", "secretary", "manager")
    .required(),
});

const loginSchema = Joi.object({
  phone: Joi.string().pattern(/^\+?\d+$/).required(),
  password: Joi.string().required(),
});

const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(2).max(20).trim().optional(),
  phone: Joi.string()
    .pattern(/^\+?\d+$/)
    .optional(),
});

const tokenParamsSchema = Joi.object({
  token: Joi.string().required(),
});

const passwordSchema = Joi.object({
  password: Joi.string().min(6).max(25).trim().required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).max(25).trim().required(),
});

const forgotPasswordSchema = Joi.object({
  phone: Joi.string().required(),
});

module.exports = {
  loginSchema,
  updateProfileSchema,
  paramsSchema,
  registerSchema,
  tokenParamsSchema,
  passwordSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  guestRegisterSchema,
  staffRegisterSchema,
};
