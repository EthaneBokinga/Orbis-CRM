const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateAccessToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (user) => {
  // '7d' = 7 jours (jsonwebtoken utilise 'd' et non 'j')
  return jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

// Auth Locale - Inscription
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Tous les champs requis.' });

    // Nettoyage (trim) avant insertion
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) return res.status(400).json({ error: 'Cet email est déjà utilisé.' });

    const newUser = new User({ name: cleanName, email: cleanEmail, passwordHash: password, authProvider: 'local' });
    await newUser.save();

    res.status(201).json({ message: 'Compte commercial créé avec succès.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
};

// Auth Locale - Connexion
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email?.trim().toLowerCase();

    const user = await User.findOne({ email: cleanEmail, isActive: true }).select('+passwordHash');

    if (!user || user.authProvider !== 'local' || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Identifiants incorrects ou invalides.' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const salt = await bcrypt.genSalt(10);
    user.refreshTokenHash = await bcrypt.hash(refreshToken, salt);
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur d'authentification." });
  }
};

// Authentification Google OAuth 2.0
exports.googleLogin = async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Token Google manquant.' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const { name, email, sub: googleId, picture: avatarUrl } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (!user) {
      // Inscription automatique au premier login Google
      user = new User({
        name,
        email,
        authProvider: 'google',
        googleId,
        avatarUrl,
        role: 'commercial'
      });
    } else if (user.authProvider !== 'google') {
      return res.status(400).json({ error: 'Ce compte existe déjà avec une méthode de connexion classique.' });
    }

    if (!user.isActive) return res.status(403).json({ error: 'Compte révoqué par la direction.' });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const salt = await bcrypt.genSalt(10);
    user.refreshTokenHash = await bcrypt.hash(refreshToken, salt);
    await user.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl }
    });
  } catch (err) {
    res.status(400).json({ error: 'Validation Google OAuth échouée.' });
  }
};

// Rafraîchissement du token
exports.refresh = async (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.refreshToken) return res.status(401).json({ error: 'Session absente.' });

  const refreshToken = cookies.refreshToken;
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshTokenHash');

    if (!user || !user.refreshTokenHash) return res.status(403).json({ error: 'Accès interdit.' });

    const isMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isMatch) return res.status(403).json({ error: 'Sécurité compromise : Session rejetée.' });

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    const salt = await bcrypt.genSalt(10);
    user.refreshTokenHash = await bcrypt.hash(newRefreshToken, salt);
    await user.save();

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(403).json({ error: 'Session expirée.' });
  }
};

// Déconnexion
exports.logout = async (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.refreshToken) return res.sendStatus(204);

  const refreshToken = cookies.refreshToken;
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (user) {
      user.refreshTokenHash = null;
      await user.save();
    }
  } catch (err) {}

  res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'Strict', secure: process.env.NODE_ENV === 'production' });
  res.json({ message: 'Session purgée.' });
};
