require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Connect MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Database'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Middleware
app.use(cors({ 
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'https://zyns-bot-hub.netlify.app'], 
  credentials: true 
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'super_secret_key',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Discord Strategy (Using Zyn's Empire Bot / Bot 1 credentials)
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: process.env.BOT1_CLIENT_ID,
    clientSecret: process.env.BOT1_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
}));

// Auth Routes with explicit callback configuration matching
app.get('/api/auth/discord', passport.authenticate('discord', {
    callbackURL: process.env.DISCORD_CALLBACK_URL
}));

app.get('/api/auth/discord/callback', 
  passport.authenticate('discord', { 
    failureRedirect: '/',
    callbackURL: process.env.DISCORD_CALLBACK_URL
  }),
  (req, res) => {
    res.redirect('https://zyns-bot-hub.netlify.app?login=success');
  }
);

app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.json({ authenticated: false });
  }
});

app.get('/api/guilds', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  const adminGuilds = req.user.guilds.filter(g => (g.permissions & 0x8) === 0x8);
  res.json(adminGuilds);
});

app.post('/api/settings/save', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  // TODO: Save settings to MongoDB per guildId
  res.json({ success: true, message: 'Settings saved to database!' });
});

app.get('/api/logout', (req, res) => {
  req.logout(() => {
    res.json({ success: true });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Dashboard API running on port ${PORT}`));