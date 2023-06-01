var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
// var logger = require('morgan');
var xmlparser = require('express-xml-bodyparser');
// var responseTime = require('response-time')

const cors = require('cors');

const bodyParser = require('body-parser');


const { logger } = require('./config/logger');


var app = express();

app.use(cors());

// app.use(responseTime())

var routes = require('./routes/api')(app);
var gatewayRoutes = require('./routes/gateway')(app);

app.set('trust proxy', true)

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
// const measureRequestDuration = (req, res, next) => {
//   const start = Date.now();
//   res.once('finish', () => {
//       const duration = Date.now() - start; 
//       res.header('X-Response-Time',duration)
//     //   console.log("Time taken to process " + req.originalUrl + " is: " + 
//     // duration);
//      });
//    next();
//   };
//   app.use(measureRequestDuration);
// app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Initiate body parser
app.use(xmlparser({normalizeTags: false}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))


app.use('/api',routes);
app.use('/',gatewayRoutes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  logger.info(
    err.message,
    {
      "path":req.originalUrl,
      "function": "app.js error handler"
    }
  );
  return res.status(404).json({
    "error": true,
    "status": 404,
    "message": err.message,
    "data": []
  });
});

module.exports = app;
