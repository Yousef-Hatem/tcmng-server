const { body, param } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const {
  validateName,
  validateImage,
  validateMongoId,
} = require("./fieldValidators");
const University = require("../../models/universityModel");

const validatePrice = body(["hourPrice", "cost"])
  .optional({ values: "null" })
  .isFloat({ min: 1, max: 1000000 })
  .withMessage("Must be a number between 1 and 1,000,000");

exports.courseIdValidator = [
  param("id").isMongoId().withMessage("Invalid course id format"),
  validatorMiddleware,
];

exports.createCourseValidator = [
  validateName({ maxLength: 100 }),
  validateImage(),
  validateMongoId(body("university"), {
    required: true,
    checkInModel: University,
  }),
  validatePrice,
  validatorMiddleware,
];

exports.updateCourseValidator = [
  param("id").isMongoId().withMessage("Invalid course id format"),
  validateName({ required: false, maxLength: 100 }),
  validateImage({ nullable: true }),
  validateMongoId(body("university"), { checkInModel: University }),
  validatePrice,
  validatorMiddleware,
];
