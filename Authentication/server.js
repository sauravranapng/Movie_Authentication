if(process.env.NODE_ENV!=='production'){
    require('dotenv').config()
}
const express=require('express')
//const cors = require('cors');
const app =express()

const bcrypt=require('bcrypt')
const passport=require('passport')
const flash=require('express-flash')
const session=require('express-session')
//const methodOverride=require('method-override')
//to include MongoDB
const mongo_username=process.env['mongo_user']
const mongo_password=process.env['mongo_pass']
const { MongoClient } = require('mongodb');

let uri = `mongodb+srv://${mongo_username}:${mongo_password}@cluster0.opxy2er.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('Error connecting to MongoDB Atlas:', error);
  }
}
connectToDatabase();
async function getUserByEmail(email) {
  const db = client.db('reviews');
  const collection = db.collection('Authentication_data');

  return await collection.findOne({ email });
}
async function getUserById(id) {
  const db = client.db('reviews');
  const collection = db.collection('Authentication_data');

  // Assuming your MongoDB stores users with an _id field as the unique identifier
  return await collection.findOne({ _id: id });
}

async function saveUser(user) {
  const db = client.db('reviews');
  const collection = db.collection('Authentication_data');
  await collection.insertOne(user);
}

const initializePassport=require('./passport-config')
initializePassport(
    passport,
    getUserByEmail,
    getUserById,
    
    )


app.set('view engine','ejs')
app.use(express.urlencoded({extended: false}))
app.use(flash())
//app.use (cors())
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:false
}))
app.use(passport.initialize())
app.use(passport.session())
//app.use(methodOverride('_method'))
app.get('/',checkAuthenticated,(req,res) => {
  const redirectURL = req.query.redirect;
    res.render('index.ejs',{redirectURL})
})
app.get('/login',checkNotAuthenticated,(req,res) => {
  const redirectURL = req.query.redirect; // Extract the 'redirect' parameter from the query string
  // Render your login page or handle the login process as needed
  console.log("in app.get(login)"+redirectURL)
 
    res.render('login.ejs',{redirectURL})
})


/*app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  
  successRedirect: '/success',
  failureRedirect: '/login',
  failureFlash: true
}));*/
app.post('/login',  (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
      // Store the 'redirect' URL in the session or a cookie
      const redirectURL = req.body.redirect;
    if (err) {
      return next(err);
    }
    if (!user) {
      // Handle authentication failure
      return res.redirect(`/login?redirect=${redirectURL}`);
    }
    req.logIn(user, (err) => {

      if (err) {
        return next(err);
      }
 
    req.session.redirectURL = redirectURL;
      // Redirect to the "/success" route
      return res.redirect('/success');
    });
  })(req, res, next);
});


/*app.get('/success', (req, res) => {
  // Get the user's email and name from the authenticated user in req.user
  const name = req.user.name;
  const email = req.user.email;

  // Construct the query string with user information
  const queryString = `email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`;

  // Get the 'redirect' parameter from the request query
  const redirectURL = req.query.redirect;
console.log(redirectURL)
  // If a 'redirect' parameter is provided, include it in the queryString
  if (redirectURL) {
    // Redirect the user to the provided 'redirectURL' along with the queryString
    res.redirect(redirectURL + `?${queryString}`);
  } else {
    // If 'redirect' parameter is not provided, redirect to the default frontend URL
    res.redirect(`http://127.0.0.1:5501/movieapp/index.html?${queryString}`);
  }
});*/
app.get('/success', (req, res) => {
  // Get the user's email and name from the authenticated user in req.user
  const name = req.user.name;
  const email = req.user.email;
  
  // Construct the query string with user information
  const queryString = `email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`;
  
  // Get the 'redirect' URL from the session or a cookie
  const redirectURL = req.session.redirectURL || 'http://127.0.0.1:5501/movieapp/index.html';
console.log(redirectURL)
  // Clear the 'redirect' URL from the session or a cookie
 // delete req.session.redirectURL;

  // Redirect the user to the 'redirect' URL along with the queryString
  res.redirect(`${redirectURL}&${queryString}`);
});



app.get('/register',checkNotAuthenticated,(req,res) => {
    res.render('register.ejs')
})
app.post('/register', checkNotAuthenticated, async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const newUser = {
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
    };

    // Save the new user to MongoDB
    await saveUser(newUser);
console.log(newUser);
    res.redirect('/login');
  } catch (error) {
    console.error('Error registering user:', error);
    res.redirect('/register');
  }
});
app.get('/logout', (req, res) => {
 
    req.logOut((err) => {
      if (err) {
        // Handle any error that occurred during logout
        console.error('Error occurred during logout:', err);
      }
      
      const redirectURL = req.query.redirect ;//||  'http://127.0.0.1:5501/movieapp/index.html';
      res.redirect(`/login?redirect=${redirectURL}`);
    });
  });
  
function checkAuthenticated(req,res,next){
    if(req.isAuthenticated()){
        return next()
    }

    res.redirect('/login')
}
function checkNotAuthenticated(req,res,next){
    if(req.isAuthenticated()){
      const redirectURL=req.query.redirect;
        return res.redirect(`/?redirect=${redirectURL}`)
    }
     next()
}

const port = 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
// Close the MongoDB connection when the server is stopped
process.on('SIGINT', async () => {
  try {
    await client.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
});
