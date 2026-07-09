import React, { useState, useEffect, useCallback } from 'react';
import { Phone, Mail, Users, CheckSquare, Plus, Loader2, Clock, X, Calendar } from 'lucide-react';
import { useToast } from './UI/Toast';

const API_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/crm` 
  : "http://localhost:5001/api/crm";

const TYPE_CONFIG = {
  call:    { icon: Phone,      label: 'Appel',    color: 'text-sky-400',    ring: 'ring-sky-400/30',   dot: 'bg-sky-400' },
  email:   { icon: Mail,       label: 'E-mail',   color: 'text-violet-400', ring: 'ring-violet-400/30',dot: 'bg-violet-400' },
  meeting: { icon: Users,      label: 'Réunion',  color: 'text-emerald-400',ring: 'ring-emerald-400/30',dot: 'bg-emerald-400' },
  task:    { icon: CheckSquare,label: 'Tâche',    color: 'text-amber-400',  ring: 'ring-amber-400/30', dot: 'bg-amber-400' },
};

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

function getAuthHeader(isJson = true) {
  return isJson ? { credentials: 'include', headers: { 'Content-Type': 'application/json' } } : { credentials: 'include' };
}

// ═══════════════════════════════════════════════════════════
// ActivityTimeline — Affiche la timeline chronologique d'un deal
// avec la possibilité d'ajouter une nouvelle interaction.
// Props :
//   dealId  — string|ObjectId  MongoDB deal id
//   dealTitle — string   (optionnel, pour le header)
//   onClose — function   ferme le panneau (side-panel ou modal)
// ═══════════════════════════════════════════════════════════
export default function ActivityTimeline({ dealId, dealTitle, onClose }) {
  const { showToast } = useToast();

  const [activities, setActivities]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [form, setForm]               = useState({
    title: '', type: 'call', description: '', dueDate: ''
  });

  // ── Chargement de la timeline ──
  const loadActivities = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/activities/${dealId}`, {
        headers: { ...getAuthHeader() }
      });
      if (!res.ok) throw new Error();
      setActivities(await res.json());
    } catch {
      showToast("Impossible de charger la timeline.", "error");
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => { loadActivities(); }, [loadActivities]);

  // ── Création d'une nouvelle activité ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return showToast("Titre requis.", "warning");
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ ...form, dealId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      showToast("Activité enregistrée !", "success");
      setActivities(prev => [data, ...prev]);
      setForm({ title: '', type: 'call', description: '', dueDate: '' });
      setShowForm(false);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700/60">

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/60">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5">Vue 360°</p>
          <h3 className="text-base font-semibold text-slate-800 dark:text-white truncate max-w-[220px]">
            {dealTitle || 'Timeline du deal'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(p => !p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white text-xs font-semibold transition-all shadow-teal-500/25 shadow-md"
          >
            <Plus size={14} />
            Activité
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Formulaire ajout rapide ── */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/40 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="ex : Appel de qualification"
              className="col-span-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition"
            />
            <select
              value={form.type}
              onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            >
              <option value="call">Appel</option>
              <option value="email">E-mail</option>
              <option value="meeting">Réunion</option>
              <option value="task">Tâche</option>
            </select>
            <input
              type="date"
              value={form.dueDate}
              onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            />
          </div>
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Notes, résumé de l'interaction…"
            rows={2}
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 resize-none transition"
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={submitting}
              className="px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-white text-xs font-semibold transition-all flex items-center gap-1.5">
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Enregistrer
            </button>
          </div>
        </form>
      )}

      {/* ── Liste chronologique ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-32 gap-3 text-slate-400">
            <Loader2 className="animate-spin" size={24} />
            <p className="text-sm">Chargement de la timeline…</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-400">
            <Clock size={28} className="opacity-50" />
            <p className="text-sm">Aucune activité enregistrée.</p>
            <p className="text-xs text-slate-400">Cliquez sur « Activité » pour commencer.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Ligne verticale de la timeline */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-teal-400/60 via-slate-300/40 dark:via-slate-700/40 to-transparent" />

            <div className="space-y-4 pl-10">
              {activities.map((act) => {
                const cfg = TYPE_CONFIG[act.type] || TYPE_CONFIG.call;
                const Icon = cfg.icon;
                return (
                  <div key={act._id} className="relative group">
                    {/* Point de la timeline */}
                    <div className={`absolute -left-[30px] top-2 w-3 h-3 rounded-full ${cfg.dot} ring-4 ${cfg.ring} ring-offset-0 transition-transform group-hover:scale-125`} />

                    {/* Carte activité */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/50 p-3 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon size={13} className={cfg.color} />
                        <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span className="ml-auto text-xs text-slate-400 flex items-center gap-1">
                          <Clock size={11} />
                          {timeAgo(act.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{act.title}</p>
                      {act.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{act.description}</p>
                      )}
                      {act.dueDate && (
                        <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-2">
                          <Calendar size={14} />
                          {new Date(act.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
