const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const UserModel = require('../models/User');
const config = require('../config/config');

// Local Strategy for email/password authentication
passport.use(
    new LocalStrategy(
        {
            usernameField: 'email',
            passwordField: 'password',
        },
        async (email, password, done) => {
            try {
                const user = await UserModel.findByEmail(email);

                if (!user) {
                    return done(null, false, { message: 'Invalid credentials' });
                }

                const isValidPassword = await bcrypt.compare(password, user.password_hash);

                if (!isValidPassword) {
                    return done(null, false, { message: 'Invalid credentials' });
                }

                return done(null, user);
            } catch (error) {
                return done(error);
            }
        }
    )
);

// Google OAuth Strategy
// Note: Google users are identified by email (google_id column removed from schema)
if (config.google.clientID && config.google.clientSecret) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: config.google.clientID,
                clientSecret: config.google.clientSecret,
                callbackURL: config.google.callbackURL,
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    // Check if user exists with this email
                    let user = await UserModel.findByEmail(profile.emails[0].value);

                    if (!user) {
                        // Create new user
                        user = await UserModel.create({
                            name: profile.displayName,
                            email: profile.emails[0].value,
                            password_hash: null, // Google users don't have password
                            role: 'user',
                        });
                    }

                    await UserModel.updateLastLogin(user.user_id);
                    return done(null, user);
                } catch (error) {
                    return done(error);
                }
            }
        )
    );
}

// Serialize user
passport.serializeUser((user, done) => {
    done(null, user.user_id);
});

// Deserialize user
passport.deserializeUser(async (user_id, done) => {
    try {
        const user = await UserModel.findById(user_id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});

module.exports = passport;
