import React, { useState, useEffect } from 'react';
import { useToast } from '../components/UI/Toast';
import ThemeToggle from '../components/ThemeToggle';

const API_URL = "http://localhost:5001/api/crm";

export default function CommercialDashboard({ onLogout }) {
  const { showToast } = useToast();
  
  const handleLogout = onLogout || (() => {
    localStorage.clear();
    window.location.href = '/';
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || { name: 'Utilisateur', email: '', role: 'commercial', avatarUrl: '' };
    } catch (e) {
      return { name: 'Utilisateur', email: '', role: 'commercial', avatarUrl: '' };
    }
  });

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profileAvatar, setProfileAvatar] = useState(currentUser.avatarUrl || '');
  const [profileSaving, setProfileSaving] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileName.trim()) {
      showToast("Le nom est requis.", "warning");
      return;
    }
    setProfileSaving(true);
    try {
      const response = await fetch("http://localhost:5001/api/auth/profile", {
        method: 'PUT',
        ...getAuthHeader(),
        body: JSON.stringify({ name: profileName, avatarUrl: profileAvatar })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setCurrentUser(data.user);
        setShowProfileModal(false);
        showToast("Profil mis à jour !", "success");
      } else {
        showToast(data.error || "Erreur de mise à jour.", "error");
      }
    } catch (err) {
      showToast("Erreur réseau.", "error");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("L'image ne doit pas dépasser 2 Mo.", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  };
  
  // --- États fondamentaux ---
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | contacts | kanban
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- États Sélections / Modals ---
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showContactModal, setShowContactModal] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  
  // --- États Formulaires ---
  const [newContact, setNewContact] = useState({ firstName: '', lastName: '', company: '', phone: '', email: '', status: 'à_contacter' });
  const [newDeal, setNewDeal] = useState({ title: '', contact: '', amount: '', stage: 'découverte', probability: 10 });
  const [newInteraction, setNewInteraction] = useState({ type: 'appel', notes: '', nextActionDate: '' });
  const [stats, setStats] = useState({ pipeline: [], overdueReminders: 0 });

  // Récupération du token d'authentification
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } };
  };

  // === CHARGEMENT DES DONNÉES DEPUIS LE BACKEND ===
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resContacts, resDeals, resStats] = await Promise.all([
        fetch(`${API_URL}/contacts`, getAuthHeader()).then(r => r.json()),
        fetch(`${API_URL}/deals`, getAuthHeader()).then(r => r.json()),
        fetch(`${API_URL}/dashboard/stats`, getAuthHeader()).then(r => r.json())
      ]);

      setContacts(Array.isArray(resContacts) ? resContacts : []);
      setDeals(Array.isArray(resDeals) ? resDeals : []);
      setStats(resStats && resStats.pipeline ? resStats : { pipeline: [], overdueReminders: 0 });
    } catch (err) {
      console.error("Erreur de synchronisation avec Orbis Server :", err);
      showToast("Impossible de synchroniser avec Orbis Server.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // === CHARGEMENT DES ÉCHANGES QUAND ON CLIQUE SUR UN CONTACT ===
  useEffect(() => {
    if (selectedContact) {
      fetch(`${API_URL}/interactions/${selectedContact._id}`, getAuthHeader())
        .then(r => r.json())
        .then(data => setInteractions(Array.isArray(data) ? data : []))
        .catch(err => console.error("Erreur interactions :", err));
    }
  }, [selectedContact]);

  // === CREATION D'UN PROSPECT (POST) ===
  const handleCreateContact = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/contacts`, {
        method: 'POST',
        ...getAuthHeader(),
        body: JSON.stringify(newContact)
      });
      if (response.ok) {
        const created = await response.json();
        setContacts([created, ...contacts]);
        setNewContact({ firstName: '', lastName: '', company: '', phone: '', email: '', status: 'à_contacter' });
        setShowContactModal(false);
        showToast("Prospect créé avec succès.", "success");
      } else {
        const errorData = await response.json();
        showToast(errorData.error || "Erreur lors de la création.", "error");
      }
    } catch (err) {
      console.error("Impossible de créer le contact :", err);
      showToast("Erreur réseau.", "error");
    }
  };

  // === AJOUT D'UN COMPTE-RENDU (POST) ===
  const handleAddInteraction = async (e) => {
    e.preventDefault();
    if (!newInteraction.notes.trim()) return;
    try {
      const response = await fetch(`${API_URL}/interactions`, {
        method: 'POST',
        ...getAuthHeader(),
        body: JSON.stringify({
          ...newInteraction,
          contact: selectedContact._id
        })
      });
      if (response.ok) {
        const created = await response.json();
        setInteractions([created, ...interactions]);
        setNewInteraction({ type: 'appel', notes: '', nextActionDate: '' });
        showToast("Échange enregistré.", "success");
        
        // Rafraîchir les stats
        fetch(`${API_URL}/dashboard/stats`, getAuthHeader())
          .then(r => r.json())
          .then(data => setStats(data));
      } else {
        const errorData = await response.json();
        showToast(errorData.error || "Erreur enregistrement.", "error");
      }
    } catch (err) {
      console.error("Erreur insertion note :", err);
    }
  };

  // === CREATION D'UN DEAL (POST) ===
  const handleCreateDeal = async (e) => {
    e.preventDefault();
    if (!newDeal.contact) {
      showToast("Veuillez sélectionner un contact.", "warning");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/deals`, {
        method: 'POST',
        ...getAuthHeader(),
        body: JSON.stringify({
          ...newDeal,
          amount: Number(newDeal.amount)
        })
      });
      if (response.ok) {
        const created = await response.json();
        const contactObj = contacts.find(c => c._id === newDeal.contact);
        const dealToAppend = {
          ...created,
          contact: contactObj ? { _id: contactObj._id, firstName: contactObj.firstName, lastName: contactObj.lastName, company: contactObj.company } : created.contact
        };
        setDeals([...deals, dealToAppend]);
        setNewDeal({ title: '', contact: '', amount: '', stage: 'découverte', probability: 10 });
        setShowDealModal(false);
        showToast("Opportunité créée.", "success");

        // Rafraîchir les stats
        fetch(`${API_URL}/dashboard/stats`, getAuthHeader())
          .then(r => r.json())
          .then(data => setStats(data));
      } else {
        const errorData = await response.json();
        showToast(errorData.error || "Erreur création deal.", "error");
      }
    } catch (err) {
      console.error("Erreur deal creation :", err);
    }
  };

  // === CHANGEMENT D'ÉTAPE KANBAN (PUT) ===
  const moveDealStage = async (dealId, nextStage) => {
    try {
      const response = await fetch(`${API_URL}/deals/${dealId}/stage`, {
        method: 'PUT',
        ...getAuthHeader(),
        body: JSON.stringify({ stage: nextStage })
      });
      if (response.ok) {
        setDeals(deals.map(d => d._id === dealId ? { ...d, stage: nextStage } : d));
        showToast("Étape mise à jour.", "info");
        // Rafraîchir les métriques du dashboard
        fetch(`${API_URL}/dashboard/stats`, getAuthHeader())
          .then(r => r.json())
          .then(data => setStats(data));
      }
    } catch (err) {
      console.error("Erreur mise à jour Kanban :", err);
    }
  };

  // --- Calculs Analytiques en Temps Réel ---
  const totalPipeline = deals.reduce((sum, d) => d.stage !== 'perdu' ? sum + d.amount : sum, 0);
  const wonDealsCount = deals.filter(d => d.stage === 'gagné').length;
  const filteredContacts = contacts.filter(c => 
    `${c.firstName} ${c.lastName} ${c.company}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Loader
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-xl border-2 border-t-teal-400 border-slate-800 animate-spin"></div>
        <p className="text-xs font-mono tracking-widest text-slate-500 uppercase">Synchronisation Orbis Cloud...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-teal-500 selection:text-slate-950">
      
      {/* ================= BARRE DE NAVIGATION PREMIUM ================= */}
      <nav className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => { setActiveTab('dashboard'); setSelectedContact(null); }}>
            <img src="/outpout/wordmark/wordmark-transparent.png" alt="Orbis CRM" className="h-8 object-contain transform group-hover:scale-102 transition-transform duration-200" />
          </div>
          
          <div className="flex items-center space-x-1 bg-slate-900/60 border border-slate-800/80 p-1 rounded-xl">
            <button 
              onClick={() => { setActiveTab('dashboard'); setSelectedContact(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-semibold shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Vue d'ensemble
            </button>
            <button 
              onClick={() => { setActiveTab('contacts'); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === 'contacts' ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-semibold shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Portefeuille Clients
            </button>
            <button 
              onClick={() => { setActiveTab('kanban'); setSelectedContact(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === 'kanban' ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-semibold shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Pipeline Kanban
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <ThemeToggle className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all duration-200 text-xs font-semibold" />

            <div 
              onClick={() => { setProfileName(currentUser.name); setProfileAvatar(currentUser.avatarUrl || ''); setShowProfileModal(true); }}
              className="flex items-center space-x-2.5 bg-slate-900 hover:bg-slate-850/80 border border-slate-800 rounded-xl px-3 py-1.5 cursor-pointer transition-all duration-200 select-none"
            >
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt="Avatar" className="w-6 h-6 rounded-full object-cover border border-teal-500/30" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-[10px] font-black text-slate-950">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200 leading-none">{currentUser.name}</span>
                <span className="text-[9px] text-teal-400 font-mono capitalize leading-none mt-1">{currentUser.role}</span>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 text-slate-400 hover:text-rose-400 text-xs font-semibold transition-all duration-200"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      {/* ================= CONTENU PRINCIPAL ================= */}
      <main className="max-w-7xl mx-auto px-6 py-8 animate-fadeIn">
        
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Cartes KPI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-xl group hover:border-slate-700/60 transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl transform translate-x-8 -translate-y-8"></div>
                <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Mon Pipeline Actif</p>
                <p className="text-3xl font-extrabold text-white mt-2 font-mono tracking-tight">
                  {totalPipeline.toLocaleString('fr-FR')} <span className="text-lg text-teal-400 font-sans font-normal">FCFA</span>
                </p>
                <div className="mt-4 flex items-center text-xs text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-2"></span> Valeur potentielle estimée
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-xl group hover:border-slate-700/60 transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl transform translate-x-8 -translate-y-8"></div>
                <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Contrats Gagnés</p>
                <p className="text-3xl font-extrabold text-white mt-2 font-mono tracking-tight">
                  {wonDealsCount} <span className="text-lg text-emerald-400 font-sans font-normal">Signé(s)</span>
                </p>
                <div className="mt-4 text-xs text-slate-400">Objectif mensuel en cours de validation</div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-xl group hover:border-slate-700/60 transition-all duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl transform translate-x-8 -translate-y-8"></div>
                <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Relances en Retard</p>
                <p className="text-3xl font-extrabold text-amber-400 mt-2 font-mono tracking-tight">
                  {stats.overdueReminders} <span className="text-lg text-slate-400 font-sans font-normal">Action(s)</span>
                </p>
                <div className="mt-4 text-xs text-slate-400 flex items-center">
                  <span className={`w-1.5 h-1.5 rounded-full mr-2 ${stats.overdueReminders > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'}`}></span> 
                  {stats.overdueReminders > 0 ? 'Action(s) nécessitant attention urgente' : 'Aucun retard critique détecté'}
                </div>
              </div>
            </div>

            {/* Graphique de Pipeline Custom */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-sm">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                  <span className="w-1 h-4 bg-teal-500 rounded mr-2"></span> Répartition par étape financière
                </h3>
                <div className="space-y-5">
                  {['découverte', 'proposition', 'négociation', 'gagné'].map((stage) => {
                    const amount = deals.filter(d => d.stage === stage).reduce((sum, d) => sum + d.amount, 0);
                    const percentage = totalPipeline > 0 ? (amount / totalPipeline) * 100 : 0;
                    return (
                      <div key={stage} className="space-y-2">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="capitalize text-slate-300">{stage}</span>
                          <span className="text-slate-400 font-mono">{amount.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-800/80 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${Math.max(percentage, 3)}%` }} 
                            className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Focus commercial</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Maximisez votre efficacité en relançant les dossiers ouverts. Renseignez chaque note d'interaction pour garder l'historique de vos prospects à jour.
                  </p>
                </div>
                <div className="pt-6 border-t border-slate-800/60 mt-6">
                  <button 
                    onClick={() => setActiveTab('contacts')}
                    className="w-full py-3 px-4 rounded-xl bg-slate-800/80 text-white font-medium text-sm hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600/80 transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <span>Ouvrir mon portefeuille clients</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONTACTS */}
        {activeTab === 'contacts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            <div className={`lg:col-span-2 space-y-4 ${selectedContact ? 'hidden lg:block' : 'block'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/20 p-4 border border-slate-800/60 rounded-2xl">
                <div className="relative flex-1">
                  <input 
                    type="text" 
                    placeholder="Rechercher un prospect ou une entreprise..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all"
                  />
                </div>
                <button 
                  onClick={() => setShowContactModal(true)}
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-semibold text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transform active:scale-95 transition-all duration-200"
                >
                  + Nouveau Contact
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/20 backdrop-blur-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 text-slate-400 font-medium text-xs uppercase tracking-wider bg-slate-900/40">
                        <th className="p-4">Identité / Entreprise</th>
                        <th className="p-4">Téléphone</th>
                        <th className="p-4">Statut</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {filteredContacts.map((c) => (
                        <tr 
                          key={c._id} 
                          onClick={() => setSelectedContact(c)}
                          className={`group cursor-pointer hover:bg-slate-800/30 transition-all duration-150 ${selectedContact?._id === c._id ? 'bg-teal-500/5 border-l-2 border-l-teal-500' : ''}`}
                        >
                          <td className="p-4">
                            <div className="font-semibold text-white group-hover:text-teal-400 transition-colors">{c.firstName} {c.lastName}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{c.company || '—'}</div>
                          </td>
                          <td className="p-4 text-sm font-mono text-slate-300">{c.phone}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                              c.status === 'gagné' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                              c.status === 'en_cours' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                              c.status === 'perdu' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                              'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            }`}>
                              {c.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-4 text-right text-sm text-slate-500 group-hover:text-slate-300">
                            Voir fiche →
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Fiche contact / interactions */}
            {selectedContact ? (
              <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl space-y-6 lg:sticky lg:top-24 animate-[fadeIn_0.3s_ease-out]">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <button onClick={() => setSelectedContact(null)} className="lg:hidden text-xs text-teal-400 mb-2 block">← Retour à la liste</button>
                    <h3 className="text-xl font-bold text-white">{selectedContact.firstName} {selectedContact.lastName}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium uppercase tracking-wider">{selectedContact.company || 'Sans entreprise'}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedContact(null)}
                    className="text-slate-400 hover:text-white hidden lg:block text-sm bg-slate-800 w-7 h-7 rounded-full flex items-center justify-center border border-slate-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 font-mono text-xs space-y-1 text-slate-300">
                  <div><span className="text-slate-500">TEL:</span> {selectedContact.phone}</div>
                  <div><span className="text-slate-500">MAIL:</span> {selectedContact.email || 'Non renseigné'}</div>
                </div>

                {/* Saisie d'une interaction */}
                <form onSubmit={handleAddInteraction} className="space-y-4 bg-slate-900/60 p-4 border border-slate-800/80 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Journaliser un échange</span>
                    <select 
                      value={newInteraction.type}
                      onChange={(e) => setNewInteraction({ ...newInteraction, type: e.target.value })}
                      className="bg-slate-950 border border-slate-800 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-teal-500 text-slate-200 capitalize"
                    >
                      <option value="appel">Appel</option>
                      <option value="email">Email</option>
                      <option value="rdv">Rendez-vous</option>
                    </select>
                  </div>
                  <textarea 
                    placeholder="Notes de l'échange (ex: Intéressé, demande de devis...)" 
                    value={newInteraction.notes}
                    onChange={(e) => setNewInteraction({ ...newInteraction, notes: e.target.value })}
                    rows="3"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500"
                  ></textarea>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Planifier une relance</label>
                      <input 
                        type="date" 
                        value={newInteraction.nextActionDate}
                        onChange={(e) => setNewInteraction({ ...newInteraction, nextActionDate: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 text-xs rounded-lg p-2 text-slate-300 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <button 
                      type="submit"
                      className="w-full h-9 bg-teal-500 text-slate-950 text-xs font-bold rounded-lg hover:opacity-90 transition-all self-end"
                    >
                      Enregistrer
                    </button>
                  </div>
                </form>

                {/* Fil d'actualité chronologique */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mr-2"></span> Historique des échanges
                  </h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {interactions.length === 0 ? (
                      <p className="text-xs text-slate-600 italic">Aucun échange pour le moment.</p>
                    ) : (
                      interactions.map((i) => (
                        <div key={i._id} className="relative pl-4 border-l border-slate-800 space-y-1">
                          <div className="absolute w-2 h-2 rounded-full bg-slate-700 left-[-4.5px] top-1.5"></div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-teal-400 capitalize">{i.type}</span>
                            <span className="text-slate-500 font-mono">
                              {i.createdAt ? new Date(i.createdAt).toLocaleDateString('fr-FR') : '—'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/30 p-2 rounded-lg border border-slate-800/40">{i.notes}</p>
                          {i.nextActionDate && (
                            <div className="text-[10px] text-amber-400 font-medium">⏰ Relance prévue le : {new Date(i.nextActionDate).toLocaleDateString('fr-FR')}</div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="hidden lg:flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-slate-800 text-center h-64 bg-slate-900/5">
                <p className="text-sm text-slate-500">Sélectionnez un prospect pour ouvrir sa fiche historique et planifier des actions.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: KANBAN */}
        {activeTab === 'kanban' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button 
                onClick={() => setShowDealModal(true)}
                className="bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-semibold text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transform active:scale-95 transition-all duration-200"
              >
                + Nouvelle Opportunité
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start overflow-x-auto pb-4">
              {['découverte', 'proposition', 'négociation', 'gagné'].map((stage) => {
                const stageDeals = deals.filter(d => d.stage === stage);
                return (
                  <div key={stage} className="rounded-2xl border border-slate-800/80 bg-slate-950 p-4 space-y-4 min-w-[250px]">
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300 capitalize">{stage}</span>
                      <span className="bg-slate-900 px-2 py-0.5 border border-slate-800 rounded-md text-[11px] font-mono font-bold text-teal-400">{stageDeals.length}</span>
                    </div>

                    <div className="space-y-3">
                      {stageDeals.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-600 border border-dashed border-slate-900 rounded-xl">Aucun deal</div>
                      ) : (
                        stageDeals.map((deal) => (
                          <div 
                            key={deal._id} 
                            className="group relative rounded-xl border border-slate-800 bg-slate-900/30 p-4 space-y-3 hover:border-slate-700/60 shadow-md hover:shadow-xl transition-all duration-200"
                          >
                            <div>
                              <h4 className="font-bold text-sm text-white group-hover:text-teal-400 transition-colors">{deal.title}</h4>
                              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                {deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName} (${deal.contact.company || '—'})` : '—'}
                              </p>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-mono font-bold text-slate-200">{deal.amount.toLocaleString('fr-FR')} FCFA</span>
                              <span className="text-[10px] font-mono bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">{deal.probability}%</span>
                            </div>

                            {/* Controles Kanban */}
                            <div className="flex items-center justify-end space-x-1 pt-2 border-t border-slate-800/50 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              {stage !== 'découverte' && (
                                <button 
                                  onClick={() => {
                                    const stages = ['découverte', 'proposition', 'négociation', 'gagné'];
                                    moveDealStage(deal._id, stages[stages.indexOf(stage) - 1]);
                                  }}
                                  className="text-[11px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded hover:text-white"
                                >
                                  ◀
                                </button>
                              )}
                              {stage !== 'gagné' && (
                                <button 
                                  onClick={() => {
                                    const stages = ['découverte', 'proposition', 'négociation', 'gagné'];
                                    moveDealStage(deal._id, stages[stages.indexOf(stage) + 1]);
                                  }}
                                  className="text-[11px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded hover:text-white"
                                >
                                  ▶
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* ================= MODAL AJOUT CONTACT ================= */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-900 p-6 shadow-2xl shadow-slate-950 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                  <span className="text-teal-400 text-sm">＋</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-none">Nouveau Prospect</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Renseignez les informations de contact</p>
                </div>
              </div>
              <button onClick={() => setShowContactModal(false)} className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-sm">✕</button>
            </div>
            
            <form onSubmit={handleCreateContact} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Prénom *</label>
                  <input
                    type="text" required
                    placeholder="ex: Landry"
                    value={newContact.firstName}
                    onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all duration-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Nom *</label>
                  <input
                    type="text" required
                    placeholder="ex: Maboukou"
                    value={newContact.lastName}
                    onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all duration-200"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Entreprise</label>
                <input
                  type="text"
                  placeholder="ex: Groupe BGFI, Société Nationale..."
                  value={newContact.company}
                  onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all duration-200"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Téléphone *</label>
                <input
                  type="text" required
                  placeholder="ex: +242 06 000 00 00"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 font-mono focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all duration-200"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Adresse Email <span className="text-slate-600 normal-case">(optionnel)</span></label>
                <input
                  type="email"
                  placeholder="ex: contact@entreprise.com"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all duration-200"
                />
              </div>

              <div className="flex space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 text-sm text-slate-400 hover:text-white transition-all duration-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold text-sm hover:opacity-90 active:scale-95 transition-all duration-200 shadow-lg shadow-teal-500/20"
                >
                  Créer le lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL AJOUT OPPORTUNITE (DEAL) ================= */}
      {showDealModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Créer une opportunité (Deal)</h3>
              <button onClick={() => setShowDealModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            
            <form onSubmit={handleCreateDeal} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Titre de l'opportunité *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ex: Refonte Site E-Commerce" 
                  value={newDeal.title} 
                  onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Associer à un Prospect (Contact) *</label>
                <select 
                  required
                  value={newDeal.contact}
                  onChange={(e) => setNewDeal({ ...newDeal, contact: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500 text-slate-200"
                >
                  <option value="">-- Sélectionner un contact --</option>
                  {contacts.map(c => (
                    <option key={c._id} value={c._id}>{c.firstName} {c.lastName} ({c.company || 'Sans entreprise'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Montant (FCFA) *</label>
                <input 
                  type="number" 
                  required 
                  min="0"
                  placeholder="Montant du deal" 
                  value={newDeal.amount} 
                  onChange={(e) => setNewDeal({ ...newDeal, amount: e.target.value })} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500 font-mono" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Étape initiale</label>
                  <select 
                    value={newDeal.stage}
                    onChange={(e) => setNewDeal({ ...newDeal, stage: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500 text-slate-200 capitalize"
                  >
                    <option value="découverte">Découverte</option>
                    <option value="proposition">Proposition</option>
                    <option value="négociation">Négociation</option>
                    <option value="gagné">Gagné</option>
                    <option value="perdu">Perdu</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Probabilité (%)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={newDeal.probability} 
                    onChange={(e) => setNewDeal({ ...newDeal, probability: Number(e.target.value) })} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500 font-mono" 
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowDealModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-800 text-sm text-slate-400 hover:text-white">Annuler</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold text-sm">Créer l'opportunité</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL PROFIL UTILISATEUR ================= */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <form onSubmit={handleUpdateProfile} className="w-full max-w-sm rounded-2xl border border-slate-700/60 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Mon Profil</h3>
              <button type="button" onClick={() => setShowProfileModal(false)} className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors">✕</button>
            </div>
            
            <div className="flex flex-col items-center space-y-2 py-2">
              <div className="relative group cursor-pointer">
                {profileAvatar ? (
                  <img src={profileAvatar} alt="Aperçu" className="w-20 h-20 rounded-full object-cover border-2 border-teal-500/40 group-hover:opacity-75 transition-opacity" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-2xl font-black text-slate-950 group-hover:opacity-75 transition-opacity">
                    {profileName.charAt(0).toUpperCase()}
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white font-bold cursor-pointer select-none">
                  Modifier
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>
              <p className="text-[10px] text-slate-500">Image carrée recommandée · max 2 Mo</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Nom Complet</label>
              <input
                type="text" required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 transition-all duration-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Adresse Email</label>
              <input
                type="text" disabled
                value={currentUser.email}
                className="w-full bg-slate-950/60 border border-slate-800/60 rounded-xl px-3.5 py-2.5 text-sm text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 text-xs text-slate-400 hover:text-white transition-all duration-200"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={profileSaving}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold text-xs hover:opacity-90 disabled:opacity-40 transition-all duration-200 shadow-lg shadow-teal-500/20"
              >
                {profileSaving ? 'Enregistrement...' : 'Sauvegarder'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
