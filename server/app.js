require("dotenv").config();
const express = require("express");
require("dotenv").config();
require("./db");
const cloudinary = require("cloudinary").v2;
const { isAuthenticated } = require("./middleware/jwt.middleware");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
require("./config")(app);

const indexRoutes = require("./routes/index.routes");
app.use("/api", indexRoutes);

const authRouter = require("./routes/auth.routes");
app.use("/auth", authRouter);

const userRouter = require("./routes/users.routes");
app.use("/api/users", isAuthenticated, userRouter);

const postRouter = require("./routes/posts.routes");
app.use("/api/posts", isAuthenticated, postRouter);

const notificationRouter = require("./routes/notification.routes");
app.use("/api/notifications", isAuthenticated, notificationRouter);

require("./error-handling")(app);

module.exports = app;
