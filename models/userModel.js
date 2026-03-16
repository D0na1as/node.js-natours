const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
// eslint-disable-next-line import/no-extraneous-dependencies
const bcrypt = require('bcryptjs');

//name, email, photo, password, password confirm

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name'],
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
    required: [true, 'Please tell us your email'],
    validate: [validator.isEmail],
  },
  photo: { type: String, default: 'default.jpg' },
  password: {
    type: String,
    required: [true, 'Please tell us your password'],
    minlength: 8,
    select: false,
  },
  role: {
    type: String,
    required: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm us your password'],
    validate: {
      //Only works on CREATE and SAVE
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not identicl',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre('save', async function () {
  //run if pass was modified
  if (!this.isModified('password')) return;

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
});

userSchema.pre('save', function () {
  if (!this.isModified('password') || this.isNew) return;

  this.passwordChangedAt = Date.now() - 1000;
});

userSchema.pre(/^find/, function () {
  this.find({ active: { $ne: false } });
});

userSchema.methods.isCorrectPassword = async function (
  //Not hashed
  candidatePassword,
  //Hashed
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changePasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    console.log(changedTimestamp, JWTTimestamp);

    return JWTTimestamp < changedTimestamp;
  }

  //False means NOT CHANGED
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
