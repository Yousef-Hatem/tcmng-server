const { check } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");

exports.getUniversityValidator = [
  check("id").isMongoId().withMessage("Invalid university id format"),
  validatorMiddleware,
];

exports.createUniversityValidator = [
  check("name")
    .notEmpty()
    .withMessage("Name required")
    .isObject()
    .withMessage("Invalid name format")
    .custom((val) => {
      if (val) {
        if (val.en === undefined) {
          throw new Error(`name.en required`);
        }
        if (val.ar === undefined) {
          throw new Error(`name.ar required`);
        }
        Object.keys(val).forEach((key) => {
          if (key === "ar" || key === "en") {
            if (typeof val[key] !== "string") {
              throw new Error(`Invalid name.${key} format`);
            }
            if (val[key].length < 3 || val[key].length > 30) {
              throw new Error(
                `name.${key} length must be between 3 and 30 characters`
              );
            }
          }
        });
      }
      return true;
    }),
  check("image").custom((val, { req }) => {
    if (val) {
      throw new Error("Invalid department image format");
    }
    if (!req.file) {
      throw new Error("University image is required");
    }
    return true;
  }),
  validatorMiddleware,
];

exports.updateUniversityValidator = [
  check("id").isMongoId().withMessage("Invalid university id format"),
  check("name")
    .optional()
    .isObject()
    .withMessage("Invalid name format")
    .custom((val, { req }) => {
      if (val) {
        req.body["name.ar"] = val.ar;
        req.body["name.en"] = val.en;
      }
      return true;
    }),
  check("name.ar")
    .optional()
    .isString()
    .withMessage("Invalid name.ar format")
    .isLength({ min: 3, max: 30 })
    .withMessage("name.ar length must be between 3 and 30 characters")
    .custom((val, { req }) => {
      req.body.name = undefined;
      return true;
    }),
  check("name.en")
    .optional()
    .isString()
    .withMessage("Invalid name.en format")
    .isLength({ min: 3, max: 30 })
    .withMessage("name.en length must be between 3 and 30 characters")
    .custom((val, { req }) => {
      req.body.name = undefined;
      return true;
    }),
  check("image").custom((val) => {
    if (val) {
      throw new Error("Invalid department image format");
    }
    return true;
  }),
  validatorMiddleware,
];

exports.deleteUniversityValidator = [
  check("id").isMongoId().withMessage("Invalid university id format"),
  validatorMiddleware,
];
