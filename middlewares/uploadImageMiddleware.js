const fs = require("fs/promises");
const asyncHandler = require("express-async-handler");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const pluralize = require("pluralize");
const ApiError = require("../utils/apiError");
const {
  checkFolderInUploads,
  createFolderInUploads,
} = require("../utils/uploads");

const imagesFolder = "images";

const multerOptions = () => {
  const multerStorage = multer.memoryStorage();

  const multerFilter = function (req, file, cb) {
    if (file.mimetype.startsWith("image")) {
      cb(null, true);
    } else {
      cb(new ApiError("Only Images allowed", 400), false);
    }
  };

  const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

  return upload;
};

const saveImage = async (sharpImage, folder, filename) => {
  const path = `uploads/${imagesFolder}/${folder}/${filename}`;

  try {
    await sharpImage.toFile(path);
  } catch (error) {
    const stats = await checkFolderInUploads(`${imagesFolder}/${folder}`);
    if (stats) {
      throw error;
    }

    await createFolderInUploads(`${imagesFolder}/${folder}`);
    await sharpImage.toFile(path);
  }
};

exports.uploadSingleImage = (fieldName) => (req, res, next) =>
  multerOptions().single(fieldName)(req, res, (...parameters) => {
    req.body = JSON.parse(JSON.stringify(req.body));
    next(...parameters);
  });

exports.uploadMixOfImages = (arrayOfFields) =>
  multerOptions().fields(arrayOfFields);

exports.resizeImage = (options = {}) =>
  asyncHandler(async (req, res, next) => {
    if (req.file) {
      const mimetype =
        req.file.mimetype === "image/png" &&
        options.allowSavingInPngFormat === true
          ? "png"
          : "jpeg";

      const image = sharp(req.file.buffer)
        .resize(...options.resize)
        .toFormat(mimetype);

      const quality = options.quality || 95;
      if (mimetype === "png") {
        image.png({ quality });
      } else {
        image.jpeg({ quality });
      }

      const folderName = pluralize(options.model.modelName).toLowerCase();
      const filename = `${uuidv4()}-${Date.now()}.${mimetype}`;

      await saveImage(image, folderName, filename);

      req.body[options.fieldName] = filename;
    }

    next();
  });

exports.deleteImage = async (Model, imageName) => {
  const folderName = pluralize(Model.modelName).toLowerCase();
  const path = `uploads/${imagesFolder}/${folderName}/${imageName}`;
  try {
    await fs.unlink(path);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    console.warn("WARN", "No such image or directory", path);
  }
};
