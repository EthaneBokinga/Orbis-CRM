import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { X, Plus, Calendar as CalendarIcon, Trash2 } from 'lucide-react';

// Localisateur français
const locales = { fr };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const API_EVENTS = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/events`
  : 'http://localhost:5001/api/events';

// === COULEURS PAR TYPE D'ÉVÉNEMENT ===
const TYPE_COLORS = {
  rdv: '#0d9488',      // teal
  appel: '#3b82f6',    // blue
  email: '#8b5cf6',    // violet
  reunion: '#f59e0b',  // amber
  tache: '#10b981',    // emerald
  autre: '#64748b'     // slate
};

const TYPE_LABELS = {
  rdv: 'Rendez-vous',
  appel: 'Appel',
  email: 'Email',
  reunion: 'Réunion',
  tache: 'Tâche',
  autre: 'Autre'
};

// === MODAL DE CRÉATION / ÉDITION D'ÉVÉNEMENT ===
function EventFormModal({ event, onClose, onSave, onDelete, onRefresh }) {
  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [startDate, setStartDate] = useState(
    event?.start ? format(new Date(event.start), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
  const [endDate, setEndDate] = useState(
    event?.end ? format(new Date(event.end), "yyyy-MM-dd'T'HH:mm") : format(new Date(Date.now() + 3600000), "yyyy-MM-dd'T'HH:mm")
  );
  const [allDay, setAllDay] = useState(event?.allDay || false);
  const [type, setType] = useState(event?.type || 'rdv');
  const [color, setColor] = useState(event?.color || TYPE_COLORS[event?.type] || '#0d9488');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setError('Le titre est requis.');
    setLoading(true);
    setError('');

    const authOpts = { credentials: 'include', headers: { 'Content-Type': 'application/json' } };

    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        allDay,
        type,
        color: TYPE_COLORS[type] || color
      };

      if (event?._id) {
        // Update
        const res = await fetch(`${API_EVENTS}/${event._id}`, {
          method: 'PUT', ...authOpts, body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Erreur modification.');
      } else {
        // Create
        const res = await fetch(API_EVENTS, {
          method: 'POST', ...authOpts, body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Erreur création.');
      }

      onRefresh();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event?._id) return;
    if (!window.confirm('Supprimer cet événement ?')) return;
    setLoading(true);
    try {
      await fetch(`${API_EVENTS}/${event._id}`, {
        method: 'DELETE', credentials: 'include'
      });
      onRefresh();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-emerald-400" />
          {event?._id ? "Modifier l'événement" : 'Nouvel événement'}
        </h3>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-400">{error}</div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Titre *</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50" />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 resize-none" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Début</label>
          <input type={allDay ? 'date' : 'datetime-local'} value={startDate} onChange={e => setStartDate(e.target.value)} required
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Fin</label>
          <input type={allDay ? 'date' : 'datetime-local'} value={endDate} onChange={e => setEndDate(e.target.value)} required
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="allDay" checked={allDay} onChange={e => setAllDay(e.target.checked)}
          className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-emerald-500/20" />
        <label htmlFor="allDay" className="text-xs text-slate-400">Toute la journée</label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
          <select value={type} onChange={e => { setType(e.target.value); setColor(TYPE_COLORS[e.target.value]); }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50">
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Couleur</label>
          <div className="flex gap-1.5 mt-2">
            {['#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#64748b'].map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2 border-t border-slate-800">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-800 rounded-xl text-xs text-slate-400 hover:text-white transition-all">
          Annuler
        </button>
        {event?._id && (
          <button type="button" onClick={handleDelete} disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-all flex items-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5" /> Supprimer
          </button>
        )}
        <button type="submit" disabled={loading || !title.trim()}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-all">
          {loading ? 'Enregistrement...' : event?._id ? 'Modifier' : 'Créer'}
        </button>
      </div>
    </form>
  );
}

// === COMPOSANT PRINCIPAL : CALENDAR PANEL ===
export default function CalendarPanel({ onClose }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());

  const fetchEvents = useCallback(async () => {
    try {
      const start = new Date(date.getFullYear(), date.getMonth() - 1, 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 2, 0);
      const res = await fetch(
        `${API_EVENTS}?start=${start.toISOString()}&end=${end.toISOString()}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Erreur chargement calendrier:', err);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleSelectSlot = (slotInfo) => {
    setSelectedEvent({
      start: slotInfo.start,
      end: slotInfo.end,
      allDay: !slotInfo.slots || slotInfo.slots.length > 1
    });
    setShowForm(true);
  };

  const handleSelectEvent = (calEvent) => {
    setSelectedEvent(calEvent);
    setShowForm(true);
  };

  // Styles personnalisés pour les événements
  const eventStyleGetter = (event) => ({
    style: {
      backgroundColor: event.color || '#0d9488',
      borderRadius: '8px',
      border: 'none',
      color: '#fff',
      fontSize: '11px',
      fontWeight: 600,
      padding: '2px 6px',
      opacity: event.completed ? 0.5 : 1,
      textDecoration: event.completed ? 'line-through' : 'none'
    }
  });

  // Personnalisation des vues du calendrier
  const components = {
    toolbar: (toolbar) => (
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => toolbar.onNavigate('TODAY')}
            className="px-3 py-1.5 text-[10px] bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-lg font-bold transition-all">
            Aujourd'hui
          </button>
          <button onClick={() => toolbar.onNavigate('PREV')}
            className="px-2 py-1.5 text-xs bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all">
            ←
          </button>
          <button onClick={() => toolbar.onNavigate('NEXT')}
            className="px-2 py-1.5 text-xs bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-all">
            →
          </button>
        </div>
        <h3 className="text-sm font-bold text-white">{toolbar.label}</h3>
        <div className="flex items-center gap-1">
          {['month', 'week', 'day'].map(v => (
            <button key={v} onClick={() => { setView(v); toolbar.onView(v); }}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                toolbar.view === v
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}>
              {v === 'month' ? 'Mois' : v === 'week' ? 'Semaine' : 'Jour'}
            </button>
          ))}
        </div>
      </div>
    ),
    event: ({ event }) => (
      <div className="truncate px-1" title={event.title}>
        {event.type === 'rdv' && '📅 '}
        {event.type === 'appel' && '📞 '}
        {event.type === 'email' && '📧 '}
        {event.type === 'reunion' && '👥 '}
        {event.type === 'tache' && '✅ '}
        {event.title}
      </div>
    )
  };

  const messages = {
    allDay: 'Journée',
    previous: '←',
    next: '→',
    today: 'Aujourd\'hui',
    month: 'Mois',
    week: 'Semaine',
    day: 'Jour',
    agenda: 'Agenda',
    date: 'Date',
    time: 'Heure',
    event: 'Événement',
    noEventsInRange: 'Aucun événement sur cette période.',
    showMore: total => `+${total} autres`
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Overrides CSS pour le thème sombre du calendrier */}
      <style>{`
        .rbc-dark .rbc-calendar { background: #0f172a; color: #e2e8f0; }
        .rbc-dark .rbc-toolbar button { color: #94a3b8; border-color: #334155; background: transparent; font-size: 11px; }
        .rbc-dark .rbc-toolbar button:hover { color: #f1f5f9; background: #1e293b; }
        .rbc-dark .rbc-toolbar button.rbc-active { color: #0f172a; background: #34d399; border-color: #34d399; }
        .rbc-dark .rbc-toolbar-label { color: #f1f5f9; font-weight: 700; font-size: 14px; }
        .rbc-dark .rbc-header { background: #1e293b; border-color: #334155; color: #cbd5e1; font-size: 11px; font-weight: 600; padding: 8px 4px; }
        .rbc-dark .rbc-month-view, 
        .rbc-dark .rbc-time-view { background: #0f172a; border-color: #334155; border-radius: 12px; overflow: hidden; }
        .rbc-dark .rbc-day-bg { border-color: #1e293b; }
        .rbc-dark .rbc-day-bg + .rbc-day-bg { border-left-color: #1e293b; }
        .rbc-dark .rbc-off-range-bg { background: #020617; }
        .rbc-dark .rbc-today { background: rgba(13, 148, 136, 0.08); }
        .rbc-dark .rbc-date-cell { color: #94a3b8; font-size: 11px; padding: 4px; }
        .rbc-dark .rbc-date-cell.rbc-now { font-weight: 700; }
        .rbc-dark .rbc-date-cell.rbc-now a { color: #34d399; }
        .rbc-dark .rbc-button-link { color: #e2e8f0; }
        .rbc-dark .rbc-show-more { color: #34d399; font-size: 10px; }
        .rbc-dark .rbc-event { border: none !important; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
        .rbc-dark .rbc-event:hover { opacity: 0.85; }
        .rbc-dark .rbc-row-segment { padding: 1px 2px; }
        .rbc-dark .rbc-time-column { background: #0f172a; }
        .rbc-dark .rbc-time-gutter.rbc-time-column { background: #1e293b; }
        .rbc-dark .rbc-time-gutter .rbc-timeslot-group { border-color: #1e293b; }
        .rbc-dark .rbc-time-header-content { border-color: #334155; }
        .rbc-dark .rbc-time-content { border-color: #334155; }
        .rbc-dark .rbc-timeslot-group { border-color: #1e293b; }
        .rbc-dark .rbc-time-view .rbc-allday-cell { background: #0f172a; }
        .rbc-dark .rbc-label { color: #64748b; font-size: 10px; }
        .rbc-dark .rbc-current-time-indicator { background: #34d399; }
        .rbc-dark .rbc-overlay { background: #1e293b; border: 1px solid #334155; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
        .rbc-dark .rbc-overlay-header { border-color: #334155; color: #f1f5f9; font-weight: 600; }
        .rbc-dark .rbc-agenda-view { background: #0f172a; }
        .rbc-dark .rbc-agenda-view table { border-color: #334155; }
        .rbc-dark .rbc-agenda-view table thead { background: #1e293b; }
        .rbc-dark .rbc-agenda-view table tbody tr:hover { background: #1e293b; }
        .rbc-dark .rbc-agenda-view table th { color: #94a3b8; font-size: 10px; }
        .rbc-dark .rbc-agenda-view table td { color: #cbd5e1; font-size: 11px; }
      `}</style>
      <div className="w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-500/10 border border-teal-500/20 rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">Calendrier</h2>
              <p className="text-[10px] text-slate-500">Gérez vos rendez-vous et événements</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setSelectedEvent(null); setShowForm(true); }}
              className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Nouveau
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-6 h-6 border-2 border-t-emerald-400 border-slate-700 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="rbc-dark">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: Math.max(400, window.innerHeight - 280), minHeight: 400 }}
                views={['month', 'week', 'day']}
                view={view}
                date={date}
                onView={setView}
                onNavigate={setDate}
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                selectable
                eventPropGetter={eventStyleGetter}
                components={components}
                messages={messages}
                popup
                culture="fr"
                formats={{
                  monthHeaderFormat: 'MMMM yyyy',
                  dayHeaderFormat: (date) => format(date, 'EEEE d MMMM yyyy', { locale: fr }),
                  dayRangeHeaderFormat: ({ start, end }) =>
                    `${format(start, 'dd MMM', { locale: fr })} - ${format(end, 'dd MMM yyyy', { locale: fr })}`,
                }}
              />
            </div>
          )}
        </div>

        {/* Légende */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center gap-4 flex-wrap">
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[key] }} />
              <span className="text-[10px] text-slate-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de formulaire */}
      {showForm && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => {
          if (e.target === e.currentTarget) { setShowForm(false); }
        }}>
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <EventFormModal
              event={selectedEvent}
              onClose={() => { setShowForm(false); setSelectedEvent(null); }}
              onRefresh={fetchEvents}
            />
          </div>
        </div>
      )}
    </div>
  );
}
