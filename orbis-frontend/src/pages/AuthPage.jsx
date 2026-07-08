import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useToast } from '../components/UI/Toast';

const API_AUTH_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/auth` 
  : "http://localhost:5001/api/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  0:  { label: '',          color: 'bg-slate-700',          text: 'text-slate-500' },
  25: { label: 'Faible',    color: 'bg-rose-500',           text: 'text-rose-500' },
  50: { label: 'Moyen',     color: 'bg-amber-500',          text: 'text-amber-500' },
  75: { label: 'Fort',      color: 'bg-yellow-400',         text: 'text-yellow-500' },
  100:{ label: 'Sécurisé',  color: 'bg-emerald-500',        text: 'text-emerald-500' }
};

export default function AuthPage({ onLoginSuccess }) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirm: '' });

  const emailValid = EMAIL_REGEX.test(formData.email);
  const emailHint = formData.email.length === 0 ? null : emailValid ? '✅' : '❌';
  const { count, percent } = getStrength(formData.password);
  const strengthCfg = STRENGTH_CONFIG[percent] || STRENGTH_CONFIG[0];
  const isStrong = percent === 100;

  const blockClipboard = (e) => {
    e.preventDefault();
    showToast('⚠️ Copier / Coller désactivé sur ce champ pour votre sécurité.', 'warning');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = formData.email.trim().toLowerCase();
    
    if (!EMAIL_REGEX.test(cleanEmail)) {
      showToast('Adresse email invalide.', 'error');
      return;
    }

    if (!isLogin) {
      if (!isStrong) {
        showToast('Le mot de passe doit remplir toutes les exigences de sécurité.', 'error');
        return;
      }
      if (formData.password !== formData.confirm) {
        showToast('Les mots de passe ne correspondent pas.', 'error');
        return;
      }
    }

    setLoading(true);

    const endpoint = isLogin ? `${API_AUTH_URL}/login` : `${API_AUTH_URL}/register`;
    const payload = isLogin 
      ? { email: cleanEmail, password: formData.password }
      : { name: formData.name.trim(), email: cleanEmail, password: formData.password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Une erreur est survenue lors de l'authentification.");
      }

      if (isLogin) {
        localStorage.setItem('token', data.accessToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userRole', data.user.role);
        showToast('Connexion réussie !', 'success');
        if (onLoginSuccess) onLoginSuccess(data);
        navigate(data.user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
      } else {
        showToast('Compte créé avec succès ! Connectez-vous.', 'success');
        setIsLogin(true);
        setFormData({ name: '', email: '', password: '', confirm: '' });
      }

    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_AUTH_URL}/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Échec de l'authentification Google.");
      }

      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('userRole', data.user.role);
      showToast('Connexion Google réussie !', 'success');
      if (onLoginSuccess) onLoginSuccess(data);
      navigate(data.user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });

    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex items-center justify-center p-4 relative overflow-hidden selection:bg-teal-500 selection:text-slate-950">
      
      {/* HALOS LUMINEUX PREMIUM EN ARRIÈRE-PLAN (ZÉRO IMAGE, FLUIDITÉ MAXIMALE) */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none"></div>

      {/* CONTENEUR DE LA CARTE */}
      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-8 rounded-3xl shadow-2xl space-y-6 relative z-10 animate-fadeIn">
        
        {/* HEADER LOGO */}
        <div className="text-center space-y-2">
          <img src="/outpout/icons/icon-transparent-192x192.png" alt="Orbis Logo" className="mx-auto w-14 h-14 object-contain mb-2 drop-shadow-md animate-pulse" />
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            {isLogin ? "Ravi de vous revoir" : "Rejoindre Orbis CRM"}
          </h2>
          <p className="text-xs text-slate-400">
            {isLogin ? "Connectez-vous pour piloter vos performances" : "Créez votre compte commercial en quelques secondes"}
          </p>
        </div>

        {/* FORMULAIRE LOCAL */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Nom complet</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                  <User size={16} />
                </span>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Landry Malik"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Adresse Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                <Mail size={16} />
              </span>
              <input 
                type="email" 
                required
                maxLength={85}
                placeholder="nom@entreprise.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-10 pr-9 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all"
              />
              {emailHint && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm">
                  {emailHint}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5 relative">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Mot de passe</label>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                <Lock size={16} />
              </span>
              <input 
                type={showPassword ? "text" : "password"} 
                required
                maxLength={40}
                placeholder="••••••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                onPaste={blockClipboard}
                onCopy={blockClipboard}
                onCut={blockClipboard}
                className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-medium"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Force du mot de passe */}
            {!isLogin && formData.password.length > 0 && (
              <div className="mt-2 space-y-2 p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${strengthCfg.color}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-bold ${strengthCfg.text}`}>
                    {strengthCfg.label}
                  </span>
                </div>
                <ul className="space-y-1">
                  {PASSWORD_RULES.map((rule) => {
                    const ok = rule.test(formData.password);
                    return (
                      <li key={rule.id} className="flex items-center gap-2 text-[10px]">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className={ok ? 'text-emerald-400' : 'text-slate-500'}>
                          {rule.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {!isLogin && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Confirmer le mot de passe</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                  <Lock size={16} />
                </span>
                <input 
                  type={showConfirm ? "text" : "password"} 
                  required
                  maxLength={40}
                  placeholder="••••••••••••"
                  value={formData.confirm}
                  onChange={(e) => setFormData({ ...formData, confirm: e.target.value })}
                  onPaste={blockClipboard}
                  onCopy={blockClipboard}
                  onCut={blockClipboard}
                  className="w-full bg-slate-950 border border-slate-800/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all"
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-medium"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {!isLogin && (
            <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-start space-x-2 text-[10px] text-amber-400 leading-normal">
              <ShieldAlert size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <span>
                Chaque inscription locale est soumise au rôle de <strong>Commercial</strong> par défaut. Seul un administrateur peut modifier ce statut.
              </span>
            </div>
          )}

          {/* BOUTON D'ACTION PRINCIPAL */}
          <button 
            type="submit"
            disabled={loading || (!isLogin && !isStrong)}
            className="w-full h-11 bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold rounded-xl text-sm hover:opacity-95 transform active:scale-[0.99] transition-all flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-teal-500/10"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              isLogin ? "Se connecter" : "Valider l'inscription"
            )}
          </button>
        </form>

        {/* SÉPARATEUR */}
        <div className="relative flex py-1 items-center text-xs text-slate-500 uppercase font-semibold">
          <div className="flex-grow border-t border-slate-800/80" />
          <span className="flex-shrink mx-4 text-[10px]">Ou continuer avec</span>
          <div className="flex-grow border-t border-slate-800/80" />
        </div>

        {/* GOOGLE OAUTH */}
        <div className="flex justify-center w-full rounded-xl overflow-hidden border border-slate-800/80">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => showToast('Connexion via Google avortée.', 'error')}
            useOneTap
            theme="filled_black"
            width="100%"
          />
        </div>

        <div className="text-center pt-1">
          <p className="text-xs text-slate-400">
            {isLogin ? "Nouveau sur la plateforme ?" : "Déjà inscrit ?"}
            {' '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setFormData({ name: '', email: '', password: '', confirm: '' });
              }}
              className="text-teal-400 font-bold hover:underline"
            >
              {isLogin ? "Créer un compte" : "Se connecter"}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}
