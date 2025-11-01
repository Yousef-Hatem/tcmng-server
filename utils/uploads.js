const fs = require("fs");
const fsPromises = require("fs/promises");

exports.checkFolderInUploads = (path) =>
  new Promise((resolve, reject) => {
    fs.access(`uploads/${path}`, (err) => {
      if (err) {
        if (err.code !== "ENOENT") {
          reject(err);
        }
        resolve(false);
      }
      resolve(true);
    });
  });

exports.createFolderInUploads = (path) =>
  fsPromises.mkdir(`uploads/${path}`, { recursive: true });
