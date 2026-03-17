const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
const { truncateSync } = require('fs');

const signInToken = (id) =>
  jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = signInToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  //remove password from output
  user.password = undefined;

  res.status(200).json({
    status: 'success',
    token: token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1. If email and pss exists
  if (!email || !password) {
    return next(new AppError('Please provide email or password', 400));
  }

  // 2. If user exists
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.isCorrectPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  console.log(user);
  // 3. Send user if everything is ok
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  //1. Get Token and check if it exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('You are not logged in. Loggin to get acces', 401),
    );
  }
  //2. Verification token
  const decodedToken = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET,
  );

  //3. If user still exists
  const freshUser = await User.findById(decodedToken.id);
  if (!freshUser) {
    return next(new AppError('No user for provided token', 401));
  }
  //4. Check if user changed passwords after token was issues
  if (freshUser.changePasswordAfter(decodedToken.iat)) {
    return next(new AppError('Recent password change. Login again', 401));
  }

  //Grant acces to protected route
  req.user = freshUser;
  next();
});

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    // roles [admin, lead-guide]. role=user
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("Don't have permission to perform this action", 403),
      );
    }
    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1. Ger user on posted emil
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('No user found with this email', 404));
  }
  //2. Generte rndom token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //3.Send it to emil
  console.log(
    `${req.protocol}:${req.get('host')}/api/v1/users/resetPassword/${resetToken}`,
  );

  try {
    const resetUrl = `${req.protocol}:${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

    console.log(
      `${req.protocol}:${req.get('host')}/api/v1/users/resetPassword/${resetToken}`,
    );

    await new Email(user, resetUrl).sendPasswordReset();

    res.status(200).json({
      status: 'succes',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    console.log(err);
    return next(
      new AppError(
        'There was an error sending the email. Tray again later!',
        500,
      ),
    );
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  //1. User based on token

  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  //2. If token not expired. log user
  if (!user) {
    return next(new AppError('Token expired or invlid', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(user, 200, res);

  //3. Updte changePasswordAt for user

  //4. Login user, send jwy
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1. Get user
  const user = await User.findById(req.user.id).select('+password');

  //2. Check if posted password is correct
  if (
    !(await user.isCorrectPassword(req.body.passwordCurrent, user.password))
  ) {
    return next(new AppError('Current password is wrong', 401));
  }
  //3. If so update pssword
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  //4. Login user, send jwt
  createSendToken(user, 200, res);
});
