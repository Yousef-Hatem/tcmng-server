const { check, body, param } = require("express-validator");
const slugify = require("slugify");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const User = require("../../models/userModel");

exports.createUserValidator = [
  check("fullName")
    .notEmpty()
    .withMessage("User required")
    .isLength({ min: 3 })
    .withMessage("Too short user fullName"),

  check("email")
    .notEmpty()
    .withMessage("Email required")
    .isEmail()
    .withMessage("Invalid email address")
    .custom((val) =>
      User.findOne({ email: val }).then((user) => {
        if (user) {
          return Promise.reject(new Error("E-mail already in user"));
        }
      })
    ),

  check("password")
    .notEmpty()
    .withMessage("Password required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .custom((password, { req }) => {
      if (password !== req.body.passwordConfirm) {
        throw new Error("Password confirmation incorrect");
      }
      return true;
    }),

  check("passwordConfirm")
    .notEmpty()
    .withMessage("Password confirmation required"),

  check("phone")
    .optional()
    .isMobilePhone(["ar-EG", "ar-SA"])
    .withMessage("Invalid phone number only accepted Egy and SA Phone numbers"),

  check("profileImg").optional(),
  check("role").optional(),

  validatorMiddleware,
];

exports.getUserValidator = [
  check("id").isMongoId().withMessage("Invalid user id format"),
  validatorMiddleware,
];

exports.updateUserValidator = [
  check("id").isMongoId().withMessage("Invalid user id format"),

  body("name")
    .optional()
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),

  check("email")
    .notEmpty()
    .withMessage("Email required")
    .isEmail()
    .withMessage("Invalid email address")
    .custom((val) =>
      User.findOne({ email: val }).then((user) => {
        if (user) {
          return Promise.reject(new Error("E-mail already in user"));
        }
      })
    ),

  check("phone")
    .optional()
    .isMobilePhone(["ar-EG", "ar-SA"])
    .withMessage("Invalid phone number only accepted Egy and SA Phone numbers"),

  check("profileImg").optional(),
  check("role").optional(),
  validatorMiddleware,
];

exports.changeUserPasswordValidator = [
  check("id").isMongoId().withMessage("Invalid user id format"),
  body("currentPassword")
    .notEmpty()
    .withMessage("You must enter your current password"),
  body("passwordConfirm")
    .notEmpty()
    .withMessage("You must enter the password confirm"),
  body("password")
    .notEmpty()
    .withMessage("You must enter new password")
    .custom(async (val, { req }) => {
      const user = await User.findById(req.params.id);
      if (!user) {
        throw new Error("There is no user for this id");
      }

      const isCorrectPassword = await bcrypt.compare(
        req.body.currentPassword,
        user.password
      );

      if (!isCorrectPassword) {
        throw new Error("Incorrect current password");
      }

      if (val !== req.body.passwordConfirm) {
        throw new Error("Password confirmation incorrect");
      }

      return true;
    }),
  validatorMiddleware,
];

exports.deleteUserValidator = [
  check("id").isMongoId().withMessage("Invalid user id format"),
  validatorMiddleware,
];

exports.updateLoggedUserValidator = [
  body("name")
    .optional()
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),

  check("email")
    .notEmpty()
    .withMessage("Email required")
    .isEmail()
    .withMessage("Invalid email address")
    .custom((val) =>
      User.findOne({ email: val }).then((user) => {
        if (user) {
          return Promise.reject(new Error("E-mail already in user"));
        }
      })
    ),

  check("phone")
    .optional()
    .isMobilePhone(["ar-EG", "ar-SA"])
    .withMessage("Invalid phone number only accepted Egy and SA Phone numbers"),

  validatorMiddleware,
];

exports.createStudentValidator = [
  check("fullName")
    .notEmpty()
    .withMessage("Full name is required")
    .isString()
    .withMessage("Invalid full name format")
    .isLength({ min: 10 })
    .withMessage("Min length of full name is 10")
    .isLength({ max: 100 })
    .withMessage("Max length of full name is 100"),
  check("nickname")
    .optional()
    .isString()
    .withMessage("Invalid nickname format")
    .isLength({ min: 2 })
    .withMessage("Min length of nickname is 2")
    .isLength({ max: 30 })
    .withMessage("Max length of nickname is 30"),
  check("nationalId")
    .notEmpty()
    .withMessage("National ID is required")
    .isInt()
    .withMessage("Invalid national ID format")
    .isLength({ min: 14, max: 14 })
    .withMessage("The min and max length of national ID is 14")
    .custom((val) => {
      if (val && Number.isInteger(Number(val)) && val.length === 14) {
        return User.findOne({ nationalId: val })
          .select("_id")
          .lean()
          .then((user) => {
            if (user) {
              return Promise.reject(new Error("National ID already in user"));
            }
          });
      }
      return true;
    }),
  check("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email address")
    .custom((val) => {
      if (val) {
        return User.findOne({ email: val })
          .select("_id")
          .lean()
          .then((user) => {
            if (user) {
              return Promise.reject(new Error("E-mail already in user"));
            }
          });
      }
      return true;
    }),
  check("phone")
    .optional()
    .isMobilePhone(["ar-EG", "ar-SA"])
    .withMessage("Invalid phone number only accepted EG and SA Phone numbers")
    .custom((val) => {
      if (val) {
        return User.findOne({ phone: val })
          .select("_id")
          .lean()
          .then((user) => {
            if (user) {
              return Promise.reject(new Error("Phone already in user"));
            }
          });
      }
      return true;
    }),
  check("profileImg").custom((val) => {
    if (val) {
      throw new Error("Invalid profile image format");
    }
    return true;
  }),
  check("password")
    .optional()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  check("passwordConfirm").custom((password, { req }) => {
    if (password && password !== req.body.passwordConfirm) {
      throw new Error("Password confirmation incorrect");
    }
    return true;
  }),
  check("gender")
    .optional()
    .isInt({ min: 0, max: 1 })
    .withMessage(
      "Gender should be 0 or 1, 0 means it is male and 1 means it is female"
    ),
  check("dateBirth")
    .optional()
    .isDate()
    .withMessage("Invalid date birth format"),
  check("year")
    .notEmpty()
    .withMessage("Year required")
    .isInt()
    .withMessage("Invalid year format")
    .custom((val, { req }) => {
      if (val !== undefined && req.data) {
        if (val > req.data.faculty.numberOfYears || val < 1) {
          throw new Error(
            `The max is ${req.data.faculty.numberOfYears} as this is the number of years of faculty and the min is 1`
          );
        }
      }
      return true;
    }),
  check("department").custom((val, { req }) => {
    if (req.data && req.body.year) {
      let facultyDepartmentsAvailable = false;

      req.data.faculty.years.forEach((year) => {
        if (Array.isArray(year.departments)) {
          facultyDepartmentsAvailable = true;
          if (req.body.year < year.number) {
            if (val) {
              throw new Error(
                `The student must be in year ${year.number} or more to choose the department in this faculty`
              );
            }
          } else if (val) {
            let departmentExists = false;
            year.departments.forEach((department) => {
              if (department._id.toString() === val) {
                departmentExists = true;
                req.data.department = department;
              }
            });
            if (!departmentExists) {
              throw new Error(
                `The faculty does not have a department with this ID ${val}`
              );
            }
          } else {
            throw new Error("The student department must be sent");
          }
        }
      });

      if (!facultyDepartmentsAvailable && val) {
        throw new Error(`There are no departments for this faculty`);
      }
    }
    return true;
  }),
  check("major").custom((val, { req }) => {
    const data = req.data || {};
    if (data.department) {
      let departmentMajorsAvailable = false;

      data.department.years.forEach((year) => {
        if (Array.isArray(year.majors)) {
          departmentMajorsAvailable = true;
          if (req.body.year < year.number) {
            if (val) {
              throw new Error(
                `The student must be in year ${year.number} or more to choose the major in this department`
              );
            }
          } else if (val) {
            let majorAvailable = false;
            year.majors.forEach((major) => {
              if (major._id.toString() === val) {
                majorAvailable = true;
              }
            });
            if (!majorAvailable) {
              throw new Error(
                `The department does not have a major with this ID ${val}`
              );
            }
          } else {
            throw new Error("The student major must be sent");
          }
        }
      });

      if (!departmentMajorsAvailable && val) {
        throw new Error(`There are no majors for this department`);
      }
    }
    return true;
  }),
  validatorMiddleware,
];

exports.addResultsValidator = [
  param("id").isMongoId().withMessage("Invalid student id format"),
  body(["subject.year", "year"])
    .optional()
    .isInt()
    .withMessage("Invalid year number format")
    .bail()
    .isInt({ min: 1, max: 6 })
    .withMessage("The min and max year number must be between 1 and 6")
    .toInt(),
  body(["subject.semester", "semester"])
    .default(1)
    .isInt()
    .withMessage("Invalid semester number format")
    .bail()
    .isInt({ min: 1, max: 2 })
    .withMessage("The min and max semester number must be between 1 and 2")
    .bail()
    .toInt()
    .replace(1, "firstSemester")
    .replace(2, "secondSemester"),
  body("subject.id")
    .notEmpty()
    .withMessage("Subject id is required")
    .bail()
    .isMongoId()
    .withMessage("Invalid subject id format"),
  body("score")
    .notEmpty()
    .withMessage("Score required")
    .bail()
    .isFloat()
    .withMessage("Invalid score format")
    .bail()
    .isFloat({ min: 1, max: 1000 })
    .withMessage("The min and max score must be between 1 and 1000")
    .toFloat(),
  validatorMiddleware,
];

exports.getStudentByNationalIdValidator = [
  param("nationalId")
    .isInt()
    .withMessage("Invalid national ID format")
    .bail()
    .isLength({ min: 14, max: 14 })
    .withMessage("Invalid national ID format")
    .toInt(),
  validatorMiddleware,
];
