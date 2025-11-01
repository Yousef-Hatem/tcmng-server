const express = require("express");
const {
  getUserValidator,
  createUserValidator,
  updateUserValidator,
  deleteUserValidator,
  changeUserPasswordValidator,
  updateLoggedUserValidator,
  createStudentValidator,
  addResultsValidator,
  getStudentByNationalIdValidator,
} = require("../utils/validators/userValidator");

const {
  getUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  uploadUserImage,
  resizeUserImage,
  changeUserPassword,
  getLoggedUserData,
  updateLoggedUserPassword,
  updateLoggedUserData,
  createStudent,
  addResultsToStudent,
  getStudentByNationalId,
} = require("../services/userService");

const authService = require("../services/authService");

const router = express.Router();

router.get(
  "/students/:nationalId",
  getStudentByNationalIdValidator,
  getStudentByNationalId
);

router.use(authService.protect);

router.get("/getMe", getLoggedUserData, getUser);
router.put("/changeMyPassword", updateLoggedUserPassword);
router.put("/updateMe", updateLoggedUserValidator, updateLoggedUserData);

router.use(
  authService.allowedTo(
    "superadmin",
    "admin",
    "manager",
    "university-system-admin",
    "faculty-system-admin"
  )
);

router.post(
  "/students",
  uploadUserImage,
  createStudentValidator,
  resizeUserImage,
  createStudent
);

router.post("/students/:id/results", addResultsValidator, addResultsToStudent);

router.use(authService.allowedTo("superadmin", "admin"));
router.put(
  "/changePassword/:id",
  changeUserPasswordValidator,
  changeUserPassword
);
router
  .route("/")
  .get(getUsers)
  .post(uploadUserImage, createUserValidator, resizeUserImage, createUser);
router
  .route("/:id")
  .get(getUserValidator, getUser)
  .put(uploadUserImage, updateUserValidator, resizeUserImage, updateUser)
  .delete(deleteUserValidator, deleteUser);

module.exports = router;
