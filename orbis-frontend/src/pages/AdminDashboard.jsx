import React, { useState, useEffect } from 'react';
import ThemeToggle from '../components/ThemeToggle';
import { useToast } from '../components/UI/Toast';
import { Plus, Rocket, AlertTriangle, User, Unlock, UserX, Key, X, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/crm/admin` 
  : "http://localhost:5001/api/crm/admin";

const API_AUTH_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/auth` 
  : "http://localhost:5001/api/auth";

export default function AdminDashboard() {
  const { showToast } = useToast();

  // --- États Réels ---
  const [stats, setStats] = useState({ totalPipeline: 0, activeDealsCount: 0, winRate: 0 });
  const [commercials, setCommercials] = useState([]);
  const [allDeals, setAllDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- États des Modals & Actions ---
  const [showDealModal, setShowDealModal]     = useState(false);
  const [showUserModal, setShowUserModal]     = useState(false);
  const [confirmModal, setConfirmModal]       = useState(null); // { message, onConfirm }
  const [selectedDeal, setSelectedDeal]       = useState(null);
  const [newAssigneeId, setNewAssigneeId]     = useState('');
  const [actionLoading, setActionLoading]     = useState(false);

  // --- Formulaires de création ---
  const [newDealData, setNewDealData] = useState({ title: '', company: '', amount: '', assignedTo: '' });
  const [newUserData, setNewUserData] = useState({ name: '', email: '', password: '', role: 'commercial' });

  // --- États Audit & Objectifs ---
  const [auditLogs, setAuditLogs]   = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [goalValue, setGoalValue]   = useState('');
  const [goalPeriod, setGoalPeriod] = useState('monthly'); // weekly | monthly | yearly
  const [goalSaving, setGoalSaving] = useState(false);
  const [settings, setSettings]     = useState({ weeklyGoal: 0, monthlyGoal: 0, yearlyGoal: 0 });

  // --- Pagination & Filtres ---
  const [dealPage, setDealPage]     = useState(1);
  const DEALS_PER_PAGE              = 8;
  const [teamSearch, setTeamSearch] = useState('');
  const [teamRoleFilter, setTeamRoleFilter] = useState('all');
  const [dealSearch, setDealSearch] = useState('');

  // --- États de Profil Utilisateur ---
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || { name: 'Directeur', email: '', role: 'admin', avatarUrl: '' };
    } catch (e) {
      return { name: 'Directeur', email: '', role: 'admin', avatarUrl: '' };
    }
  });

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profileAvatar, setProfileAvatar] = useState(currentUser.avatarUrl || '');
  const [profileSaving, setProfileSaving] = useState(false);

  // --- Configuration Header de Sécurité (JWT) ---
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  // === CHARGEMENT DES DONNÉES ENTRÉES ===
  const fetchAdminData = async () => {
    try {
      const [resStats, resCommercials, resDeals] = await Promise.all([
        fetch(`${API_URL}/stats`, getAuthHeader()).then(r => {
          if (!r.ok) throw new Error("Accès refusé ou serveur corrompu.");
          return r.json();
        }),
        fetch(`${API_URL}/commercials`, getAuthHeader()).then(r => r.json()),
        fetch(`${API_URL}/deals/global`, getAuthHeader()).then(r => r.json())
      ]);

      setStats(resStats);
      setCommercials(resCommercials);
      setAllDeals(resDeals);
    } catch (err) {
      console.error("Erreur d'administration :", err);
      setError(err.message || "Erreur de synchronisation avec le serveur Orbis.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    fetchAuditLogs();
    fetchSettings();
  }, []);

  // === CHARGEMENT DU JOURNAL D'AUDIT ===
  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const res = await fetch(`${API_URL}/logs`, getAuthHeader());
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch {}
    finally { setAuditLoading(false); }
  };

  // === CHARGEMENT DES PARAMÈTRES (objectifs) ===
  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/settings`, getAuthHeader());
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch {}
  };

  // === ACTION : MISE À JOUR DE L'OBJECTIF (multi-période) ===
  const handleUpdateGoal = async (e) => {
    e.preventDefault();
    const val = Number(goalValue);
    if (!val || val <= 0) return showToast("Entrez un objectif valide.", "warning");
    setGoalSaving(true);
    try {
      const res = await fetch(`${API_URL}/settings/goal`, {
        method: 'PUT',
        ...getAuthHeader(),
        body: JSON.stringify({ goal: val, period: goalPeriod })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        setGoalValue('');
        fetchSettings();
        fetchAuditLogs();
      } else {
        showToast(data.error || "Erreur.", "error");
      }
    } catch { showToast("Erreur réseau.", "error"); }
    finally { setGoalSaving(false); }
  };

  // === ACTION : CHANGER LE RÔLE D'UN MEMBRE ===
  const handleChangeRole = async (userId, newRole) => {
    try {
      const res = await fetch(`${API_URL}/users/${userId}/role`, {
        method: 'PUT',
        ...getAuthHeader(),
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        fetchAdminData();
        fetchAuditLogs();
      } else {
        showToast(data.error || "Erreur.", "error");
      }
    } catch { showToast("Erreur réseau.", "error"); }
  };

  // === ACTION : CRÉER UN LEAD (POST) ===
  const handleCreateDeal = async (e) => {
    e.preventDefault();
    if (!newDealData.title || !newDealData.company || !newDealData.amount || !newDealData.assignedTo) {
      showToast("Veuillez remplir tous les champs requis.", "warning");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/deals`, {
        method: 'POST',
        ...getAuthHeader(),
        body: JSON.stringify(newDealData)
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Lead global créé avec succès !", "success");
        setShowDealModal(false);
        setNewDealData({ title: '', company: '', amount: '', assignedTo: '' });
        fetchAdminData(); // Recharger les données et les compteurs
      } else {
        showToast(data.error || "Erreur lors de la création du lead.", "error");
      }
    } catch (err) {
      showToast("Erreur réseau.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // === ACTION : CRÉER/INVITER UN COMMERCIAL (POST) ===
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserData.name || !newUserData.email || !newUserData.password) {
      showToast("Veuillez remplir tous les champs requis.", "warning");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        ...getAuthHeader(),
        body: JSON.stringify(newUserData)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Commercial "${data.name}" intégré avec succès !`, "success");
        setShowUserModal(false);
        setNewUserData({ name: '', email: '', password: '', role: 'commercial' });
        fetchAdminData(); // Mettre à jour l'équipe
      } else {
        showToast(data.error || "Erreur lors de l'intégration.", "error");
      }
    } catch (err) {
      showToast("Erreur réseau.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // === ACTION : SUSPENDRE / RÉACTIVER UN COMMERCIAL (PUT) ===
  const handleToggleUserStatus = async (user) => {
    const actionName = user.isActive ? "suspendre" : "réactiver";
    setConfirmModal({
      message: `Voulez-vous vraiment ${actionName} le compte de ${user.name} ?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/users/${user._id}/toggle-status`, {
            method: 'PUT',
            ...getAuthHeader()
          });
          const data = await res.json();
          if (res.ok) {
            showToast(data.message, "success");
            fetchAdminData();
            fetchAuditLogs();
          } else {
            showToast(data.error || "Erreur.", "error");
          }
        } catch { showToast("Erreur réseau.", "error"); }
        setConfirmModal(null);
      }
    });
  };

  // === ACTION : MUTATION DE DOSSIER (PUT) ===
  const handleReassignDeal = async (e) => {
    e.preventDefault();
    if (!newAssigneeId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/deals/${selectedDeal._id}/reassign`, {
        method: 'PUT',
        ...getAuthHeader(),
        body: JSON.stringify({ newCommercialId: newAssigneeId })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Dossier transféré avec succès !", "success");
        setSelectedDeal(null);
        setNewAssigneeId('');
        fetchAdminData();
      } else {
        showToast(data.error || "Erreur de transfert.", "error");
      }
    } catch (err) {
      showToast("Erreur réseau.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // === ACTION : SUPPRIMER UN DEAL (DELETE) ===
  const handleDeleteDeal = async (id) => {
    setConfirmModal({
      message: "Retirer définitivement cette opportunité du marché ?",
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/deals/${id}`, {
            method: 'DELETE',
            ...getAuthHeader()
          });
          const data = await res.json();
          if (res.ok) {
            showToast("Lead supprimé avec succès.", "success");
            fetchAdminData();
            fetchAuditLogs();
          } else {
            showToast(data.error || "Erreur de suppression.", "error");
          }
        } catch { showToast("Erreur réseau.", "error"); }
        setConfirmModal(null);
      }
    });
  };

  // === ACTION : MISE À JOUR DU PROFIL ===
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileName.trim()) {
      showToast("Le nom est requis.", "warning");
      return;
    }
    setProfileSaving(true);
    try {
      const response = await fetch(`${API_AUTH_URL}/profile`, {
        method: 'PUT',
        ...getAuthHeader(),
        body: JSON.stringify({ name: profileName, avatarUrl: profileAvatar })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('user', JSON.stringify(data.user));
        setCurrentUser(data.user);
        setShowProfileModal(false);
        showToast("Profil direction mis à jour !", "success");
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

  // Écran d'attente Premium
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 rounded-xl border-2 border-t-emerald-400 border-slate-800 animate-spin"></div>
        <p className="text-xs font-mono tracking-widest text-slate-500 uppercase animate-pulse">Initialisation de la salle de contrôle...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 text-2xl mb-4"><AlertTriangle className="w-8 h-8" /></div>
        <h3 className="text-xl font-bold text-white">Échec d'authentification de sécurité</h3>
        <p className="text-sm text-slate-400 max-w-sm mt-2">{error}</p>
        <p className="text-xs text-slate-500 max-w-xs mt-1">Assurez-vous d'avoir les droits de direction requis pour accéder au QG Admin.</p>
        <button onClick={() => { localStorage.clear(); window.location.href = '/'; }} className="mt-6 px-5 py-2.5 bg-slate-900 border border-slate-800 text-xs rounded-xl hover:text-white transition-all">Retour au login</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-slate-950">
      
      {/* ================= BARRE DE NAVIGATION ADMIN ================= */}
      <nav className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => fetchAdminData()}>
            <img src="/outpout/wordmark/wordmark-transparent.png" alt="Orbis CRM" className="h-8 object-contain transform group-hover:scale-102 transition-transform duration-200" />
          </div>
          
          <div className="flex items-center space-x-3">
            <ThemeToggle />

            <div 
              onClick={() => { setProfileName(currentUser.name); setProfileAvatar(currentUser.avatarUrl || ''); setShowProfileModal(true); }}
              className="flex items-center space-x-2.5 bg-slate-900 hover:bg-slate-850/80 border border-slate-800 rounded-xl px-3 py-1.5 cursor-pointer transition-all duration-200 select-none"
            >
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt="Avatar" className="w-6 h-6 rounded-full object-cover border border-emerald-500/30" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[10px] font-black text-slate-950">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200 leading-none">{currentUser.name}</span>
                <span className="text-[9px] text-emerald-400 font-mono capitalize leading-none mt-1">{currentUser.role}</span>
              </div>
            </div>

            <button onClick={() => { localStorage.clear(); window.location.href = '/'; }} className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 text-slate-400 hover:text-rose-400 text-xs font-semibold transition-all duration-200">Déconnexion</button>
          </div>
        </div>
      </nav>

      {/* ================= CONTENU SUPERVISION MACRO ================= */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-[fadeIn_0.4s_ease-out]">
        
        {/* EN-TÊTE AVEC BOUTONS D'ACTIONS RAPIDES */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-800/60 pb-6 gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              ORBIS CRM <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono">QG DIRECTEUR</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">Supervision de l'équipe commerciale, arbitrages de portefeuilles et injection de leads en direct.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowUserModal(true)}
              className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Intégrer un Agent
            </button>
            <button 
              onClick={() => setShowDealModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:opacity-90 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              Injecter un Marché
            </button>
          </div>
        </div>

        {/* GRILLE ANALYTIQUE CONSOLIDÉE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 p-6 relative overflow-hidden shadow-sm dark:shadow-none">
            <p className="text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">Chiffre d'Affaires Global (Pipeline)</p>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2 font-mono tracking-tight">{stats.totalPipeline?.toLocaleString('fr-FR')} <span className="text-sm font-sans text-teal-600 dark:text-emerald-400">FCFA</span></p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3">Cumul de l'intégralité des portefeuilles de l'équipe</p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 p-6 shadow-sm dark:shadow-none">
            <p className="text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">Opportunités Actives</p>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2 font-mono tracking-tight">{stats.activeDealsCount} <span className="text-sm font-sans text-slate-500 dark:text-slate-400">Négociations</span></p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3">Dossiers en cours de traitement sur le terrain</p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950 p-6 shadow-sm dark:shadow-none">
            <p className="text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">Taux de Conversion (Win Rate)</p>
            <p className="text-3xl font-extrabold text-teal-600 dark:text-emerald-400 mt-2 font-mono tracking-tight">{stats.winRate} <span className="text-sm font-sans text-slate-500 dark:text-slate-400">%</span></p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3">Moyenne de signature d'affaires globale</p>
          </div>
        </div>

        {/* SECTION DOUBLE COMPOSANT : SUIVI DES COMMERCIAUX & TABLEAU DE STRATÉGIE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 1. PERFORMANCES DE L'ÉQUIPE */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2"></span> Activité de l'équipe
            </h3>

            {/* Filtres équipe */}
            <div className="flex gap-2">
              <input
                value={teamSearch}
                onChange={e => setTeamSearch(e.target.value)}
                placeholder="Rechercher un membre..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-teal-500/40"
              />
              <select
                value={teamRoleFilter}
                onChange={e => setTeamRoleFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-400 focus:outline-none"
              >
                <option value="all">Tous rôles</option>
                <option value="commercial">Commercial</option>
                <option value="marketing">Marketing</option>
                <option value="rh">RH</option>
                <option value="tech">Tech</option>
                <option value="direction">Direction</option>
              </select>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {commercials
                .filter(c => {
                  const matchSearch = c.name.toLowerCase().includes(teamSearch.toLowerCase()) || c.email.toLowerCase().includes(teamSearch.toLowerCase());
                  const matchRole = teamRoleFilter === 'all' || c.role === teamRoleFilter;
                  return matchSearch && matchRole;
                })
                .map(c => (
                  <div key={c._id} className="p-3 bg-slate-950 border border-slate-800/60 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="relative">
                          {c.avatarUrl ? (
                            <img src={c.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-slate-800" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${c.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-slate-200 leading-none">{c.name}</p>
                          <p className="text-[9px] text-slate-500 font-mono mt-0.5 max-w-[110px] truncate">{c.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <span className="text-xs font-bold font-mono text-emerald-400">{c.dealCount || 0}</span>
                          <p className="text-[9px] text-slate-500 uppercase tracking-tight">Deals</p>
                        </div>
                        <button
                          onClick={() => handleToggleUserStatus(c)}
                          title={c.isActive ? "Suspendre" : "Réactiver"}
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] transition-all border ${
                            c.isActive
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                        >
                          {c.isActive ? <UserX className="w-4 h-4" /> : <Key className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Changement de rôle */}
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[9px] text-slate-600 uppercase tracking-wider">Rôle :</span>
                      <select
                        value={c.role || 'commercial'}
                        onChange={e => handleChangeRole(c._id, e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-md px-2 py-0.5 text-[10px] text-slate-300 focus:outline-none focus:border-teal-500/40 cursor-pointer"
                      >
                        <option value="commercial">Commercial / Vente</option>
                        <option value="marketing">Marketing</option>
                        <option value="rh">Ressources Humaines (RH)</option>
                        <option value="autre">Autre service</option>
                        <option value="admin">Administrateur</option>
                      </select>
                    </div>
                  </div>
                ))
              }
              {commercials.filter(c => {
                const matchSearch = c.name.toLowerCase().includes(teamSearch.toLowerCase()) || c.email.toLowerCase().includes(teamSearch.toLowerCase());
                const matchRole = teamRoleFilter === 'all' || c.role === teamRoleFilter;
                return matchSearch && matchRole;
              }).length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">Aucun membre trouvé.</p>
              )}
            </div>
          </div>


          {/* 2. TABLEAU DE RÉATTRIBUTION ET SURVEILLANCE GLOBALE */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/20 p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-base font-bold text-white">Flux et Attribution des Leads Entreprise</h3>
              <input
                value={dealSearch}
                onChange={e => { setDealSearch(e.target.value); setDealPage(1); }}
                placeholder="Rechercher un lead..."
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-teal-500/40 w-48"
              />
            </div>
            
            <div className="overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                    <th className="p-3.5">Projet / Client</th>
                    <th className="p-3.5">Valeur</th>
                    <th className="p-3.5">Commercial Assigné</th>
                    <th className="p-3.5 text-right">Contrôle Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {allDeals
                    .filter(d => d.title?.toLowerCase().includes(dealSearch.toLowerCase()) || d.company?.toLowerCase().includes(dealSearch.toLowerCase()))
                    .slice((dealPage - 1) * DEALS_PER_PAGE, dealPage * DEALS_PER_PAGE)
                    .map(d => (
                      <tr key={d._id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3.5">
                          <p className="font-bold text-white">{d.title}</p>
                          <p className="text-[10px] text-slate-500">{d.company}</p>
                        </td>
                        <td className="p-3.5 font-mono text-slate-300 font-medium">{d.amount?.toLocaleString('fr-FR')} F</td>
                        <td className="p-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 border rounded-md text-xs ${
                            d.assignedTo ? 'text-slate-400 bg-slate-950 border-slate-800' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                          }`}>
                            {d.assignedTo ? <span className="inline-flex items-center gap-2"><User className="w-4 h-4" />{d.assignedTo?.name}</span> : <span className="inline-flex items-center gap-2"><Unlock className="w-4 h-4" />Public (non assigné)</span>}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setSelectedDeal(d)}
                              className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-teal-400 hover:text-white hover:border-teal-500/20 hover:bg-teal-500/5 text-[11px] font-bold rounded-lg transition-all"
                            >
                              Transférer
                            </button>
                            <button
                              onClick={() => handleDeleteDeal(d._id)}
                              className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-[11px] font-bold rounded-lg transition-all"
                            >
                              Retirer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                  {allDeals.filter(d => d.title?.toLowerCase().includes(dealSearch.toLowerCase()) || d.company?.toLowerCase().includes(dealSearch.toLowerCase())).length === 0 && (
                    <tr><td colSpan="4" className="p-8 text-center text-slate-500 font-mono">Aucun lead actif sur le marché.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {allDeals.filter(d => d.title?.toLowerCase().includes(dealSearch.toLowerCase()) || d.company?.toLowerCase().includes(dealSearch.toLowerCase())).length > DEALS_PER_PAGE && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-[10px] text-slate-500">
                  Page {dealPage} / {Math.ceil(allDeals.filter(d => d.title?.toLowerCase().includes(dealSearch.toLowerCase()) || d.company?.toLowerCase().includes(dealSearch.toLowerCase())).length / DEALS_PER_PAGE)}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setDealPage(p => Math.max(1, p - 1))}
                    disabled={dealPage === 1}
                    className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg disabled:opacity-40 transition-all"
                  >
                    ← Préc.
                  </button>
                  <button
                    onClick={() => setDealPage(p => p + 1)}
                    disabled={dealPage >= Math.ceil(allDeals.filter(d => d.title?.toLowerCase().includes(dealSearch.toLowerCase()) || d.company?.toLowerCase().includes(dealSearch.toLowerCase())).length / DEALS_PER_PAGE)}
                    className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg disabled:opacity-40 transition-all"
                  >
                    Suiv. →
                  </button>
                </div>
              </div>
            )}
          </div>


        </div>
      </main>

      {/* ================= SCREEN SLIDE OVER / MODAL DE RÉATTRIBUTION DIRECTE ================= */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <form onSubmit={handleReassignDeal} className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Transférer le dossier</h3>
              <p className="text-xs text-slate-400 mt-1">Vous réattribuez actuellement l'opportunité <span className="text-emerald-400 font-bold">{selectedDeal.title}</span>.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase">Choisir le nouveau commercial de destination</label>
              <select 
                required
                value={newAssigneeId}
                onChange={(e) => setNewAssigneeId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-sm rounded-xl p-3 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Sélectionner un profil --</option>
                {commercials
                  .filter(c => c._id !== selectedDeal.assignedTo?._id && c.isActive)
                  .map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))
                }
              </select>
            </div>

            <div className="flex space-x-3 pt-2">
              <button 
                type="button" 
                onClick={() => setSelectedDeal(null)} 
                className="flex-1 py-2 rounded-xl border border-slate-800 text-xs text-slate-400 hover:text-white"
              >
                Annuler
              </button>
              <button 
                type="submit" 
                disabled={actionLoading}
                className="flex-1 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:opacity-90 disabled:opacity-40"
              >
                {actionLoading ? "Mutation..." : "Confirmer le transfert"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL 1 : INJECTER UN DEAL ================= */}
      {showDealModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateDeal} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Injecter un Nouveau Marché</h3>
              <button type="button" onClick={() => setShowDealModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase">Titre du Projet *</label>
                <input 
                  type="text" 
                  placeholder="ex: Licences Cloud Office & CRM" 
                  required 
                  value={newDealData.title} 
                  onChange={e => setNewDealData({...newDealData, title: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
              
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase">Entreprise Cliente *</label>
                <input 
                  type="text" 
                  placeholder="ex: Groupe BGFI Congo" 
                  required 
                  value={newDealData.company} 
                  onChange={e => setNewDealData({...newDealData, company: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
              
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase">Budget Estimé (FCFA) *</label>
                <input 
                  type="number" 
                  placeholder="ex: 15000000" 
                  required 
                  value={newDealData.amount} 
                  onChange={e => setNewDealData({...newDealData, amount: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
              
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase">Attribuer Directly À *</label>
                <select 
                  required 
                  value={newDealData.assignedTo} 
                  onChange={e => setNewDealData({...newDealData, assignedTo: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">-- Sélectionner le commercial cible --</option>
                  {commercials.filter(c => c.isActive).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setShowDealModal(false)} className="flex-1 py-2.5 border border-slate-800 rounded-xl text-xs text-slate-400">Annuler</button>
              <button type="submit" disabled={actionLoading} className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold rounded-xl text-xs">{actionLoading ? "Création..." : "Lancer le Deal"}</button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL 2 : RECRUTER UN COMMERCIAL ================= */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateUser} className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Créer un Agent / Commercial</h3>
              <button type="button" onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase">Nom de l'Agent *</label>
                <input 
                  type="text" 
                  placeholder="ex: Landry Maboukou" 
                  required 
                  value={newUserData.name} 
                  onChange={e => setNewUserData({...newUserData, name: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
              
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase">Adresse Email Professionnelle *</label>
                <input 
                  type="email" 
                  placeholder="ex: landry@orbis-crm.com" 
                  required 
                  value={newUserData.email} 
                  onChange={e => setNewUserData({...newUserData, email: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
              
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase">Mot de Passe Provisoire *</label>
                <input 
                  type="password" 
                  placeholder="Minimum 6 caractères" 
                  required 
                  value={newUserData.password} 
                  onChange={e => setNewUserData({...newUserData, password: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase">Rôle / Fonction *</label>
                <select 
                  value={newUserData.role || 'commercial'} 
                  onChange={e => setNewUserData({...newUserData, role: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="commercial">Commercial / Vente</option>
                  <option value="marketing">Marketing</option>
                  <option value="rh">Ressources Humaines (RH)</option>
                  <option value="autre">Autre service</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 py-2.5 border border-slate-800 rounded-xl text-xs text-slate-400">Annuler</button>
              <button type="submit" disabled={actionLoading} className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold rounded-xl text-xs">{actionLoading ? "Création..." : "Créer l'Accès"}</button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL DE PROFIL UTILISATEUR ================= */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <form onSubmit={handleUpdateProfile} className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Mon Profil Direction</h3>
              <button type="button" onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="flex flex-col items-center space-y-3 py-2">
              <div className="relative group cursor-pointer">
                {profileAvatar ? (
                  <img src={profileAvatar} alt="Avatar Preview" className="w-20 h-20 rounded-full object-cover border-2 border-emerald-500/40 group-hover:opacity-75 transition-opacity" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-2xl font-black text-slate-950 group-hover:opacity-75 transition-opacity">
                    {profileName.charAt(0).toUpperCase()}
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white font-bold select-none cursor-pointer">
                  Changer
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Recommandé : image carrée, max 2 Mo</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase">Nom Complet</label>
              <input 
                type="text" 
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-sm rounded-xl p-3 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase">Adresse Email</label>
              <input 
                type="text" 
                disabled
                value={currentUser.email}
                className="w-full bg-slate-950/60 border border-slate-800/80 text-sm rounded-xl p-3 text-slate-500 focus:outline-none cursor-not-allowed"
              />
            </div>

            <div className="flex space-x-3 pt-2">
              <button 
                type="button" 
                onClick={() => setShowProfileModal(false)} 
                className="flex-1 py-2.5 rounded-xl border border-slate-800 text-xs text-slate-400 hover:text-white"
              >
                Annuler
              </button>
              <button 
                type="submit" 
                disabled={profileSaving}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-bold text-xs hover:opacity-90 disabled:opacity-40"
              >
                {profileSaving ? "Enregistrement..." : "Sauvegarder"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= SECTION CONFIGURATION & AUDIT ================= */}
      <section className="max-w-7xl mx-auto px-6 pb-12 grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* — Objectif Mensuel — */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6 space-y-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Objectif Mensuel de Revenue
          </h3>
          <p className="text-xs text-slate-400">Définissez le cap de chiffre d'affaires que l'équipe doit atteindre ce mois-ci. L'objectif s'affiche dans le dashboard des commerciaux.</p>
          <form onSubmit={handleUpdateGoal} className="flex gap-3">
            <input
              type="number"
              min="1"
              value={monthlyGoal}
              onChange={e => setMonthlyGoal(e.target.value)}
              placeholder="ex : 5 000 000"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all"
            />
            <button
              type="submit"
              disabled={goalSaving}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-all shadow-amber-500/20 shadow-md whitespace-nowrap"
            >
              {goalSaving ? "Sauvegarde..." : "Appliquer"}
            </button>
          </form>
        </div>

        {/* — Journal d’Audit — */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6 space-y-4">
            <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              Journal d'Audit
            </h3>
            <button onClick={fetchAuditLogs} className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded-lg border border-slate-800 hover:border-slate-700 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          </div>

          {auditLoading ? (
            <div className="flex items-center justify-center h-24 text-slate-500">
              <div className="w-5 h-5 border-2 border-t-rose-400 border-slate-700 rounded-full animate-spin"></div>
            </div>
          ) : auditLogs.length === 0 ? (
            <p className="text-xs text-slate-600 italic text-center py-4">Aucune action enregistrée.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {auditLogs.map(log => (
                <div key={log._id} className={`flex items-start gap-3 p-2.5 rounded-xl border ${
                  log.severity === 'high'    ? 'bg-rose-500/5 border-rose-500/20' :
                  log.severity === 'warning' ? 'bg-amber-500/5 border-amber-500/20' :
                  'bg-slate-900/60 border-slate-800/60'
                }`}>
                  <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    log.severity === 'high' ? 'bg-rose-400' :
                    log.severity === 'warning' ? 'bg-amber-400' : 'bg-slate-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 leading-snug">{log.actionDescription}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                      {log.actorName} &bull; {new Date(log.createdAt).toLocaleString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================= MODAL CONFIRMATION PERSONNALISÉE ================= */}
      {confirmModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-lg flex-shrink-0"><AlertTriangle className="w-6 h-6" /></div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Confirmation requise</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{confirmModal.message}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 border border-slate-800 rounded-xl text-xs text-slate-400 hover:text-white hover:border-slate-700 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold rounded-xl text-xs hover:opacity-90 transition-all"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
