const mongoose = require('mongoose');
const slugify = require('slugify');
// eslint-disable-next-line import/no-extraneous-dependencies
const validator = require('validator');

const tourScheme = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'tour name must have less of equal 40 chras'],
      minlength: [10, 'tour name must have more of equal 10 chras'],
      //  validate: [validator.isAlpha, 'Nam must contain only charss'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'Tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'Should have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'difficulty us either easy, medium or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          //ONLY opoints to current doc on NEW document creation
          return val < this.price;
        },
        message: 'Discount below regular price ({VALUE})',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'Should have a difficulty'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      defult: false,
    },
    startLocation: {
      //GeoJson
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinate: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinate: [Number],
        address: String,
        description: String,
      },
    ],
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

//tourScheme.index({ price: 1 });
tourScheme.index({ price: 1, ratingsAverage: -1 });
tourScheme.index({ slug: 1 });
tourScheme.index({ startLocation: '2dsphere' });

tourScheme.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

//Virtual populate
tourScheme.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

//DOCUMENT MIDDLEWARE: runs before.save and .create but not before .insertMany()
tourScheme.pre('save', function () {
  this.slug = slugify(this.name, { lower: true });
});

// tourScheme.pre('save', async function () {
//   console.log('--- iesko gidu - 1 --');
//   const guidesPromises = this.guides.map((id) => User.findById(id));
//   console.log('--- iesko gidu - 2 --');
//   this.guides = await Promise.all(guidesPromises);
//   console.log('--- iesko gidu ---');
//   console.log(this.guides);
// });

// tourScheme.pre('save', function () {
//   console.log('---- Will save documnet ---');
// });

// tourScheme.post('save', function (doc) {
//   console.log(doc);
// });

//Query middleware
tourScheme.pre(/^find/, function () {
  //tourScheme.pre('find', function () {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
});

tourScheme.post(/^find/, function (doc) {
  console.log(`Query tooKl ${Date.now() - this.start} ms`);
});

tourScheme.pre(/^find/, function (doc) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
});

//Aggregtion middleware
// tourScheme.pre('aggregate', function () {
//   this.pipeline().unshift({ $match: { secretToure: { $ne: true } } });
//   console.log(this.pipeline());
// });

const Tour = mongoose.model('Tour', tourScheme);

module.exports = Tour;
