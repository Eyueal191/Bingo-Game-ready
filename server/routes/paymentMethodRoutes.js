const express = require("express");
const { authenticate, isAdmin } = require("../middlewares/auth");
const {
  getPaymentMethods,
  getAllPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} = require("../controllers/paymentMethodController");

const router = express.Router();

// Authenticated users can fetch methods for their country
router.get("/", authenticate, getPaymentMethods);

// Admin-only CRUD
router.get("/all", authenticate, isAdmin, getAllPaymentMethods);
router.post("/", authenticate, isAdmin, createPaymentMethod);
router.put("/:id", authenticate, isAdmin, updatePaymentMethod);
router.delete("/:id", authenticate, isAdmin, deletePaymentMethod);

module.exports = router;
