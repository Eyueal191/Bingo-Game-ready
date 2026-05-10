const express = require("express");
const router = express.Router();
const countryController = require("../controllers/countryController");
const { authenticate, isAdmin } = require("../middlewares/auth");

// Public — active countries for registration dropdown
router.get("/active", countryController.getActiveCountries);

// Admin — full CRUD
router.get("/", authenticate, isAdmin, countryController.getAllCountries);
router.post("/", authenticate, isAdmin, countryController.createCountry);
router.post("/initialize", authenticate, isAdmin, countryController.initializeCountries);
router.put("/:id", authenticate, isAdmin, countryController.updateCountry);
router.delete("/:id", authenticate, isAdmin, countryController.deleteCountry);

module.exports = router;
