const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handelDuplicatedFieldsDB = (err) => {
  const value = err.errmsg.match(/(?<=\")(.*?)(?=\")/)[0];
  const message = `Duplicated field value: ${value}. Please use another value`;

  return new AppError(message, 400);
};

const handelValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;

  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invlid token. Please login again', 401);

const handleJWTExiredErro = () =>
  new AppError('Token expired. Please login again', 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err.err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  //Operational error that we trust
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });

    //Error that we don't trust
  } else {
    //1. log error
    console.log('ERROR XXX', err);
    //2. Send a message
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong',
    });
  }
};

module.exports = (err, req, res, next) => {
  console.log('ERROR CCC1', err.name);
  console.log('ERROR CCC', err);
  console.log(err.statusCode);
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  console.log('ERROR CCC2', err.code);
  if (process.env.NODE_ENV === 'development') {
    console.log('ERROR CCC 11111');
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    console.log('ERROR CCC 2222');
    let error = Object.assign(err);
    console.log(error.code === 11000);
    console.log(error.code);
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handelDuplicatedFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handelValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExiredErro();

    sendErrorProd(error, res);
  }
};
