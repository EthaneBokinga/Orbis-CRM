import React, { useState } from 'react';
import { X, Mail, Key, Lock, ArrowRight, CheckCircle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ForgotPasswordModal({ onClose }) {
  const [step, setStep] = useState(1); // 1 = email, 2 = code, 3 = nouveau mdp, 4 = succès
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState(''); // Uniquement pour faciliter les tests sans SMTP

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setDevCode('');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: controller.signal
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur d'envoi.");

      if (data._devCode) setDevCode(data._devCode);
      setStep(2);
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Le serveur met trop de temps à répondre. Veuillez réessayer.');
      } else {
        setError(err.message || 'Impossible d’envoyer le code pour le moment.');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const handleVerifyCode = (e) => {
    e.preventDefault();
    setError('');
    if (code.length !== 6) {
      setError('Le code doit comporter 6 chiffres.');
      return;
    }
    setStep(3);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de réinitialisation.");
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fadeIn">
        {/* En-tête */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-500/10 border border-teal-500/20 rounded-lg flex items-center justify-center">
              <Lock className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">Mot de passe oublié</h2>
              <p className="text-[10px] text-slate-500">
                {step === 1 && 'Étape 1 sur 3 — Votre adresse email'}
                {step === 2 && 'Étape 2 sur 3 — Code de vérification'}
                {step === 3 && 'Étape 3 sur 3 — Nouveau mot de passe'}
                {step === 4 && 'Réinitialisation terminée'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {/* Indicateur d'étapes */}
          {step < 4 && (
            <div className="flex gap-1.5 mb-5">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-teal-500' : 'bg-slate-800'}`} />
              ))}
            </div>
          )}

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mb-4 text-xs text-rose-400">
              {error}
            </div>
          )}

          {/* Étape 1 : Email */}
          {step === 1 && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                  Entrez l'adresse email associée à votre compte. Nous vous enverrons un code secret de 6 chiffres.
                </p>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Adresse email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="vous@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:opacity-90 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Envoi en cours…' : <>Envoyer le code <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          {/* Étape 2 : Code */}
          {step === 2 && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                Un code à 6 chiffres a été envoyé à <strong className="text-teal-400">{email}</strong>. Vérifiez votre boîte de réception (et vos spams).
              </p>
              {devCode && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400">
                  <span className="font-bold">Mode dev (SMTP non configuré)</span> — Votre code est : <span className="font-mono text-lg tracking-widest text-amber-300">{devCode}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Code secret à 6 chiffres</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 font-mono tracking-widest focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={code.length !== 6}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:opacity-90 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Valider le code <ArrowRight className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setStep(1)} className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors">
                ← Changer d'adresse email
              </button>
            </form>
          )}

          {/* Étape 3 : Nouveau mot de passe */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                Choisissez un nouveau mot de passe sécurisé pour votre compte.
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nouveau mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Au moins 6 caractères"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirmer le mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Répéter le mot de passe"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:opacity-90 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Réinitialisation…' : <>Réinitialiser <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          {/* Étape 4 : Succès */}
          {step === 4 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Mot de passe réinitialisé !</h3>
              <p className="text-sm text-slate-400">
                Votre nouveau mot de passe est actif. Vous pouvez maintenant vous connecter.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:opacity-90 text-slate-950 font-bold text-sm transition-all"
              >
                Se connecter →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
