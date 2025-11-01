const { check } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const University = require("../../models/universityModel");

exports.getFacultyValidator = [
  check("id").isMongoId().withMessage("Invalid faculty id format"),
  validatorMiddleware,
];

exports.createFacultyValidator = [
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
  check("image").custom((val, { req }) => {
    if (val) {
      throw new Error("Invalid faculty image format");
    }
    if (!req.file) {
      throw new Error("Faculty image is required");
    }
    return true;
  }),
  check("university")
    .notEmpty()
    .withMessage("University is required")
    .isMongoId()
    .withMessage("Invalid university id format")
    .custom((universityId) => {
      if (universityId) {
        return University.findById(universityId)
          .select("_id")
          .lean()
          .then((university) => {
            if (!university) {
              return Promise.reject(
                new Error(`No university for this id: ${universityId}`)
              );
            }
          });
      }
    }),
  validatorMiddleware,
];

exports.updateFacultyValidator = [
  check("id").isMongoId().withMessage("Invalid faculty id format"),
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
  check("university")
    .optional()
    .isMongoId()
    .withMessage("Invalid university id format")
    .custom((universityId) => {
      if (universityId) {
        return University.findById(universityId)
          .select("_id")
          .lean()
          .then((university) => {
            if (!university) {
              return Promise.reject(
                new Error(`No university for this id: ${universityId}`)
              );
            }
          });
      }
    }),
  check("image").custom((val) => {
    if (val) {
      throw new Error("Invalid faculty image format");
    }
    return true;
  }),
  validatorMiddleware,
];

exports.deleteFacultyValidator = [
  check("id").isMongoId().withMessage("Invalid faculty id format"),
  validatorMiddleware,
];
