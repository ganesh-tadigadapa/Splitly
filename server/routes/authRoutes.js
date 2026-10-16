const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
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
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashedPassword });
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

    const passwordMatches = user && (await bcrypt.compare(password, user.password));

    if (!passwordMatches) {
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
