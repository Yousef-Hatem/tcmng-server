const hpp = require("hpp");
const rateLimit = require("express-rate-limit");
const xss = require("xss");
// const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");
const cors = require("cors");

const { CLIENT_URL } = process.env;

const xssClean = (req, res, next) => {
  if (req.body) req.body = JSON.parse(xss(JSON.stringify(req.body)));
  if (req.query) req.query = JSON.parse(xss(JSON.stringify(req.query)));
  if (req.params) req.params = JSON.parse(xss(JSON.stringify(req.params)));
  next();
};

const checkOriginAndRefererHeaders = (req, res, next) => {
  const { origin, referer } = req.headers;
  if (origin !== CLIENT_URL || !referer || !referer.startsWith(CLIENT_URL)) {
    return res.sendStatus(403);
  }
  next();
};

const appProtectMiddleware = (app) => {
  // Enable client domain only to access application
  app.use(cors({ origin: CLIENT_URL }));

  // Limit each IP to 100 requests per `window` (here, per 5 minutes)
  app.use(
    rateLimit({
      windowMs: 5 * 60 * 1000,
      max: 100,
      message:
        "Too many requests were sent from this IP address, please try again later",
    })
  );

  // Use helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "script-src": ["'self'", CLIENT_URL],
        },
      },
      xFrameOptions: { action: "deny" },
      crossOriginResourcePolicy: false,
    })
  );

  // To apply data sanitization
  // app.use(mongoSanitize());
  app.use(xssClean);

  // Middleware to protect against HTTP Parameter Pollution attacks
  app.use(hpp());

  // Verify the origin of requests
  if (process.env.NODE_ENV !== "development") {
    app.use(checkOriginAndRefererHeaders);
  }
};

module.exports = appProtectMiddleware;
