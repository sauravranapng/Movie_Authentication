const { ObjectId } = require('mongodb');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

function initialize(passport, getUserByEmail, getUserById) {
  const authenticateUser = async (email, password, done) => {
    const user = await getUserByEmail(email);
    console.log('In passport-config.js User:', user);

    if (!user) {
      return done(null, false, { message: 'NO user with that email' });
    }

    try {
      if (await bcrypt.compare(password, user.password)) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Password Incorrect' });
      }
    } catch (e) {
      return done(e);
    }
  };

  passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser));

  passport.serializeUser((user, done) => {
    done(null, user._id.toString()); // Convert the ObjectId to a string
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const objectId = new ObjectId(id); // Instantiate ObjectId with the 'new' keyword
      const user = await getUserById(objectId);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
}

module.exports = initialize;
