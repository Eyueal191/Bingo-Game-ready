const express = require("express");
const helmetMiddleware = require("./middlewares/helmet");
const corsMiddleware = require("./middlewares/cors");
const rateLimitMiddleware = require("./middlewares/rateLimit");
const errorHandler = require("./middlewares/errorHandler");
const notFound = require("./middlewares/notFound");
const routes = require("./routes");
const path = require("path");
const logger = require("./utils/winstonLogger");
// const { swaggerUi, swaggerSpec } = require("./swagger");
const app = express();

// Middleware
app.use(logger.expressContextMiddleware());
app.use(corsMiddleware);
app.use(helmetMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimitMiddleware);
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running smoothly" });
});

// Routes
app.use("/api/v1", routes);

// Add Swagger API documentation route
// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Serve static files from 'uploads' folder
app.use("/uploads", (req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  express.static(path.join(__dirname, "uploads"))(req, res, next);
});

// Serve frontend client in production
// app.use(express.static(path.join(__dirname, "../client/dist")));

// API 404 handler (keeps API responses JSON)
app.use("/api", notFound);

// Catch-all route to serve React app for SPA routing (prevents 404 on refresh)
// app.get(/.*/, (req, res) => {
//   res.sendFile(path.join(__dirname, "../client/dist/index.html"));
// });

// Error Handling
app.use(errorHandler);

module.exports = app;
