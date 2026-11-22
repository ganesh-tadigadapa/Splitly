const express = require("express");
const router = express.Router();
const Expense = require("../models/Expense");

const Group = require("../models/Group");

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Work out who owes what for one expense.
 * - `splits` ([{ name, amount }]) gives exact shares; they must add up to `amount`.
 * - Otherwise the amount is split equally between `splitBetween` (or all `members`).
 * Returns { splitAmong } or { error }.
 */
function buildSplits({ amount, members, splitBetween, splits }) {
  if (Array.isArray(splits) && splits.length > 0) {
    const parsed = splits
      .filter((s) => s && typeof s.name === "string" && s.name.trim())
      .map((s) => ({ name: s.name.trim(), amount: round2(Number(s.amount) || 0) }));
    if (parsed.some((s) => s.amount < 0)) return { error: "Shares can't be negative" };
    const clean = parsed.filter((s) => s.amount > 0);
    if (clean.length === 0) return { error: "Give at least one person a share" };
    const sum = clean.reduce((t, s) => t + s.amount, 0);
    if (Math.abs(sum - amount) > 0.01) {
      return { error: `Shares add up to ${round2(sum)}, but the expense is ${round2(amount)}` };
    }
    return { splitAmong: clean };
  }

  const people = Array.isArray(splitBetween) && splitBetween.length > 0 ? splitBetween : members;
  if (!Array.isArray(people) || people.length === 0) return { error: "Pick at least one person to split with" };
  const each = amount / people.length;
  return { splitAmong: people.map((name) => ({ name, amount: each })) };
}

function parseDate(value) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// ✅ ADD EXPENSE
router.post("/add", async (req, res) => {
  try {
    const { title, category, paidBy, members, splitBetween, splits, groupId, date } = req.body;
    const amount = Number(req.body.amount);

    if (!title || !(amount > 0) || !paidBy || !groupId) {
      return res.status(400).json({ msg: "Title, a positive amount, payer and group are required" });
    }

    const { splitAmong, error } = buildSplits({ amount, members, splitBetween, splits });
    if (error) return res.status(400).json({ msg: error });

    const expense = new Expense({
      title,
      amount,
      category: category || "General",
      paidBy,
      members, // We keep the full members array just for record, but splitAmong is what matters
      groupId,
      date: parseDate(date),
      splitAmong,
    });

    await expense.save();

    res.json(expense);
  } catch (err) {
    console.log("ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ✏️ EDIT EXPENSE
router.put("/:id", async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ msg: "Expense not found" });

    const { title, category, paidBy, splitBetween, splits, date } = req.body;
    const amount = req.body.amount !== undefined ? Number(req.body.amount) : expense.amount;
    if (!(amount > 0)) return res.status(400).json({ msg: "Amount must be greater than zero" });

    const members = req.body.members || expense.members;
    const needsResplit = splits || splitBetween || req.body.amount !== undefined;
    if (needsResplit) {
      const { splitAmong, error } = buildSplits({
        amount,
        members,
        splitBetween: splitBetween || expense.splitAmong.map((s) => s.name),
        splits,
      });
      if (error) return res.status(400).json({ msg: error });
      expense.splitAmong = splitAmong;
    }

    expense.amount = amount;
    if (title) expense.title = title;
    if (category) expense.category = category;
    if (paidBy) expense.paidBy = paidBy;
    if (date !== undefined) expense.date = parseDate(date);

    await expense.save();
    res.json(expense);
  } catch (err) {
    console.error("Edit expense error:", err);
    res.status(500).json({ msg: "Couldn't update the expense" });
  }
});

// 🗑️ DELETE EXPENSE
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Expense.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ msg: "Expense not found" });
    res.json({ msg: "Deleted", expense: deleted });
  } catch (err) {
    console.error("Delete expense error:", err);
    res.status(500).json({ msg: "Couldn't delete the expense" });
  }
});

// 📋 ALL EXPENSES ACROSS A USER'S GROUPS (activity feed + insights)
router.get("/user/:username/all", async (req, res) => {
  try {
    const nameRe = new RegExp(`^${escapeRegex(req.params.username)}$`, "i");
    const groups = await Group.find({ members: nameRe }, { name: 1 });
    const expenses = await Expense.find({ groupId: { $in: groups.map((g) => g.name) } })
      .sort({ createdAt: -1 })
      .limit(500);
    res.json(expenses);
  } catch (err) {
    console.error("All expenses error:", err);
    res.status(500).json({ msg: "Error fetching expenses" });
  }
});

// ✅ GET ALL GROUPS FOR A USER
router.get("/user/:username/groups", async (req, res) => {
  try {
    const { username } = req.params;
    
    // Find all expenses where user is paidBy OR in members array
    // We use case-insensitive regex for robust matching
    const expenses = await Expense.find({
      $or: [
        { paidBy: { $regex: new RegExp(`^${username}$`, 'i') } },
        { members: { $regex: new RegExp(`^${username}$`, 'i') } }
      ]
    });

    // Extract unique group IDs
    const groups = [...new Set(expenses.map(e => e.groupId))];
    
    res.json(groups);
  } catch (err) {
    console.error("Groups fetch error:", err);
    res.status(500).json({ msg: "Error fetching user groups" });
  }
});


// ✅ GET EXPENSES BY GROUP
router.get("/:groupId", async (req, res) => {
  try {
    const expenses = await Expense.find({
      groupId: req.params.groupId,
    }).sort({ createdAt: -1 });

    res.json(expenses);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching expenses" });
  }
});

// ✅ GET SETTLEMENTS BY GROUP
router.get("/settlements/:groupId", async (req, res) => {
  try {
    const expenses = await Expense.find({ groupId: req.params.groupId });
    
    // Calculate net balances (case-insensitive)
    const balances = {};
    expenses.forEach(exp => {
      const paidBy = exp.paidBy.toLowerCase();
      balances[paidBy] = (balances[paidBy] || 0) + exp.amount;
      exp.splitAmong.forEach(split => {
        const splitName = split.name.toLowerCase();
        balances[splitName] = (balances[splitName] || 0) - split.amount;
      });
    });

    let debtors = [];
    let creditors = [];
    for (const [name, balance] of Object.entries(balances)) {
      if (balance < -0.01) debtors.push({ name, amount: -balance });
      else if (balance > 0.01) creditors.push({ name, amount: balance });
    }

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const settlements = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(debtor.amount, creditor.amount);

      settlements.push({
        _id: `${debtor.name}-${creditor.name}-${Date.now()}-${Math.random()}`,
        from: debtor.name,
        to: creditor.name,
        amount: parseFloat(amount.toFixed(2)),
        settled: false
      });

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    res.json(settlements);
  } catch (err) {
    console.error("Settlement Error:", err);
    res.status(500).json({ msg: "Error calculating settlements" });
  }
});

module.exports = router;