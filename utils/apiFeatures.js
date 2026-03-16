class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    console.log('---- 1 ----');
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // 1b) Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    // gte, gt, lte, lt
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    //EXECUTE QUERY
    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    console.log('---- 3 ----');
    console.log('SORT VALUE:', this.queryString.sort);
    console.log('TYPE:', typeof this.queryString.sort);
    console.log('IS ARRAY:', Array.isArray(this.queryString.sort));

    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
      // sort('price ratingsAverage') sortinimas su ratingsAverage
    } else {
      this.query = this.query.sort('-createdAt');
    }

    console.log('----4 ----');
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  }

  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

module.exports = APIFeatures;
