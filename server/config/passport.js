const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./database');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists
    const userQuery = 'SELECT * FROM profiles WHERE google_id = $1';
    const userResult = await pool.query(userQuery, [profile.id]);
    
    if (userResult.rows.length > 0) {
      return done(null, userResult.rows[0]);
    }
    
    // Create new user
    const insertQuery = `
      INSERT INTO profiles (google_id, email, name, avatar_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const newUserResult = await pool.query(insertQuery, [
      profile.id,
      profile.emails[0].value,
      profile.displayName,
      profile.photos[0]?.value
    ]);
    
    return done(null, newUserResult.rows[0]);
  } catch (error) {
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM profiles WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;