const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { isAuthenticated } = require("./../middleware/jwt.middleware.js");
const User = require("../models/User.model");
const router = express.Router();
const saltRounds = 10;

router.post("/signup", (req, res, next) => {
  const { email, password, name, userName } = req.body;
  if (email === "" || password === "" || name === "" || userName === "") {
    return res
      .status(400)
      .json({ message: "Provide email, password and name" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Provide a valid email address." });
  }

  const passwordRegex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message:
        "Password must have at least 6 characters and contain at least one number, one lowercase and one uppercase letter.",
    });
  }

  const userNameRegex = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;
  if (!userNameRegex.test(userName)) {
    return res.status(400).json({
      message:
        "Username can only contain letters, numbers, underscores and must be between 3 and 20 characters",
    });
  }
  Promise.all([User.findOne({ email }), User.findOne({ userName })])
    .then(([foundUserMail, foundUserName]) => {
      if (foundUserMail) {
        return res.status(400).json({ message: "Email already registered" });
      }
      if (foundUserName) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const salt = bcrypt.genSaltSync(saltRounds);
      const hashedPassword = bcrypt.hashSync(password, salt);
      return User.create({ email, password: hashedPassword, name, userName });
    })
    .then((createdUser) => {
      const { email, name, _id, userName } = createdUser;
      const user = { email, name, _id, userName };
      return res.status(201).json({ user: user });
    })
    .catch((err) => {
      console.log(err);
      if (!res.headersSent) {
        return res.status(500).json({ message: "Internal Server Error" });
      }
    });
});

router.post("/login", (req, res, next) => {
  const { email, password } = req.body;
  console.log("Received email:", email);
  console.log("Received password:", password);
  if (email === "" || password === "") {
    res.status(400).json({ message: "Provide email and password." });
    return;
  }

  User.findOne({ email })
    .then((foundUser) => {
      if (!foundUser) {
        res.status(401).json({ message: "User not found." });
        return;
      }

      const passwordCorrect = bcrypt.compareSync(password, foundUser.password);
      if (passwordCorrect) {
        const { _id, email, name } = foundUser;
        const payload = { _id, email, name };
        const authToken = jwt.sign(payload, process.env.TOKEN_SECRET, {
          algorithm: "HS256",
          expiresIn: "6h",
        });
        res.status(200).json({ authToken: authToken });
      } else {
        res.status(401).json({ message: "Unable to authenticate the user" });
      }
    })
    .catch((err) =>
      res.status(500).json({ message: "An error occurred during login" })
    );
});

router.get("/verify", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.payload._id).select("-password");
    res.status(200).json(user);
  } catch (error) {
    console.log("Error verifying User", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
