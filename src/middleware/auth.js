function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  return next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.redirect('/login');
    }

    if (!allowedRoles.includes(req.session.user.role)) {
      return res.status(403).render('error', {
        title: 'Accès refusé',
        message: 'Vous n’avez pas les droits pour cette action.',
        user: req.session.user
      });
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole
};
