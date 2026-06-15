const express = require("express");

const healthRoutes = require("./routes/health");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const offerRoutes = require("./routes/offers");
const membershipRoutes = require("./routes/memberships");
const paymongoRoutes = require("./routes/paymongo");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "1mb" }));

app.use(healthRoutes);
app.use(authRoutes);
app.use(adminRoutes);
app.use(offerRoutes);
app.use(membershipRoutes);
app.use(paymongoRoutes);

app.listen(PORT, () => {
  console.log(`Railway API listening on port ${PORT}`);
});
