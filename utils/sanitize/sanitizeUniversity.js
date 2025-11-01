exports.sanitizeUniversity = (university) => ({
  _id: university._id,
  name: university.name,
  image: university.image,
  createdAt: university.createdAt,
});
