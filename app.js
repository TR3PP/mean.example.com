var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var apiAuthRouter = require('./routes/api/auth');
var apiUsersRouter = require('./routes/api/users');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var Users = require('./models/users');
var authRouter = require('./routes/auth');

var app = express();

var config = require('./config.dev');
//console.log(config);

//Connect to MongoDB
mongoose.connect(config.mongodb, { useNewUrlParser: true });
//console.log(mongoose);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


//~line 32 before routes
app.use(require('express-session')({
  //Define the session store
  store: new MongoStore({
    mongooseConnection: mongoose.connection
  }),
  //Set the secret
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    path: '/',
    domain: config.cookie.domain,
    //httpOnly: true,
    //secure: true,
    maxAge:3600000 //1 hour
  }
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(Users.createStrategy());

//~line 53
passport.serializeUser(function(user, done){
  done(null,{
    id: user._id,
    username: user.username,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name
  });
});

passport.deserializeUser(function(user, done){
  done(null, user);
});
//~line 73
app.use(function(req,res,next){
  res.locals.session = req.session;
  res.locals.showLogin = true;
  if (req.session.passport){
    if (req.session.passport.user){
      res.locals.showLogin = false;
    }
  }
  next();
});

//session based access control
app.use(function(req,res,next){
  //return next();  // linear top down flow, executes the next app.use | uncommented this line allows everything

  //allow any endpoint tnat is an exact match.  The server does not have access to the hash
  //so /auth and /auth#xx would both be considered exact matches
  var whiteList = [
    '/',
    '/auth'
  ];


//console.log(req.url);

  if (whiteList.indexOf(req.url)!==-1){
    return next();
  }

  var subs = [
    '/public/',
    '/api/auth/'
  ];

  for (var sub of subs){
    if (req.url.substring(0,sub.length)===sub){
      return next();
    }
  }

  if (req.isAuthenticated()){
    return next();
  }

  return res.redirect('/auth#login');

});


app.use('/', indexRouter);
app.use('/api/auth', apiAuthRouter);
app.use('/api/users', apiUsersRouter);
app.use('/auth', authRouter)
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
