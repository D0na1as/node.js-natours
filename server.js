const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncoughtException', (err) => {
  console.log(err.name);
  console.log('UNHANDLED Exception!');
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

mongoose.connect(DB).then((con) => {
  console.log(con.connections);
  console.log('DB connection success');
});

//   mongoose.connect(process.env.DATABASE_LOCAL).then((con) => {
//   console.log(con.connections);
//   console.log('DB connection success');
// });

const port = process.env.PORT || 8000;

const server = app.listen(port, () => {
  console.log(`--- APp running on port ${port}...`);
});

process.on('unhandlendRejection', (err) => {
  console.log(err.name, err.massage);
  console.log('UNHANDLED REJECTION!');
  server.close(() => {
    process.exit(1);
  });
});
