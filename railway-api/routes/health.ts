const express = require("express");
const { getPool } = require("../db");
const { json } = require("../lib/http");

const router = express.Router();

router.get("/health", async (_req, res) => {
  try {
    const pool = getPool();
    await pool.query("select 1");
    return json(res, 200, { ok: true });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message });
  }
});

module.exports = router;
