const express = require("express");
const router = express.Router();
const Group = require("../models/Group");
const Expense = require("../models/Expense");

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exactName = (name) => new RegExp(`^${escapeRegex(String(name).trim())}$`, "i");

// POST: Create a new group
router.post("/create", async (req, res) => {
  try {
    const { name, emoji, members, createdBy } = req.body;

    if (!name || !members || members.length === 0 || !createdBy) {
      return res.status(400).json({ msg: "Name, members, and createdBy are required" });
    }

    // Expenses are stored against the group's name, so names must be unique.
    if (await Group.exists({ name: exactName(name) })) {
      return res.status(409).json({ msg: "A group with that name already exists. Pick another name." });
    }

    const newGroup = new Group({
      name,
      emoji: emoji || "🌴",
      members,
      createdBy,
    });

    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (err) {
    console.error("Error creating group:", err);
    res.status(500).json({ msg: "Server error creating group" });
  }
});

// GET: Fetch groups for a specific user
router.get("/user/:username", async (req, res) => {
  try {
    const { username } = req.params;

    // Find groups where the user is a member
    const groups = await Group.find({
      members: exactName(username),
    }).sort({ createdAt: -1 });

    // Enhance groups with total expense calculation
    const enhancedGroups = await Promise.all(
      groups.map(async (group) => {
        const expenses = await Expense.find({ groupId: group.name });
        
        // Exclude settlements from total expenses and total amount
        const nonSettlementExpenses = expenses.filter(exp => exp.title !== "Settlement Payment");
        const totalExpenses = nonSettlementExpenses.length;
        const totalAmount = nonSettlementExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        // Simple mock of 'You are owed' vs 'You owe'
        let youAreOwed = 0;
        let youOwe = 0;
        
        expenses.forEach((exp) => {
          if (exp.paidBy.toLowerCase() === username.toLowerCase()) {
            // User paid, others owe them
            exp.splitAmong.forEach((split) => {
              if (split.name.toLowerCase() !== username.toLowerCase()) {
                youAreOwed += split.amount;
              }
            });
          } else {
            // Someone else paid, user might owe
            exp.splitAmong.forEach((split) => {
              if (split.name.toLowerCase() === username.toLowerCase()) {
                youOwe += split.amount;
              }
            });
          }
        });

        // Net balance within this group
        const netOwe = youOwe - youAreOwed;

        return {
          ...group.toObject(),
          totalExpenses,
          totalAmount,
          netOwe, // if positive, you owe. If negative, you are owed.
        };
      })
    );

    res.json(enhancedGroups);
  } catch (err) {
    console.error("Error fetching user groups:", err);
    res.status(500).json({ msg: "Error fetching user groups" });
  }
});

// POST: Add a member to an existing group
router.post("/:name/members", async (req, res) => {
  try {
    const member = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (!member) return res.status(400).json({ msg: "Member name is required" });

    const group = await Group.findOne({ name: req.params.name });
    if (!group) return res.status(404).json({ msg: "Group not found" });

    if (group.members.some((m) => m.toLowerCase() === member.toLowerCase())) {
      return res.status(409).json({ msg: `${member} is already in this group` });
    }

    group.members.push(member);
    await group.save();
    res.json(group);
  } catch (err) {
    console.error("Error adding member:", err);
    res.status(500).json({ msg: "Couldn't add the member" });
  }
});

// DELETE: Delete a group and all of its expenses
router.delete("/:name", async (req, res) => {
  try {
    const group = await Group.findOneAndDelete({ name: req.params.name });
    if (!group) return res.status(404).json({ msg: "Group not found" });
    const { deletedCount } = await Expense.deleteMany({ groupId: group.name });
    res.json({ msg: "Deleted", expensesDeleted: deletedCount });
  } catch (err) {
    console.error("Error deleting group:", err);
    res.status(500).json({ msg: "Couldn't delete the group" });
  }
});

module.exports = router;
