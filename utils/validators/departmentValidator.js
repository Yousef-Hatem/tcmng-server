const { check } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");

exports.createDepartmentValidator = [
  check("facultyId").isMongoId().withMessage("Invalid faculty id format"),
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
            if (val[key].length < 2 || val[key].length > 50) {
              throw new Error(
                `name.${key} length must be between 2 and 50 characters`
              );
            }
          }
        });
      }
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

exports.updateDepartmentValidator = [
  check("facultyId").isMongoId().withMessage("Invalid faculty id format"),
  check("id").isMongoId().withMessage("Invalid department id format"),
  check("name")
    .optional()
    .isObject()
    .withMessage("Invalid name format")
    .custom((val) => {
      if (val) {
        Object.keys(val).forEach((key) => {
          if (key === "ar" || key === "en") {
            if (typeof val[key] !== "string") {
              throw new Error(`Invalid name.${key} format`);
            }
            if (val[key].length < 2 || val[key].length > 50) {
              throw new Error(
                `name.${key} length must be between 2 and 50 characters`
              );
            }
          }
        });
      }
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

exports.deleteDepartmentValidator = [
  check("facultyId").isMongoId().withMessage("Invalid faculty id format"),
  check("id").isMongoId().withMessage("Invalid department id format"),
  validatorMiddleware,
];
