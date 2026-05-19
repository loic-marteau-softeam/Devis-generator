const path = require('path');
const express = require('express');
const session = require('express-session');

require('./db');

const authRoutes = require('./routes/auth');
const indexRoutes = require('./routes/index');
const clientRoutes = require('./routes/clients');
const quoteRoutes = require('./routes/quotes');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-this-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax' }
  })
);

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

app.use(authRoutes);
app.use(indexRoutes);
app.use(clientRoutes);
app.use(quoteRoutes);

app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page introuvable',
    message: 'La page demandée n’existe pas.',
    user: req.session.user || null
  });
});

module.exports = app;
