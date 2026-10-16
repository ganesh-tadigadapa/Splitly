const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/user");

// Shape returned to the client: never include the password.
const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    await User.create({ name, email, password });
    res.json({ msg: "Registered" });
  } catch (err) {
    console.error("Register Error:", err.message || err);
    res.status(500).json({ msg: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.password !== password) {
      return res.status(400).json({ msg: "Invalid" });
    }

    const safeUser = publicUser(user);
    const token = jwt.sign(safeUser, "secret");

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error("Login Error:", err.message || err);
    res.status(500).json({ msg: "Login failed" });
  }
});

module.exports = router;
