const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/user");

// Sign tokens with JWT_SECRET. If it is not set, fall back to a random
// per-process secret so the server still starts; tokens then stop being
// valid whenever the process restarts.
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  JWT_SECRET = crypto.randomBytes(32).toString("hex");
  console.warn(
    "JWT_SECRET is not set. Using a random per-process secret; set JWT_SECRET in server/.env for stable tokens."
  );
}

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const normalizeEmail = (email) => email.trim().toLowerCase();

// Shape returned to the client: never include the password.
const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (![name, email, password].every(isNonEmptyString)) {
      return res
        .status(400)
        .json({ msg: "Name, email and password are required" });
    }

    const normalizedEmail = normalizeEmail(email);

    if (await User.exists({ email: normalizedEmail })) {
      return res
        .status(409)
        .json({ msg: "An account with this email already exists" });
    }

    // Groups and expenses are looked up by member name, so two accounts with
    // the same name would see each other's groups.
    if (await User.exists({ name: name.trim() })) {
      return res
        .status(409)
        .json({ msg: "That name is already taken; please use a different one" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });
    res.json({ msg: "Registered" });
  } catch (err) {
    // Unique index violation: two registrations raced for the same email.
    if (err && err.code === 11000) {
      return res
        .status(409)
        .json({ msg: "An account with this email already exists" });
    }
    console.error("Register Error:", err.message || err);
    res.status(500).json({ msg: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ msg: "Email and password are required" });
    }

    const user = await User.findOne({ email: normalizeEmail(email) });

    const passwordMatches = user && (await bcrypt.compare(password, user.password));

    if (!passwordMatches) {
      return res.status(400).json({ msg: "Invalid email or password" });
    }

    const safeUser = publicUser(user);
    const token = jwt.sign(safeUser, JWT_SECRET);

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error("Login Error:", err.message || err);
    res.status(500).json({ msg: "Login failed" });
  }
});

module.exports = router;
