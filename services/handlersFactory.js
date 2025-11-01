const fs = require("fs/promises");
const asyncHandler = require("express-async-handler");
const pluralize = require("pluralize");
const ApiError = require("../utils/apiError");
const ApiFeatures = require("../utils/apiFeatures");
const { deleteImage } = require("../middlewares/uploadImageMiddleware");

class HandlersFactory {
  constructor(Model, options = {}) {
    this.Model = Model;
    this.options = options;
    this.embeddedPath = options.embeddedPath;
  }

  #getBody = (req) => {
    const { body } = req;

    if (this.options.bodyFields) {
      const bodyFields = this.options.bodyFields.split(" ");
      const selectedFields = [];
      const removedFields = [];

      bodyFields.forEach((field) => {
        if (field.startsWith("-")) {
          removedFields.push(field.split("-")[1]);
        } else {
          selectedFields.push(field);
        }
      });

      const newBody = {};
      if (selectedFields.length) {
        selectedFields.forEach((field) => {
          newBody[field] = body[field];
        });
      } else {
        Object.keys(body).forEach((field) => {
          if (!removedFields.includes(field)) {
            newBody[field] = body[field];
          }
        });
      }

      return newBody;
    }

    return body ?? {};
  };

  #setOptionsInQuery = (query, options) => {
    const select =
      options.select ||
      this.options.select ||
      `-__v -updatedAt -deleted ${options.addSelect || ""}`;
    const populate = options.populate || this.options.populate;

    if (this.embeddedPath) {
      query.select(`${this.embeddedPath}`);
    } else {
      query.select(select);
    }

    if (populate) {
      if (this.embeddedPath) {
        query = query.populate(`${this.embeddedPath}.${populate}`);
      } else {
        query = query.populate(populate);
      }
    }

    return query.lean();
  };

  #deleteImages = async (imageNames) => {
    const folderName = pluralize(this.Model.modelName.toLowerCase());
    await Promise.all(
      imageNames.map(async (imageName) => {
        const path = `uploads/images/${folderName}/${imageName}`;
        await fs.unlink(path);
      })
    );
  };

  #prepareUpdateQuery = (updateData, arrayFilterEmbedded = "d") => {
    const updateQuery = { $set: {}, $unset: {} };
    const startKey = this.embeddedPath
      ? `${this.embeddedPath}.$[${arrayFilterEmbedded}].`
      : "";

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === null) {
        updateQuery.$unset[startKey + key] = "";
      } else {
        updateQuery.$set[startKey + key] = updateData[key];
      }

      delete updateData[key];
    });

    Object.keys(updateQuery).forEach((key) =>
      !Object.keys(updateQuery[key]).length
        ? delete updateQuery[key]
        : undefined
    );

    return updateQuery;
  };

  #getDocIdForEmbedded = (req) =>
    req.params[`${this.Model.modelName.toLowerCase()}Id`];

  #getLastEmbeddedDoc = (document) =>
    document[this.embeddedPath][document[this.embeddedPath].length - 1];

  #getNoDocError = (docId = "", embeddedDoc = false) => {
    const modelName = this.Model.modelName.toLowerCase();
    let message = `No ${modelName} found with ID ${docId}`;

    if (this.embeddedPath && embeddedDoc) {
      message = `No ${pluralize.singular(this.embeddedPath)} found with ID ${docId} in this ${modelName}`;
    }

    return new ApiError(message, 404);
  };

  #getEmbeddedDocById = (document, id) => {
    const embeddedDoc = document[this.embeddedPath].find(
      (doc) => String(doc._id) === id
    );
    if (!embeddedDoc) {
      throw this.#getNoDocError(id, true);
    }
    return embeddedDoc;
  };

  deleteDocumentImage = async (
    req,
    imageKey,
    { select, getLocationOfImage } = {}
  ) => {
    const newImage = this.#getBody(req)[imageKey];
    if (newImage !== undefined) {
      const { id } = req.params;
      const document = await this.Model.findById(id)
        .select(select ?? imageKey)
        .lean();
      if (!document) {
        if (newImage) {
          await deleteImage(this.Model, newImage);
        }
        throw new ApiError(`No document for this id ${id}`, 404);
      }
      let imageName;
      if (getLocationOfImage) {
        try {
          const location = getLocationOfImage(document);
          imageName = location[imageKey];
        } catch (err) {
          if (newImage) {
            await deleteImage(this.Model, newImage);
          }
          throw err;
        }
      } else {
        imageName = document[imageKey];
      }
      if (imageName !== undefined) {
        await deleteImage(this.Model, imageName);
      }
    }
  };

  #createDocument = (sanitize) =>
    asyncHandler(async (req, res) => {
      let newDoc = await this.Model.create(this.#getBody(req));

      if (sanitize) {
        newDoc = sanitize(newDoc);
      } else if (sanitize !== false) {
        newDoc.__v = undefined;
        newDoc.updatedAt = undefined;
        newDoc.deleted = undefined;
      }

      res.status(201).json({ data: newDoc });
    });

  #createEmbeddedDoc = (sanitize) =>
    asyncHandler(async (req, res, next) => {
      const docId = this.#getDocIdForEmbedded(req);
      const $push = {};
      $push[this.embeddedPath] = this.#getBody(req);

      const document = await this.Model.findByIdAndUpdate(
        docId,
        { $push },
        { new: true }
      )
        .select(`${this.embeddedPath}`)
        .lean();

      if (!document) {
        return next(this.#getNoDocError(docId));
      }

      let embeddedDoc = this.#getLastEmbeddedDoc(document);

      if (sanitize) {
        embeddedDoc = sanitize(embeddedDoc);
      }

      return res.status(201).json({ data: embeddedDoc });
    });

  #updateDocument = (options) =>
    asyncHandler(async (req, res, next) => {
      const { imageKey = "image" } = options;
      await this.deleteDocumentImage(req, imageKey);

      const updateQuery = this.#prepareUpdateQuery(this.#getBody(req));

      if (!Object.keys(updateQuery).length) {
        return next(new ApiError("No data provided to update"));
      }

      let query = this.Model.findByIdAndUpdate(req.params.id, updateQuery, {
        new: true,
      });
      query = this.#setOptionsInQuery(query, options);

      const document = await query;

      if (!document) {
        return next(this.#getNoDocError(req.params.id));
      }
      res.status(200).json({ data: document });
    });

  #updateEmbeddedDoc = (options) =>
    asyncHandler(async (req, res, next) => {
      const { id } = req.params;
      const docId = this.#getDocIdForEmbedded(req);
      const updateQuery = this.#prepareUpdateQuery(this.#getBody(req));

      if (!Object.keys(updateQuery).length) {
        return next(new ApiError("No data provided to update", 400));
      }

      const query = this.Model.findByIdAndUpdate(docId, updateQuery, {
        arrayFilters: [{ "d._id": id }],
        new: true,
      });
      const document = await this.#setOptionsInQuery(query, options);

      if (!document) {
        return next(this.#getNoDocError(docId));
      }

      try {
        const embeddedDoc = this.#getEmbeddedDocById(document, id);
        res.json({ data: embeddedDoc });
      } catch (err) {
        next(err);
      }
    });

  #deleteDocument = (photoColumns) =>
    asyncHandler(async (req, res, next) => {
      const { id } = req.params;
      const document = await this.Model.findByIdAndDelete(id);

      if (!document) {
        return next(new ApiError(`No document for this id ${id}`, 404));
      }

      if (photoColumns.length) {
        const imageNames = [];

        photoColumns.forEach((column) => {
          const value = document[column];

          if (typeof value === "string") {
            imageNames.push(value);
          } else if (Array.isArray(value)) {
            imageNames.push(...value);
          } else if (value !== undefined) {
            throw new ApiError(
              `An error occurred while deleting photos for this id ${id}`,
              500
            );
          }
        });

        if (imageNames.length > 0) {
          await this.#deleteImages(this.Model, imageNames);
        }
      }

      res.status(204).send();
    });

  #deleteEmbeddedDoc = (photoColumns) =>
    asyncHandler(async (req, res, next) => {
      const { id } = req.params;
      const docId = this.#getDocIdForEmbedded(req);
      const $pull = {};
      $pull[this.embeddedPath] = { _id: id };

      const results = await this.Model.updateOne({ _id: docId }, { $pull });

      if (!results.matchedCount) {
        return next(this.#getNoDocError(docId));
      }
      if (!results.modifiedCount) {
        return next(this.#getNoDocError(id, true));
      }

      res.sendStatus(204);
    });

  deleteOne = (photoColumns = []) =>
    this.embeddedPath
      ? this.#deleteEmbeddedDoc(photoColumns)
      : this.#deleteDocument(photoColumns);

  softDeleteOne = () =>
    asyncHandler(async (req, res, next) => {
      const { id } = req.params;
      const document = await this.Model.findById(id).select("_id").lean();

      if (!document) {
        return next(new ApiError(`No document for this id ${id}`, 404));
      }

      await this.Model.deleteById(id, req.user._id);

      res.status(204).send();
    });

  updateOne = (options = {}) =>
    this.embeddedPath
      ? this.#updateEmbeddedDoc(options)
      : this.#updateDocument(options);

  createOne = (sanitize) =>
    this.embeddedPath
      ? this.#createEmbeddedDoc(sanitize)
      : this.#createDocument(sanitize);

  getOne = (options = {}) =>
    asyncHandler(async (req, res, next) => {
      const { id } = req.params;

      let query = this.Model.findById(id);
      query = this.#setOptionsInQuery(query, options);

      const document = await query;

      if (!document) {
        return next(new ApiError(`No document for this id ${id}`, 404));
      }
      res.status(200).json({ data: document });
    });

  getAll = (options = {}) =>
    asyncHandler(async (req, res) => {
      let filter = {};
      if (req.filterObject) {
        filter = req.filterObject;
      }

      const documentsCount = await this.Model.countDocuments();

      let query = this.Model.find(filter);
      query = this.#setOptionsInQuery(query, options);

      const apiFeatures = new ApiFeatures(query, req.query)
        .paginate(documentsCount)
        .filter()
        .search()
        .limitFields()
        .sort();

      const { mongooseQuery, paginationResult } = apiFeatures;
      const documents = await mongooseQuery;

      res
        .status(200)
        .json({ results: documents.length, paginationResult, data: documents });
    });
}

module.exports = HandlersFactory;
