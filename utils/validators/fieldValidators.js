const { body } = require("express-validator");
const { dynamicMsg } = require("./validatorUtils");

const validateName = ({
  required = true,
  minLength = 2,
  maxLength = 50,
} = {}) => {
  const validation = body("name");

  if (required) {
    validation.notEmpty().withMessage("Name required");
  } else {
    validation.optional();
  }

  return validation
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
            if (val[key].length < minLength || val[key].length > maxLength) {
              throw new Error(
                `name.${key} length must be between ${minLength} and ${maxLength} characters`
              );
            }
          }
        });
      }
      return true;
    });
};

const validateImage = ({ required = false, nullable = false } = {}) =>
  body("image").custom((val, { req }) => {
    if (val !== undefined && (val !== null || !nullable)) {
      throw new Error("Image must be a file");
    }

    if (required && !req.file) {
      throw new Error("Image required");
    }
    return true;
  });

const validateMongoId = (
  validationChain,
  { required = false, checkInModel = undefined } = {}
) => {
  if (required) {
    validationChain.notEmpty().withMessage(dynamicMsg("$path is required"));
  } else {
    validationChain.optional();
  }

  validationChain
    .isMongoId()
    .withMessage(dynamicMsg("Invalid $path id format"));

  if (checkInModel) {
    validationChain.bail().custom((id, { path }) =>
      checkInModel
        .findById(id)
        .select("_id")
        .lean()
        .then((document) => {
          if (!document) {
            return Promise.reject(new Error(`No ${path} for this id: ${id}`));
          }
        })
    );
  }

  return validationChain;
};

module.exports = { validateName, validateImage, validateMongoId };
