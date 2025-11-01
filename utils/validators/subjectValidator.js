const { body, param } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");

exports.addSubjectValidator = [
  param("facultyId").isMongoId().withMessage("Invalid faculty id format"),
  param("year")
    .isInt({ min: 1, max: 6 })
    .withMessage("Invalid year number. It must be a number, min 1 and max 6"),
  param("semester").custom((val) => {
    if (val !== "firstSemester" && val !== "secondSemester") {
      throw Error(
        "Invalid semester. It must be firstSemester or secondSemester"
      );
    }
    return true;
  }),
  body("name")
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
  body("image").custom((val) => {
    if (val) {
      throw new Error("Invalid department image format");
    }
    return true;
  }),
  body("maxScore")
    .notEmpty()
    .withMessage("Max score is required")
    .isInt()
    .withMessage("Invalid max score format")
    .isInt({ min: 1, max: 1000 })
    .withMessage("The min and max number of maxScore is 1 and 1000"),
  body("passingMarksPercentage")
    .notEmpty()
    .withMessage("Passing marks percentage is required")
    .isInt()
    .withMessage("Invalid passing marks percentage")
    .isInt({ min: 1, max: 100 })
    .withMessage("The min and max for passing marks percentage is 1 and 100"),
  body("numberOfHours")
    .optional()
    .isInt()
    .withMessage("Invalid number of hours")
    .isInt({ min: 1, max: 30 })
    .withMessage("The min and max number of hours is 1 and 30"),
  body("hourPrice").custom((val, { req }) => {
    if (req.body.numberOfHours) {
      if (!val) {
        throw new Error("Hour price required if number of hours is sent");
      }
      if (Number.isNaN(val)) {
        throw new Error("Invalid hour price");
      }
      if (val < 1 || val > 1000000) {
        throw new Error("The min and max hour price is 1 and 1000000");
      }
    } else if (val) {
      throw new Error(
        "You must send a number of hours if you want to send an hour price or use the credit hour system"
      );
    }
    return true;
  }),
  body("cost").custom((val, { req }) => {
    if ((!req.body.numberOfHours && !val) || (req.body.numberOfHours && val)) {
      throw new Error("The cost or numberOfHours and hourPrice must be sent");
    }

    if (val) {
      if (Number.isNaN(val)) {
        throw new Error("Invalid cost number");
      }
      if (val < 1 || val > 1000000) {
        throw new Error("The min and max cost is 1 and 1000000");
      }
    }
    return true;
  }),
  body("department")
    .optional()
    .isMongoId()
    .withMessage("Invalid department format"),
  body("major").optional().isMongoId().withMessage("Invalid major format"),
  validatorMiddleware,
];
