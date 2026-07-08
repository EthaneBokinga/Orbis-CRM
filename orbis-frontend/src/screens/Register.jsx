import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { useToast } from '../components/UI/Toast';

// ─── Directive §1 : Regex email stricte ───
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Directive §2 : Règles de force mot de passe ───
const PASSWORD_RULES = [
  { id: 'length',  label: 'Au moins 8 caractères',  test: (p) => p.length >= 8 },
  { id: 'letter',  label: 'Au moins une lettre',     test: (p) => /[a-zA-Z]/.test(p) },
  { id: 'digit',   label: 'Au moins un chiffre',     test: (p) => /\d/.test(p) },
  { id: 'special', label: 'Au moins un caractère spécial (@$!?...)', test: (p) => /[@$!%*?&#+\-_=^~|]/.test(p) }
];

const getStrength = (password) => {
  const passed = PASSWORD_RULES.filter(r => r.test(password)).length;
  return { count: passed, percent: passed * 25 };
};

const STRENGTH_CONFIG = {
  0:  { label: '',          color: 'bg-gray-300',          text: 'text-gray-400' },
  25: { label: 'Faible',    color: 'bg-corporate-danger',   text: 'text-red-500' },
  50: { label: 'Moyen',     color: 'bg-corporate-warning',  text: 'text-amber-500' },
  75: { label: 'Fort',      color: 'bg-yellow-400',         text: 'text-yellow-500' },
  100:{ label: 'Sécurisé',  color: 'bg-corporate-success',  text: 'text-emerald-500' }
};

const Register = ({ onRegisterSuccess, onSwitchToLogin }) => {
  const { showToast } = useToast();

  const [name, setName]                   = useState('');
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirm, setConfirm]             = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [loading, setLoading]             = useState(false);

  // ─── Calculs temps réel ───
  const emailValid     = EMAIL_REGEX.test(email);
  const emailHint      = email.length === 0 ? null : emailValid ? '✅' : '❌';
  const { count, percent } = getStrength(password);
  const strengthCfg    = STRENGTH_CONFIG[percent] || STRENGTH_CONFIG[0];
  const isStrong       = percent === 100;

  // ─── Directive §1 : Blocage presse-papier mot de passe ───
  const blockClipboard = (e) => {
    e.preventDefault();
    showToast('⚠️ Copier / Coller désactivé sur ce champ pour votre sécurité.', 'warning');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ─── Directive §1 : Trim avant soumission ───
    const cleanName  = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(cleanEmail)) {
      showToast('Adresse email invalide. Vérifiez le format.', 'error');
      return;
    }
    if (!isStrong) {
      showToast('Le mot de passe ne remplit pas toutes les exigences de sécurité.', 'error');
      return;
    }
    if (password !== confirm) {
      showToast('Les deux mots de passe ne correspondent pas.', 'error');
      return;
    }

    setLoading(true);
    try {
      // Simulation appel API — à remplacer par axios vers /api/auth/register
      if (cleanName && cleanEmail && password) {
        showToast('Compte créé avec succès ! Connectez-vous.', 'success');
        onRegisterSuccess();
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Échec lors de la création du compte.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-midnight-deep p-4 transition-colors animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-midnight-card border border-gray-200 dark:border-midnight-border rounded-3xl p-6 lg:p-8 shadow-xl space-y-5">

        {/* EN-TÊTE */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Créer un profil <span className="text-corporate-primary">Orbis</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Rejoignez l'équipe commerciale et suivez vos deals
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Nom complet — Directive §1 : maxLength 60, placeholder local */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Nom complet
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <User size={16} />
              </span>
              <input
                id="register-name"
                type="text"
                required
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bokinga Ethane"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-midnight-dark border border-gray-200 dark:border-midnight-border rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-corporate-primary transition-colors"
              />
            </div>
          </div>

          {/* Email — Directive §1 : maxLength 85, indicateur temps réel */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Email Professionnel
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <Mail size={16} />
              </span>
              <input
                id="register-email"
                type="email"
                required
                maxLength={85}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ethane***@gmail.com"
                className="w-full pl-10 pr-9 py-2.5 bg-gray-50 dark:bg-midnight-dark border border-gray-200 dark:border-midnight-border rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-corporate-primary transition-colors"
              />
              {emailHint && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm">
                  {emailHint}
                </span>
              )}
            </div>
          </div>

          {/* Mot de passe — Directive §1 & §2 : maxLength 40, clipboard bloqué, œil, force */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Mot de passe
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <Lock size={16} />
              </span>
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                required
                maxLength={40}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onPaste={blockClipboard}
                onCopy={blockClipboard}
                onCut={blockClipboard}
                placeholder="Créer un mot de passe fort"
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-midnight-dark border border-gray-200 dark:border-midnight-border rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-corporate-primary transition-colors"
              />
              <button
                type="button"
                id="toggle-register-password"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-corporate-primary transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* ─── Directive §2 : Indicateur de force dynamique ─── */}
            {password.length > 0 && (
              <div className="mt-2 space-y-2 p-3 bg-gray-50 dark:bg-midnight-dark border border-gray-200 dark:border-midnight-border rounded-xl">
                {/* Barre de progression */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 dark:bg-midnight-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${strengthCfg.color}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-bold ${strengthCfg.text}`}>
                    {strengthCfg.label}
                  </span>
                </div>

                {/* Règles individuelles */}
                <ul className="space-y-1">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(password);
                    return (
                      <li key={rule.id} className="flex items-center gap-2 text-[10px]">
                        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${ok ? 'bg-corporate-success' : 'bg-corporate-danger'}`} />
                        <span className={ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}>
                          {rule.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Confirmation mot de passe — Directive §1 & §2 : maxLength 40, clipboard bloqué, œil */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <Lock size={16} />
              </span>
              <input
                id="register-confirm"
                type={showConfirm ? 'text' : 'password'}
                required
                maxLength={40}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onPaste={blockClipboard}
                onCopy={blockClipboard}
                onCut={blockClipboard}
                placeholder="Répétez le mot de passe"
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-midnight-dark border border-gray-200 dark:border-midnight-border rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-corporate-primary transition-colors"
              />
              <button
                type="button"
                id="toggle-confirm-password"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-corporate-primary transition-colors"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Avertissement rôle */}
          <div className="p-3 bg-amber-50 dark:bg-midnight-dark border border-amber-200 dark:border-midnight-border rounded-xl flex items-start space-x-2 text-[10px] text-gray-500 dark:text-gray-400 leading-normal">
            <ShieldAlert size={18} className="text-corporate-warning flex-shrink-0 mt-0.5" />
            <span>
              Chaque inscription locale est soumise au rôle de{' '}
              <strong className="text-gray-700 dark:text-gray-200">Commercial</strong> par défaut.
              Seul un administrateur peut modifier ce statut.
            </span>
          </div>

          {/* ─── Directive §2 : Bouton désactivé tant que force < 100% ─── */}
          <button
            id="register-submit-btn"
            type="submit"
            disabled={loading || !isStrong}
            className="w-full py-2.5 bg-corporate-primary hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-500/10"
          >
            {loading ? 'Création du profil...' : "Valider l'inscription"}
          </button>
        </form>

        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Déjà inscrit ?{' '}
            <button
              id="switch-to-login"
              onClick={onSwitchToLogin}
              className="text-corporate-primary font-bold hover:underline"
            >
              Se connecter
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Register;
