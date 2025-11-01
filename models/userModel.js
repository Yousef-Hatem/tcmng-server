const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const MongooseDelete = require("mongoose-delete");
const RedisCache = require("../utils/redis-cache");

const redisCache = new RedisCache("user");

const userSchema = new mongoose.Schema(
  {
    organizationName: {
      type: String,
      trim: true,
      required: [true, "Organization name is required"],
      minlength: [2, "Min full name length is 2"],
      maxlength: [100, "Max full name length is 100"],
    },
    contactPersonName: {
      type: String,
      trim: true,
      required: [true, "Contact person name is required"],
      minlength: [10, "Min full name length is 10"],
      maxlength: [100, "Max full name length is 100"],
    },
    email: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      lowercase: true,
      maxlength: [255, "Max email is 255"],
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailOTP: String,
    country: {
      type: String,
      enum: [
        "EG",
        "SA",
        "AE",
        "KW",
        "QA",
        "OM",
        "BH",
        "DZ",
        "MA",
        "TN",
        "LY",
        "SD",
        "IQ",
        "JO",
        "LB",
        "SY",
        "YE",
        "PS",
        "SO",
        "MR",
        "DJ",
        "KM",
      ],
      required: true,
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      maxlength: [20, "Max email is 20"],
    },
    profileImg: String,
    password: String,
    passwordChangedAt: Date,
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    status: {
      type: String,
      enum: ["pending", "active", "inactive", "blocked"],
      default: "pending",
    },
    subscriptionStartAt: Date,
    subscriptionEndAt: Date,
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.post("save", async (user, next) => {
  await redisCache.delete(user._id);
  next();
});

userSchema.plugin(MongooseDelete, {
  deletedBy: true,
  deletedByType: String,
  deletedAt: true,
  overrideMethods: true,
});

const User = mongoose.model("User", userSchema);

module.exports = User;
