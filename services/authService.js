const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const createToken = require("../utils/createToken");
const { sanitizeUser } = require("../utils/sanitizeData");

const User = require("../models/userModel");

exports.signup = asyncHandler(async (req, res) => {
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
  });

  const token = createToken(user._id);

  res.status(201).json({ data: sanitizeUser(user), token });
});

exports.login = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return next(new ApiError("Incorrect email or password", 401));
  }

  const token = createToken(user._id);

  res.status(200).json({ data: user, token });
});

const getToken = (req) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  return token;
};

exports.protect = asyncHandler(async (req, res, next) => {
  const WWWAuthenticate = [
    "WWW-Authenticate",
    `Bearer realm="${req.hostname}"`,
  ];

  const token = getToken(req);
  if (!token) {
    return res.setHeader(...WWWAuthenticate).sendStatus(401);
  }

  if (process.env.SEND_UNAUTHORIZED_ERROR_TYPE === "true") {
    WWWAuthenticate[1] += ", error=";
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  } catch (err) {
    if (WWWAuthenticate[1].endsWith("error=")) {
      WWWAuthenticate[1] += `"${err.message.replace(/ /g, "_")}"`;
    }
    return res.setHeader(...WWWAuthenticate).sendStatus(401);
  }

  const currentUser = await User.findById(decoded.userId).lean();
  if (!currentUser) {
    if (WWWAuthenticate[1].endsWith("error=")) {
      WWWAuthenticate[1] += `"user_not_exists"`;
    }
    return res.setHeader(...WWWAuthenticate).sendStatus(401);
  }

  if (currentUser.passwordChangedAt) {
    const passChangedTimestamp = parseInt(
      currentUser.passwordChangedAt.getTime() / 1000,
      10
    );

    if (passChangedTimestamp > decoded.iat) {
      if (WWWAuthenticate[1].endsWith("error=")) {
        WWWAuthenticate[1] += `"password_changed"`;
      }
      return res.setHeader(...WWWAuthenticate).sendStatus(401);
    }
  }

  req.user = currentUser;

  next();
});

exports.allowedTo = (...roles) =>
  asyncHandler(async (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError("You are not allowed to access this route", 403)
      );
    }
    next();
  });
