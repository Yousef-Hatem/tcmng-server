exports.sanitizeFaculty = (faculty) => ({
  _id: faculty._id,
  name: faculty.name,
  image: faculty.image,
  university: faculty.university,
  courses: faculty.courses,
  departments: faculty.departments,
  createdAt: faculty.createdAt,
});
