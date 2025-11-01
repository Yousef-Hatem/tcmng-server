const { body, param } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const StudentCourseRecord = require("../../models/studentCourseRecordModel");
const User = require("../../models/userModel");
const Course = require("../../models/courseModel");

exports.studentCourseRecordIdValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid student course record id format"),
  validatorMiddleware,
];

const validateScores = (operationType = "create") => [
  body().custom(async (val, { req }) => {
    const { preFinalScore, finalExamScore } = req.body ?? {};

    const checkValue = operationType === "update" ? null : undefined;
    const msgError =
      operationType === "update"
        ? "PreFinalScore and FinalExamScore cannot be removed. At least one of them must have a value"
        : "You must submit your preFinalScore, finalExamScore, or both";

    if (preFinalScore === checkValue && finalExamScore === checkValue) {
      throw new Error(msgError);
    } else if (operationType === "update") {
      let unspecifiedScore;

      if (preFinalScore === null && finalExamScore === undefined) {
        unspecifiedScore = "finalExamScore";
      } else if (finalExamScore === null && preFinalScore === undefined) {
        unspecifiedScore = "preFinalScore";
      }

      if (unspecifiedScore) {
        const { id } = req.params;
        const record = await StudentCourseRecord.findById(id).lean();

        if (!record) {
          throw new Error(`No student course record for this id ${id}`);
        }
        req.studentCourseRecord = record;

        if (record[unspecifiedScore] === undefined) {
          throw new Error(
            `${unspecifiedScore} cannot be removed because it is the only score in record. At least one score must be present in record, either preFinalScore, finalExamScore, or both.`
          );
        }
      }
    }

    return true;
  }),
  body(["preFinalScore", "finalExamScore"])
    .optional(operationType === "update" ? { values: "null" } : {})
    .isFloat({ min: 0, max: 1000 })
    .withMessage("Must be a number between 0 and 1,000"),
];

const validateStuAndCouExistence = async (req) => {
  const { studentNationalId, course } = req.body;

  const [userExists, courseExists] = await Promise.all([
    User.exists({ nationalId: studentNationalId }),
    Course.exists({ _id: course }),
  ]);

  if (!userExists) {
    throw new Error(`No student for this national id: ${studentNationalId}`);
  }
  if (!courseExists) {
    throw new Error(`No course for this id: ${course}`);
  }

  return [userExists, courseExists];
};

const validateUniqueRecord = async (req) => {
  const { course, user, academicYear, term } = req.body;

  const studentCourseRecord = await StudentCourseRecord.exists({
    course,
    user: user,
    academicYear,
    term,
  });

  if (studentCourseRecord) {
    throw new Error(
      "Student's course record already exists for this course, user, academic year, and term"
    );
  }
};

exports.createStudentCourseRecordValidator = [
  ...validateScores(),
  body("attendanceCount")
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage("Must be a integer between 0 and 100"),
  body("course")
    .notEmpty()
    .withMessage("Course required")
    .isMongoId()
    .withMessage("Invalid course id format")
    .bail({ level: "request" }),
  body("studentNationalId")
    .notEmpty()
    .withMessage("Student national ID is required")
    .isInt()
    .withMessage("National id must be an integer")
    .isLength({ min: 14, max: 14 })
    .withMessage("The length of the national id must be 14")
    .bail({ level: "request" }),
  body("academicYear")
    .notEmpty()
    .withMessage("Academic year is required")
    .isInt({ min: 1900, max: 2100 })
    .withMessage("Must be a integer between 1900 and 2100")
    .bail({ level: "request" }),
  body("term")
    .notEmpty()
    .withMessage("Term required")
    .isFloat({ min: 1, max: 3 })
    .withMessage("Must be a number between 1 and 3")
    .bail({ level: "request" }),
  body().custom(async (val, { req }) => {
    console.log("Loading... for check");
    const [user] = await validateStuAndCouExistence(req);
    req.body.user = user._id;

    await validateUniqueRecord(req);

    return true;
  }),
  validatorMiddleware,
];

const validateUniqueRecordOnUpdate = async (val, { req }) => {
  const { course, studentNationalId, academicYear, term } = req.body ?? {};

  if (course || studentNationalId || academicYear || term) {
    console.log("Loading... for check");

    const queries = [];
    let recordIndex;
    let courseIndex;
    let userIndex;

    if (!req.studentCourseRecord) {
      recordIndex = queries.length;
      queries.push(
        StudentCourseRecord.findById(req.params.id)
          .select("course user academicYear term")
          .lean()
      );
    }

    if (course) {
      courseIndex = queries.length;
      queries.push(Course.exists({ _id: course }));
    }

    if (studentNationalId) {
      userIndex = queries.length;
      queries.push(User.exists({ nationalId: studentNationalId }));
    }

    console.log(queries.length);
    const docs = await Promise.all(queries);

    const record = req.studentCourseRecord ?? docs[recordIndex];

    if (!record) {
      throw new Error(`No student course record for this id ${req.params.id}`);
    }
    if (course && !docs[courseIndex]) {
      throw new Error(`No course for this id ${req.body.course}`);
    }
    if (studentNationalId && !docs[userIndex]) {
      throw new Error(
        `No student for this national id ${req.body.studentNationalId}`
      );
    } else if (studentNationalId) {
      req.body.user = docs[userIndex]._id;
    }

    const studentCourseRecord = await StudentCourseRecord.exists({
      course: course ?? record.course,
      user: docs[userIndex] ? docs[userIndex]._id : record.user,
      academicYear: academicYear ?? record.academicYear,
      term: term ?? record.term,
    });

    if (studentCourseRecord) {
      throw new Error(
        "Student's course record already exists for this course, user, academic year, and term"
      );
    }
  }

  return true;
};

exports.updateStudentCourseRecordValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid student course record id format"),
  ...validateScores("update"),
  body("attendanceCount")
    .optional({ values: "null" })
    .isInt({ min: 0, max: 100 })
    .withMessage("Must be a integer between 0 and 100"),
  body("course")
    .optional()
    .isMongoId()
    .withMessage("Invalid course id format")
    .bail({ level: "request" }),
  body("studentNationalId")
    .optional()
    .isInt()
    .withMessage("National id must be an integer")
    .isLength({ min: 14, max: 14 })
    .withMessage("The length of the national id must be 14")
    .bail({ level: "request" }),
  body("academicYear")
    .optional()
    .isInt({ min: 1900, max: 2100 })
    .withMessage("Must be a integer between 1900 and 2100")
    .bail({ level: "request" }),
  body("term")
    .optional()
    .isFloat({ min: 1, max: 3 })
    .withMessage("Must be a number between 1 and 3")
    .bail({ level: "request" }),
  body().custom(validateUniqueRecordOnUpdate),
  validatorMiddleware,
];
