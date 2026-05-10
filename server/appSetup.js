const express = require("express");
const helmetMiddleware = require("./middlewares/helmet");
const corsMiddleware = require("./middlewares/cors");
const rateLimitMiddleware = require("./middlewares/rateLimit");
const errorHandler = require("./middlewares/errorHandler");
const notFound = require("./middlewares/notFound");
const routes = require("./routes");
const path = require("path");
const morgan =  require("morgan")
const logger = require("./utils/winstonLogger");
// const { swaggerUi, swaggerSpec } = require("./swagger");
const app = express();
// 
app.use(morgan("dev"))

// 2. THEN normal middleware
app.use(corsMiddleware);
app.use(helmetMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. routes
app.use("/api/v1", routes);
// Add Swagger API documentation route
// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Serve static files from 'uploads' folder
app.use("/uploads", (req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  express.static(path.join(__dirname, "uploads"))(req, res, next);
});

// 404 handler (keeps API responses JSON)
app.use(notFound);

// Error Handling
app.use(errorHandler);

module.exports = app;
