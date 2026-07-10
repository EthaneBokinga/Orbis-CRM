const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const AuditLog = require('../models/AuditLog');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper audit
const logAudit = (actorId, actorName, action, severity = 'info') => {
  AuditLog.create({ actorId, actorName, actionDescription: action, severity }).catch(() => {});
};

const generateAccessToken = (user) => {
  // Augmenté de 15m à 2h pour résoudre les timeouts d'activité
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '2h' });
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

    if (!user || !user.passwordHash || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Identifiants incorrects ou invalides.' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const salt = await bcrypt.genSalt(10);
    user.refreshTokenHash = await bcrypt.hash(refreshToken, salt);
    await user.save();

    // Set refresh token cookie (httpOnly) and short-lived access token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: 2 * 60 * 60 * 1000
    });

    logAudit(user._id, user.name, `Connexion réussie en tant que ${user.role}.`, 'info');

    res.json({
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
    } else {
      // Si le compte existe de manière classique, on l'associe avec Google
      if (!user.googleId) {
        user.googleId = googleId;
      }
      if (!user.avatarUrl && avatarUrl) {
        user.avatarUrl = avatarUrl;
      }
      // On sauvegarde l'association
      await user.save();
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
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: 2 * 60 * 60 * 1000
    });

    logAudit(user._id, user.name, `Connexion Google réussie en tant que ${user.role}.`, 'info');

    res.json({
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
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: 2 * 60 * 60 * 1000
    });

    res.json({ message: 'Token rafraîchi.' });
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
      logAudit(user._id, user.name, 'Déconnexion de la session.', 'info');
      user.refreshTokenHash = null;
      await user.save();
    }
  } catch (err) {}

  res.clearCookie('refreshToken', { httpOnly: true, sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ message: 'Session purgée.' });
};

// Mise à jour du profil (Nom et Photo / Avatar)
exports.updateProfile = async (req, res) => {
  try {
    const { name, avatarUrl } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé." });

    if (name) user.name = name.trim();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

    await user.save();

    res.json({
      message: "Profil mis à jour avec succès.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la mise à jour du profil." });
  }
};

// Retourne le profil utilisateur courant (vérifie le token via middleware requireAuth)
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé.' });

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
};

// === 5. RÉINITIALISATION DE MOT DE PASSE (MOT DE PASSE OUBLIÉ) — OPTIMISÉ ===
// L'envoi SMTP est NON-BLOQUANT : on répond immédiatement après avoir sauvegardé le code
// L'email part en arrière-plan. Si SMTP échoue, le code est renvoyé via _devCode
// pour permettre la réinitialisation même sans email.
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "L'adresse email est requise." });

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      // Pour éviter le dénombrement d'utilisateurs, on renvoie un succès générique
      return res.json({ message: "Si cet email existe, un code de réinitialisation y a été envoyé." });
    }

    // Génère un code secret à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = code;
    user.resetCodeExpires = Date.now() + 5 * 60 * 1000; // Valide 5 minutes
    await user.save();

    // Préparer la réponse immédiate
    const responseData = {
      message: "Si cet email existe, un code de réinitialisation y a été envoyé."
    };
    // Uniquement en mode développement : renvoyer le code pour contourner SMTP
    if (process.env.NODE_ENV !== 'production') {
      responseData._devCode = code;
    }

    // Envoyer l'email en ARRIÈRE-PLAN (non bloquant)
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || smtpUser || 'bokingaethanenathan@gmail.com';

    // Vérification rapide : si SMTP est configuré, tenter l'envoi en arrière-plan
    if (smtpHost && smtpUser && smtpPass) {
      // Envoyer l'email sans await (fire & forget avec timeout court)
      const sendEmailPromise = (async () => {
        try {
          const nodemailer = require('nodemailer');
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass },
            connectionTimeout: 6000,  // 6s max
            greetingTimeout: 5000,     // 5s max
            socketTimeout: 5000        // 5s max
          });

          await transporter.sendMail({
            from: `"Orbis CRM Sécurité" <${smtpFrom}>`,
            to: cleanEmail,
            subject: "🔒 Code de réinitialisation de votre mot de passe Orbis CRM",
            html: `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px; border-radius: 16px; max-width: 500px; margin: auto;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #0d9488; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: 2px;">ORBIS CRM</h1>
                  <p style="font-size: 10px; color: #64748b; text-transform: uppercase; margin-top: 5px; letter-spacing: 1px;">Secured Authorization Portal</p>
                </div>
                <div style="background-color: #1e293b; padding: 30px; border-radius: 12px; border: 1px solid #334155; text-align: center;">
                  <p style="font-size: 14px; color: #cbd5e1; margin-top: 0;">Bonjour <strong>${user.name}</strong>,</p>
                  <p style="font-size: 13px; color: #94a3b8; line-height: 1.6;">Vous avez demandé la réinitialisation de votre mot de passe Orbis CRM.</p>
                  <div style="background-color: #0f172a; color: #0d9488; font-size: 32px; font-weight: 800; padding: 15px 25px; border-radius: 10px; display: inline-block; letter-spacing: 6px; margin: 20px 0; border: 1px dashed #0d9488;">
                    ${code}
                  </div>
                  <p style="font-size: 11px; color: #64748b; margin-bottom: 0;">Code valable 5 minutes.</p>
                </div>
                <p style="font-size: 11px; color: #475569; text-align: center; margin-top: 30px;">
                  Si vous n'avez pas demandé ce changement, ignorez cet e-mail.<br/>&copy; 2026 Orbis CRM
                </p>
              </div>
            `
          });
          console.log('[SMTP] Code envoyé à', cleanEmail);
        } catch (mailErr) {
          // L'email n'a pas pu être envoyé, mais la réponse a déjà été renvoyée
          console.warn('[SMTP] Échec envoi email (non bloquant) :', mailErr.message);
        }
      })();

      // Lancer l'envoi sans bloquer (ne pas await)
      sendEmailPromise.catch(err => console.warn('[SMTP] Erreur async:', err.message));
    } else {
      console.warn('[SMTP] Non configuré — le code est accessible via _devCode.');
    }

    // Répondre immédiatement (sans attendre l'email)
    return res.json(responseData);
  } catch (err) {
    console.error("Erreur forgotPassword :", err);
    res.status(500).json({ error: "Erreur interne lors du traitement." });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: "Tous les champs sont requis." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ 
      email: cleanEmail,
      resetCode: code,
      resetCodeExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: "Code invalide ou expiré." });
    }

    // Réinitialise le mot de passe
    user.passwordHash = newPassword;
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    // Log d'audit
    const AuditLog = require('../models/AuditLog');
    await AuditLog.create({
      actorId: user._id,
      actorName: user.name,
      actionDescription: "Mot de passe réinitialisé avec succès par formulaire de récupération.",
      severity: 'warning'
    }).catch(() => {});

    res.json({ message: "Votre mot de passe a été modifié avec succès." });
  } catch (err) {
    console.error("Erreur resetPassword :", err);
    res.status(500).json({ error: "Erreur lors de la modification du mot de passe." });
  }
};

