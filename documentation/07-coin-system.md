# Earntix Coin System (Financial Ledger)

## 1. Overview
The Point/Coin system is the financial backbone of Earntix. Because users can convert these points into actual fiat currency (e.g., USD via bank transfers), this system is designed to be highly resilient against double-spending and race condition attacks.

100 Points = $1.00 USD. Minimum withdrawal is 3000 Points ($30).

## 2. Core Concepts
A user's wallet contains two fields:
- **`points`**: Total accumulated points.
- **`frozenPoints`**: Points currently locked up in a pending withdrawal request.

**Available Balance Calculation:** 
`Available Points = points - frozenPoints`

---

## 3. Atomic Transactions

The [pointService.js](file:///d:/Downloads/rrb_je_pyq/COMPNEY%20WORK/Website/Earnitix%20app/backend/src/services/pointService.js) dictates all point modifications. **Never manually modify a user's points outside of this service.** It uses MongoDB atomic operators (`$inc`) and native query filters to guarantee thread safety.

### 3.1 Awarding Points
Triggered when an admin approves a Submission or a Blog.
```javascript
const user = await User.findByIdAndUpdate(
  userId,
  { $inc: { points: points } },
  { new: true }
);
```

### 3.2 Requesting a Withdrawal (Freeze)
When a user requests $30, we must *freeze* the points so they cannot spend/withdraw them again while the admin reviews the request.
This is done atomically by enforcing the logic inside the MongoDB query itself:
```javascript
const user = await User.findOneAndUpdate(
  {
    _id: userId,
    $expr: { $gte: [{ $subtract: ['$points', '$frozenPoints'] }, amount] }
  },
  { $inc: { frozenPoints: amount } },
  { new: true }
);
```
*Why this works:* If two identical withdrawal requests hit the server at the exact same millisecond, the second query will fail because the first query atomically modified `frozenPoints`, making the `$expr` condition evaluate to false.

### 3.3 Completing a Withdrawal
Admin clicks "Pay". The points are permanently burned from the system, and the freeze is lifted. Both are done in one atomic `$inc`.
```javascript
const user = await User.findOneAndUpdate(
  { _id: userId, points: { $gte: pointsUsed } },
  { $inc: { points: -pointsUsed, frozenPoints: -pointsUsed } }
);
```

### 3.4 Rejecting a Withdrawal (Unfreeze)
Admin clicks "Reject". The freeze is lifted, returning the points to the `Available Balance`.
```javascript
const user = await User.findByIdAndUpdate(
  userId,
  { $inc: { frozenPoints: -amount } }
);
```

---

## 4. Double Spending Protection

In addition to atomic database operations, withdrawals are wrapped in **Mongoose Sessions (Transactions)**.
If a user requests a withdrawal, the following happens inside a `session.startTransaction()` block:
1. `verifyCaptcha()` validates human interaction.
2. `freezePoints()` securely locks the points.
3. `Withdrawal.create()` logs the withdrawal request.
4. `session.commitTransaction()` fires.

If any of those steps fail (e.g., `Withdrawal.create` throws an error because the DB is full), `session.abortTransaction()` fires, rolling back the `freezePoints` operation automatically.

---

## 5. Security & Cooldowns

To prevent users from flooding the admin panel with withdrawal requests:
1. **Pending Lock:** If a user has a `pending` or `processing` withdrawal, they cannot request another one.
2. **24-Hour Cooldown:** A user cannot request a withdrawal if they submitted one in the past 24 hours, even if the previous one was rejected.
