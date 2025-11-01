const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

const Factory = require("./handlersFactory");
const ApiError = require("../utils/apiError");
const {
  uploadSingleImage,
  resizeImage,
} = require("../middlewares/uploadImageMiddleware");
const createToken = require("../utils/createToken");
const User = require("../models/userModel");
const { sanitizeStudent } = require("../utils/sanitize/sanitizeUser");
const RedisCache = require("../utils/redis-cache");

const factory = new Factory(User);
const redisCache = new RedisCache("user");

exports.uploadUserImage = uploadSingleImage("profileImg");

exports.resizeUserImage = resizeImage({
  model: User,
  fieldName: "profileImg",
  resize: [400, 400],
});

exports.getUsers = factory.getAll();

exports.getUser = factory.getOne();

exports.createUser = factory.createOne();

exports.updateUser = asyncHandler(async (req, res, next) => {
  const document = await User.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      profileImg: req.body.profileImg,
      role: req.body.role,
    },
    {
      new: true,
    }
  );

  if (!document) {
    return next(new ApiError(`No document for this id ${req.params.id}`, 404));
  }
  res.status(200).json({ data: document });
});

exports.changeUserPassword = asyncHandler(async (req, res, next) => {
  const document = await User.findByIdAndUpdate(
    req.params.id,
    {
      password: await bcrypt.hash(req.body.password, 12),
      passwordChangedAt: Date.now(),
    },
    {
      new: true,
    }
  );

  if (!document) {
    return next(new ApiError(`No document for this id ${req.params.id}`, 404));
  }
  res.status(200).json({ data: document });
});

exports.deleteUser = factory.softDeleteOne();

exports.getLoggedUserData = asyncHandler(async (req, res, next) => {
  req.params.id = req.user._id;
  next();
});

exports.updateLoggedUserPassword = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      password: await bcrypt.hash(req.body.password, 12),
      passwordChangedAt: Date.now(),
    },
    {
      new: true,
    }
  );

  const token = createToken(user._id);

  res.status(200).json({ data: user, token });
});

exports.updateLoggedUserData = asyncHandler(async (req, res) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
    },
    { new: true }
  );

  res.status(200).json({ data: updatedUser });
});

exports.createStudent = asyncHandler(async (req, res) => {
  const { body } = req;

  if (!body.dateBirth && body.nationalId) {
    body.dateBirth = getDateBirthFromNationalId(body.nationalId);
  } else if (body.dateBirth) {
    body.dateBirth = new Date(body.dateBirth);
  }

  if (!body.password) {
    body.password = `${body.dateBirth.getFullYear()}${
      body.dateBirth.getMonth() + 1
    }${body.dateBirth.getDate()}`;
  }

  const student = await User.create({
    fullName: body.fullName,
    nickname: body.nickname,
    nationalId: body.nationalId,
    email: body.email,
    phone: body.phone,
    profileImg: body.profileImg,
    password: body.password,
    gender: body.gender,
    dateBirth: body.dateBirth,
    faculty: body.faculty,
    year: body.year,
    department: body.department,
    major: body.major,
  });

  res.status(201).json({ data: sanitizeStudent(student) });
});

exports.addResultsToStudent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { semester, score } = req.body;

  const student = await User.findOne({ _id: id, role: "student" }).populate({
    path: "faculty",
    select: "years",
  });

  if (!student) {
    return next(new ApiError(`No document for this id ${id}`, 404));
  }

  const year = req.body.year || student.year;
  req.body.subject.year = req.body.subject.year || student.year;

  if (student.year < year) {
    return next(
      new ApiError(
        `The result of year ${year} and student in year ${student.year} cannot be recorded`,
        400
      )
    );
  }

  const subject = getSubject(student, req.body.subject);

  if (score > subject.maxScore) {
    return next(
      new ApiError(`Max score in subject is ${subject.maxScore}`, 400)
    );
  }

  const result = {
    subject: req.body.subject,
    maxScore: subject.maxScore,
    passingMarksPercentage: subject.passingMarksPercentage,
    score,
  };

  result.subject.semester = result.subject.semester === "firstSemester" ? 1 : 2;

  let yearExists = false;
  student.years = student.years.map((y) => {
    if (y.number === year) {
      yearExists = true;
      y[semester].results.push(result);
    }
    return y;
  });

  if (!yearExists) {
    const y = { number: year, [semester]: { results: [result] } };
    student.years.push(y);
  }

  student.faculty = student.faculty._id;

  await student.save();

  res.status(200).json({ data: sanitizeStudent(student) });
});

exports.getStudentByNationalId = asyncHandler(async (req, res, next) => {
  const { nationalId } = req.params;
  let student = await redisCache.get(nationalId);

  if (student) {
    return res.status(200).json({ data: student });
  }

  student = await User.findOne({ nationalId })
    .select("fullName nationalId gender year department major years")
    .lean()
    .populate({ path: "faculty", select: "name image years" });

  if (!student) {
    return next(
      new ApiError(`No student for this national ID ${nationalId}`, 404)
    );
  }

  const semesters = ["firstSemester", "secondSemester"];
  student.years = student.years.map((year) => {
    semesters.forEach((semester) => {
      year[semester].results = year[semester].results.map((result) => {
        result.subject.semester = semesters[result.subject.semester - 1];
        const subject = getSubject(student, result.subject);
        result.subject = {
          name: subject.name,
          image: subject.image,
          numberOfHours: subject.numberOfHours,
          hourPrice: subject.hourPrice,
          cost: subject.cost,
        };
        return result;
      });
    });
    return year;
  });

  delete student.faculty.years;

  await redisCache.set(nationalId, student);

  res.status(200).json({ data: student });
});
