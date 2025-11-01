const express = require("express");
const { loginValidator } = require("../utils/validators/authValidator");

const { login } = require("../services/authService");

const router = express.Router();

router.post("/login", loginValidator, login);

module.exports = router;
