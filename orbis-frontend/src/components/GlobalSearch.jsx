import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, User, Briefcase, FileText, Calendar, MessageSquare, Activity, Users, Loader, ArrowUpDown } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/search`
  : 'http://localhost:5001/api/search';

// Mapping des icônes par catégorie
const CATEGORY_CONFIG = {
  contacts:   { icon: User,         label: 'Contacts',       color: 'text-blue-400', bg: 'bg-blue-500/10' },
  deals:      { icon: Briefcase,    label: 'Deals',          color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  invoices:   { icon: FileText,     label: 'Factures',       color: 'text-amber-400', bg: 'bg-amber-500/10' },
  users:      { icon: Users,        label: 'Utilisateurs',   color: 'text-purple-400', bg: 'bg-purple-500/10' },
  events:     { icon: Calendar,     label: 'Événements',     color: 'text-rose-400', bg: 'bg-rose-500/10' },
  messages:   { icon: MessageSquare,label: 'Messages',       color: 'text-teal-400', bg: 'bg-teal-500/10' },
  activities: { icon: Activity,     label: 'Activités',      color: 'text-orange-400', bg: 'bg-orange-500/10' }
};

const CATEGORY_ORDER = ['contacts', 'deals', 'invoices', 'events', 'messages', 'activities', 'users'];

export default function GlobalSearch({ onClose, onNavigate }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [groupedResults, setGroupedResults] = useState({});
  const [flatResults, setFlatResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Focus automatique sur l'input
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Fermeture avec Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Recherche avec debounce
  const performSearch = useCallback(async (searchQuery) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setGroupedResults({});
      setFlatResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`${API_URL}?q=${encodeURIComponent(searchQuery.trim())}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Erreur recherche');
      const data = await res.json();
      const items = data.results || [];

      // Grouper par catégorie
      const grouped = {};
      items.forEach(item => {
        if (!grouped[item.category]) grouped[item.category] = [];
        grouped[item.category].push(item);
      });
      setGroupedResults(grouped);
      setFlatResults(items);
      setResults(items);
      setSelectedIndex(-1);
    } catch (err) {
      console.error('[Search] Erreur:', err);
      setResults([]);
      setGroupedResults({});
      setFlatResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(val), 300);
  };

  // Navigation clavier
  const handleKeyDown = (e) => {
    const total = flatResults.length;
    if (total === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % total);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev <= 0 ? total - 1 : prev - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < flatResults.length) {
          handleSelect(flatResults[selectedIndex]);
        }
        break;
    }
  };

  // Faire défiler l'élément sélectionné dans la vue
  useEffect(() => {
    if (selectedIndex >= 0) {
      const el = document.getElementById(`search-result-${selectedIndex}`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Sélection d'un résultat
  const handleSelect = (item) => {
    if (onNavigate) {
      onNavigate(item.category, item._id, item.data);
    }
    onClose();
  };

  // Obtenir les catégories dans l'ordre
  const orderedCategories = CATEGORY_ORDER.filter(cat => groupedResults[cat]);

  // Indicateur de chargement
  const SearchLoader = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-3">
      <Loader className="w-6 h-6 text-teal-400 animate-spin" />
      <p className="text-xs text-slate-500 font-mono">Recherche en cours...</p>
    </div>
  );

  // État vide
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-3">
      <Search className="w-8 h-8 text-slate-700" />
      {query.length < 2 ? (
        <div className="text-center">
          <p className="text-sm text-slate-500">Tapez au moins 2 caractères pour lancer la recherche</p>
          <p className="text-[10px] text-slate-600 mt-2 font-mono">
            Recherchez parmi les contacts, deals, factures, événements, messages...
          </p>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-sm text-slate-500">Aucun résultat trouvé pour "<span className="text-slate-300">{query}</span>"</p>
          <p className="text-[10px] text-slate-600 mt-2">Essayez avec d'autres termes</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Overlay backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal de recherche */}
      <div className="fixed inset-0 z-[110] flex items-start justify-center pt-[15vh] px-4">
        <div
          className="w-full max-w-2xl bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl shadow-slate-950/50 overflow-hidden animate-[fadeIn_0.2s_ease-out]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Barre de recherche */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
            <Search className="w-5 h-5 text-slate-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Rechercher un contact, deal, facture, événement, message..."
              className="flex-1 bg-transparent text-base text-white placeholder-slate-500 focus:outline-none font-light"
              autoComplete="off"
              spellCheck={false}
            />
            {loading && <Loader className="w-4 h-4 text-teal-400 animate-spin shrink-0" />}
            {query && !loading && (
              <button
                onClick={() => { setQuery(''); setResults([]); setGroupedResults({}); setFlatResults([]); setHasSearched(false); inputRef.current?.focus(); }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-500">
              ESC
            </kbd>
          </div>

          {/* Résultats */}
          <div className="max-h-[50vh] overflow-y-auto">
            {loading ? (
              <SearchLoader />
            ) : hasSearched && flatResults.length === 0 ? (
              <EmptyState />
            ) : !hasSearched ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2">
                <div className="w-12 h-12 rounded-xl bg-slate-800/50 border border-slate-800 flex items-center justify-center">
                  <ArrowUpDown className="w-5 h-5 text-slate-600" />
                </div>
                <p className="text-xs text-slate-600 font-mono">
                  Appuyez sur <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]">↓</kbd> pour naviguer, <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px]">↵</kbd> pour sélectionner
                </p>
              </div>
            ) : (
              <div className="py-2">
                {orderedCategories.map((category) => {
                  const config = CATEGORY_CONFIG[category];
                  const items = groupedResults[category];
                  const Icon = config?.icon || Search;

                  return (
                    <div key={category}>
                      {/* En-tête de catégorie */}
                      <div className="flex items-center gap-2 px-5 py-2">
                        <div className={`w-5 h-5 rounded-md ${config?.bg || 'bg-slate-800'} flex items-center justify-center`}>
                          <Icon className={`w-3 h-3 ${config?.color || 'text-slate-400'}`} />
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${config?.color || 'text-slate-400'}`}>
                          {config?.label || category}
                        </span>
                        <span className="text-[10px] font-mono text-slate-600 ml-auto">{items.length}</span>
                      </div>

                      {/* Items de la catégorie */}
                      {items.map((item, idx) => {
                        const flatIdx = flatResults.indexOf(item);
                        const isSelected = flatIdx === selectedIndex;

                        return (
                          <button
                            id={`search-result-${flatIdx}`}
                            key={`${item.category}-${item._id}`}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelectedIndex(flatIdx)}
                            className={`w-full text-left px-5 py-3 flex items-center gap-3 transition-all duration-150 ${
                              isSelected
                                ? 'bg-teal-500/10 border-l-2 border-l-teal-400'
                                : 'hover:bg-slate-800/40 border-l-2 border-l-transparent'
                            }`}
                          >
                            {/* Icône de l'item */}
                            <div className={`w-8 h-8 rounded-lg ${config?.bg || 'bg-slate-800'} flex items-center justify-center shrink-0`}>
                              <Icon className={`w-4 h-4 ${config?.color || 'text-slate-400'}`} />
                            </div>

                            {/* Texte */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${isSelected ? 'text-teal-300' : 'text-slate-200'}`}>
                                {item.label}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {item.subtitle}
                              </p>
                            </div>

                            {/* Indice de la catégorie */}
                            <span className="text-[9px] font-mono text-slate-600 uppercase shrink-0">
                              {category === 'contacts' ? 'Contact' :
                               category === 'deals' ? 'Deal' :
                               category === 'invoices' ? 'Facture' :
                               category === 'users' ? 'User' :
                               category === 'events' ? 'Event' :
                               category === 'messages' ? 'Msg' :
                               category === 'activities' ? 'Act' : ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}

                {/* Résultats vides si aucune catégorie */}
                {orderedCategories.length === 0 && hasSearched && flatResults.length === 0 && (
                  <EmptyState />
                )}
              </div>
            )}
          </div>

          {/* Footer avec raccourcis */}
          <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-4 text-[10px] text-slate-600">
              <span><kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono">↑↓</kbd> Naviguer</span>
              <span><kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono">↵</kbd> Ouvrir</span>
              <span><kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono">ESC</kbd> Fermer</span>
            </div>
            <p className="text-[9px] text-slate-700 font-mono">{flatResults.length} résultat(s)</p>
          </div>
        </div>
      </div>
    </>
  );
}
