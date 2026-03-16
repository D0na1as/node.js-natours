const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const hpp = require('hpp');

const AppError = require('./utils/appError');
const globalErrorHndler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');

const app = express();

// 1. GlobalMiddlewares
//Set security http headers
app.use(helmet());

//Developers logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests, try another IP',
});

app.set('query parser', 'extended');
// Source - https://stackoverflow.com/a
// Posted by Titus Sutio Fanpula, modified by community. See post 'Timeline' for change history
// Retrieved 2026-01-21, License - CC BY-SA 4.0

app.use('/api', limiter);

//Body parsed, reading data from req.body
app.use(
  express.json({
    limit: '10kb',
  }),
);

//Data snitistion agains noSQL query injection

//Data snitistion agains XSS

//Serving static files
app.use(express.urlencoded({ extended: true }));

app.use(
  hpp({
    whitelist: ['price', 'duration', 'sort'],
  }),
);

//Test middleware
app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log('--- Hederis ----');
  console.log(req.headers);
  next();
});

//Route's
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/booking', bookingRouter);

app.use((req, res, next) => {
  // const err = new Error(`Can't find ${req.originalUrl}`);
  // err.status = 'fail';
  // err.statusCode = 404;

  next(new AppError(`Can't find ${req.originalUrl}`, 404));
});

//Error hndling middleware
app.use(globalErrorHndler);

module.exports = app;
