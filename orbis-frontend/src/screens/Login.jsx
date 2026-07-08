import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useToast } from '../components/UI/Toast';

// ─── Directive §1 : Regex email stricte ───
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login = ({ onLoginSuccess, onSwitchToRegister }) => {
  const { showToast } = useToast();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);

  // ─── Directive §1 : Indicateur en temps réel de l'email ───
  const emailValid = EMAIL_REGEX.test(email);
  const emailHint  = email.length === 0 ? null : emailValid ? '✅' : '❌';

  // ─── Directive §1 : Blocage presse-papier sur le mot de passe ───
  const blockClipboard = (e) => {
    e.preventDefault();
    showToast('⚠️ Copier / Coller désactivé sur ce champ pour votre sécurité.', 'warning');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ─── Directive §1 : Trim email avant soumission ───
    const cleanEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(cleanEmail)) {
      showToast('Adresse email invalide. Vérifiez le format.', 'error');
      return;
    }

    setLoading(true);
    try {
      // Simulation appel API — à remplacer par axios vers /api/auth/login
      if (cleanEmail && password) {
        onLoginSuccess({ token: 'MOCK_JWT', user: { name: 'Commercial Demo', role: 'commercial' } });
        showToast('Bienvenue sur Orbis CRM !', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Erreur d\'authentification.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = (credentialResponse) => {
    onLoginSuccess({ token: credentialResponse.credential, user: { name: 'Compte Google', role: 'commercial' } });
    showToast('Connexion Google réussie !', 'success');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-midnight-deep p-4 transition-colors animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-midnight-card border border-gray-200 dark:border-midnight-border rounded-3xl p-6 lg:p-8 shadow-xl space-y-6">

        {/* LOGO HERO */}
        <div className="text-center space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-corporate-primary/10 border border-corporate-primary/30 flex items-center justify-center text-corporate-primary mx-auto shadow-sm">
            <ShieldCheck size={30} />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Orbis<span className="text-corporate-primary">CRM</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Console d'accès sécurisée de la force de vente</p>
        </div>

        {/* FORMULAIRE */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Email — Directive §1 : maxLength 85, trim, regex, indicateur temps réel */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Adresse Email Pro
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <Mail size={16} />
              </span>
              <input
                id="login-email"
                type="email"
                required
                maxLength={85}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ethane***@gmail.com"
                className="w-full pl-10 pr-9 py-2.5 bg-gray-50 dark:bg-midnight-dark border border-gray-200 dark:border-midnight-border rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-corporate-primary transition-colors"
              />
              {/* Indicateur email temps réel */}
              {emailHint && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm">
                  {emailHint}
                </span>
              )}
            </div>
          </div>

          {/* Mot de passe — Directive §1 & §2 : maxLength 40, clipboard bloqué, œil */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Mot de passe
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <Lock size={16} />
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                maxLength={40}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onPaste={blockClipboard}
                onCopy={blockClipboard}
                onCut={blockClipboard}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-midnight-dark border border-gray-200 dark:border-midnight-border rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-corporate-primary transition-colors"
              />
              {/* Bouton œil — Directive §2 */}
              <button
                type="button"
                id="toggle-login-password"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-corporate-primary transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-corporate-primary hover:bg-blue-600 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-500/10"
          >
            {loading ? 'Authentification...' : 'Se connecter'}
          </button>
        </form>

        {/* SÉPARATEUR */}
        <div className="relative flex py-1 items-center text-xs text-gray-400 uppercase font-semibold">
          <div className="flex-grow border-t border-gray-200 dark:border-midnight-border" />
          <span className="flex-shrink mx-4 text-[10px]">Ou continuer avec</span>
          <div className="flex-grow border-t border-gray-200 dark:border-midnight-border" />
        </div>

        {/* GOOGLE OAUTH */}
        <div className="flex justify-center w-full rounded-xl overflow-hidden border border-gray-200 dark:border-midnight-border">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => showToast('Connexion via Google avortée.', 'error')}
            useOneTap
            theme="filled_black"
            width="100%"
          />
        </div>

        <div className="text-center pt-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Nouveau sur la plateforme ?{' '}
            <button
              id="switch-to-register"
              onClick={onSwitchToRegister}
              className="text-corporate-primary font-bold hover:underline"
            >
              Créer un compte
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;
