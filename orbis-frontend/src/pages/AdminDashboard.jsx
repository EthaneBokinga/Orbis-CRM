import React, { useState, useEffect } from 'react';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBadge from '../components/NotificationBadge';
import ChatPanel from '../components/ChatPanel';
import { useToast } from '../components/UI/Toast';
import { Plus, Rocket, AlertTriangle, User, Unlock, UserX, Key, X, RefreshCw, TrendingUp, TrendingDown, BarChart3, LayoutDashboard, Users, Briefcase, Settings, MessageSquare, Medal, Award, Trophy, Clock, ChevronLeft, ChevronRight, Download, FileText, Printer, Calendar, DollarSign, Search } from 'lucide-react';
import AdminCharts from '../components/AdminCharts';
import CalendarPanel from '../components/CalendarPanel';
import InvoicePanel from '../components/InvoicePanel';
import GlobalSearch from '../components/GlobalSearch';

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
  const [newDealData, setNewDealData] = useState({ title: '', company: '', amount: '', assignedTo: '', contactFirstName: '', contactLastName: '', phone: '', email: '', address: '' });
  const [newUserData, setNewUserData] = useState({ name: '', email: '', password: '', role: 'commercial' });

  // --- États Audit & Objectifs ---
  const [auditLogs, setAuditLogs]   = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilterActor, setAuditFilterActor] = useState('');
  const [goalValue, setGoalValue]   = useState('');
  const [goalPeriod, setGoalPeriod] = useState('monthly'); // weekly | monthly | yearly
  const [goalSaving, setGoalSaving] = useState(false);
  const [settings, setSettings]     = useState({ weeklyGoal: 0, monthlyGoal: 0, yearlyGoal: 0 });
  
  // --- Progression des objectifs ---
  const [goalsProgress, setGoalsProgress] = useState({
    monthly: { goal: 0, current: 0, percentage: 0 },
    yearly: { goal: 0, current: 0, percentage: 0 },
    weekly: { goal: 0, current: 0, percentage: 0 }
  });
  
  // --- Statistiques des deals par agent ---
  const [dealStatsByAgent, setDealStatsByAgent] = useState([]);

  // --- Performances & Classements ---
  const [topPerformers, setTopPerformers] = useState({ top5: [], lateAgents: [], inactiveAgents: [], allPerformers: [] });
  const [lateFollowups, setLateFollowups] = useState({ totalLateFollowups: 0, agents: [], lateInteractions: [] });
  const [goalHistory, setGoalHistory] = useState([]);
  const [perfLoading, setPerfLoading] = useState(false);
  
  // --- Agent sélectionné pour le détail ---
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentDetailLoading, setAgentDetailLoading] = useState(false);
  const [agentDetailData, setAgentDetailData] = useState(null);

  // --- Chat ---
  const [chatOpen, setChatOpen] = useState(false);
  
  // --- Calendrier ---
  const [showCalendar, setShowCalendar] = useState(false);
  
  // --- Recherche Globale ---
  const [showSearch, setShowSearch] = useState(false);

  // Ctrl+K pour ouvrir la recherche
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // --- Factures ---
  const [showInvoices, setShowInvoices] = useState(false);

  // --- Rapports & Export ---
  const [showReports, setShowReports] = useState(false);

  // --- Pagination & Filtres ---
  const [dealPage, setDealPage]     = useState(1);
  const DEALS_PER_PAGE              = 8;
  const [teamSearch, setTeamSearch] = useState('');
  const [teamRoleFilter, setTeamRoleFilter] = useState('all');
  const [dealSearch, setDealSearch] = useState('');
  
  // --- Pagination logs ---
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);

  // --- Onglets & Menu mobile ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // --- Configuration d'authentification : envoyer les cookies httpOnly au serveur ---
  const getAuthHeader = (isJson = true) => {
    return {
      credentials: 'include',
      headers: isJson ? { 'Content-Type': 'application/json' } : undefined
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

  // === CHARGEMENT DE LA PROGRESSION DES OBJECTIFS ===
  const fetchGoalsProgress = async () => {
    try {
      const res = await fetch(`${API_URL}/goals/progress`, getAuthHeader());
      if (res.ok) {
        const data = await res.json();
        setGoalsProgress(data);
      }
    } catch {}
  };

  // === CHARGEMENT DES STATS DEALS PAR AGENT ===
  const fetchDealStatsByAgent = async () => {
    try {
      const res = await fetch(`${API_URL}/deals/stats`, getAuthHeader());
      if (res.ok) {
        const data = await res.json();
        setDealStatsByAgent(data);
      }
    } catch {}
  };

  // === CHARGEMENT DES PERFORMANCES ===
  const fetchTopPerformers = async () => {
    setPerfLoading(true);
    try {
      const [resTop, resLate, resHistory] = await Promise.all([
        fetch(`${API_URL}/performances/top`, getAuthHeader()),
        fetch(`${API_URL}/performances/late-followups`, getAuthHeader()),
        fetch(`${API_URL}/goals/history`, getAuthHeader())
      ]);
      if (resTop.ok) setTopPerformers(await resTop.json());
      if (resLate.ok) setLateFollowups(await resLate.json());
      if (resHistory.ok) setGoalHistory(await resHistory.json());
    } catch {}
    finally { setPerfLoading(false); }
  };

  // === CHARGEMENT DES DÉTAILS D'UN AGENT ===
  const handleViewAgentDetail = async (agent) => {
    setSelectedAgent(agent);
    setAgentDetailLoading(true);
    try {
      // Chercher les stats détaillées dans dealStatsByAgent
      const existingStats = dealStatsByAgent.find(s => s.agentId === agent.agentId);
      if (existingStats) {
        setAgentDetailData(existingStats);
      } else {
        // Sinon, faire un appel API
        const res = await fetch(`${API_URL}/deals/stats`, getAuthHeader());
        if (res.ok) {
          const allStats = await res.json();
          setDealStatsByAgent(allStats);
          const found = allStats.find(s => s.agentId === agent.agentId);
          setAgentDetailData(found || null);
        }
      }
    } catch {}
    finally { setAgentDetailLoading(false); }
  };

  useEffect(() => {
    fetchAdminData();
    fetchAuditLogs();
    fetchSettings();
    fetchGoalsProgress();
    fetchDealStatsByAgent();
    // Préchargement des performances (avec cache) pour éviter le temps d'attente dans l'onglet
    fetchTopPerformers();
  }, []);

  // === CHARGEMENT DU JOURNAL D'AUDIT (pagination 7) ===
  const fetchAuditLogs = async (actorId, pageNum) => {
    setAuditLoading(true);
    try {
      const effectiveActor = actorId !== undefined ? actorId : auditFilterActor;
      const effectivePage = pageNum !== undefined ? pageNum : logPage;
      let params = `?page=${effectivePage}&limit=7`;
      if (effectiveActor) params += `&actorId=${effectiveActor}`;
      const res = await fetch(`${API_URL}/logs${params}`, getAuthHeader());
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
        setLogTotalPages(data.pages || 1);
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

  // === ACTION : CHANGER LE RÔLE D'UN MEMBRE (AVEC CONFIRMATION) ===
  const handleChangeRole = (userId, newRole, userName) => {
    setConfirmModal({
      message: `Êtes-vous sûr de vouloir changer le rôle de ${userName} ? Cette action modifiera ses permissions dans l'application.`,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const res = await fetch(`${API_URL}/users/${userId}/role`, {
            method: 'PUT',
            ...getAuthHeader(),
            body: JSON.stringify({ role: newRole })
          });
          const data = await res.json();
          if (res.ok) {
            showToast("Rôle modifié et notification envoyée à l'agent.", "success");
            fetchAdminData();
            fetchAuditLogs();
          } else {
            showToast(data.error || "Erreur.", "error");
          }
        } catch { showToast("Erreur réseau.", "error"); }
      }
    });
  };

  // === ACTION : CRÉER UN LEAD (POST) ===
  const handleCreateDeal = async (e) => {
    e.preventDefault();
    if (!newDealData.title || !newDealData.company || !newDealData.amount) {
      showToast("Veuillez remplir tous les champs requis (titre, entreprise, montant).", "warning");
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
        setShowDealModal(false);              setNewDealData({ title: '', company: '', amount: '', assignedTo: '', contactFirstName: '', contactLastName: '', phone: '', email: '', address: '' });
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

  // === FONCTIONS D'EXPORTATION ===
  // Export CSV générique
  const exportToCSV = (data, filename, headers) => {
    if (!data || data.length === 0) {
      showToast("Aucune donnée à exporter.", "warning");
      return;
    }
    
    // Construire le CSV
    const headerRow = headers.map(h => `"${h.label}"`).join(',');
    const dataRows = data.map(row => {
      return headers.map(h => {
        const val = h.accessor(row);
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    }).join('\n');
    
    const csv = `\uFEFF${headerRow}\n${dataRows}`; // BOM pour Excel
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast(`Rapport "${filename}" exporté avec succès !`, "success");
  };

  // Export Excel des deals
  const exportDealsToCSV = () => {
    exportToCSV(
      allDeals,
      'Orbis_Deals_Global',
      [
        { label: 'Titre', accessor: d => d.title },
        { label: 'Entreprise', accessor: d => d.company || '' },
        { label: 'Montant (FCFA)', accessor: d => d.amount?.toLocaleString('fr-FR') || '0' },
        { label: 'Étape', accessor: d => d.stage },
        { label: 'Probabilité (%)', accessor: d => d.probability || '0' },
        { label: 'Assigné à', accessor: d => d.assignedTo?.name || 'Public' }
      ]
    );
  };

  // Export Excel de l'équipe
  const exportTeamToCSV = () => {
    exportToCSV(
      commercials,
      'Orbis_Equipe',
      [
        { label: 'Nom', accessor: c => c.name },
        { label: 'Email', accessor: c => c.email },
        { label: 'Rôle', accessor: c => c.role },
        { label: 'Deals', accessor: c => c.dealCount || 0 },
        { label: 'Statut', accessor: c => c.isActive ? 'Actif' : 'Suspendu' }
      ]
    );
  };

  // Export Excel des performances
  const exportPerformancesToCSV = () => {
    if (!topPerformers.allPerformers || topPerformers.allPerformers.length === 0) {
      showToast("Chargez d'abord les performances.", "warning");
      fetchTopPerformers();
      return;
    }
    exportToCSV(
      topPerformers.allPerformers,
      'Orbis_Performances',
      [
        { label: 'Agent', accessor: p => p.name },
        { label: 'Email', accessor: p => p.email },
        { label: 'Rôle', accessor: p => p.role },
        { label: 'Total Deals', accessor: p => p.totalDeals },
        { label: 'Gagnés', accessor: p => p.wonDeals },
        { label: 'Perdus', accessor: p => p.lostDeals },
        { label: 'Montant Total', accessor: p => p.totalAmount.toLocaleString('fr-FR') },
        { label: 'Win Rate (%)', accessor: p => p.winRate },
        { label: 'Score', accessor: p => Math.round(p.performanceScore) }
      ]
    );
  };

  // Générer un rapport PDF via impression navigateur
  const generatePDFReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast("Autorisez les popups pour générer le rapport.", "warning");
      return;
    }
    
    const now = new Date().toLocaleDateString('fr-FR', { 
      day: 'numeric', month: 'long', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
    
    const topAgent = topPerformers.top5?.[0];
    const totalDealsValue = allDeals.reduce((s, d) => s + (d.amount || 0), 0);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rapport Orbis CRM - ${now}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Inter', -apple-system, sans-serif;
            background: #f8fafc;
            color: #1e293b;
            padding: 40px;
            line-height: 1.6;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #0d9488;
            padding-bottom: 24px;
            margin-bottom: 32px;
          }
          .header h1 {
            font-size: 28px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: 1px;
          }
          .header .badge {
            background: #0d9488;
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.5px;
          }
          .date { color: #64748b; font-size: 12px; margin-top: 8px; }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 32px;
          }
          .stat-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          .stat-card .label {
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .stat-card .value {
            font-size: 28px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 8px;
          }
          .stat-card .sub {
            font-size: 11px;
            color: #94a3b8;
            margin-top: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 24px 0;
            font-size: 12px;
          }
          th {
            background: #f1f5f9;
            color: #475569;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
            padding: 10px 12px;
            text-align: left;
            border-bottom: 2px solid #e2e8f0;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
          }
          .section-title {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
            margin: 32px 0 16px;
            padding-left: 12px;
            border-left: 3px solid #0d9488;
          }
          .footer {
            margin-top: 48px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
          }
          .top-performer {
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            border: 1px solid #f59e0b;
            border-radius: 12px;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
          }
          .top-performer .name {
            font-size: 16px;
            font-weight: 700;
            color: #92400e;
          }
          .top-performer .stats {
            font-size: 12px;
            color: #b45309;
          }
          @media print {
            body { padding: 20px; }
            .stat-card { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>ORBIS CRM</h1>
            <div class="date">Rapport généré le ${now}</div>
          </div>
          <span class="badge">RAPPORT DIRECTION</span>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="label">Pipeline Global</div>
            <div class="value">${stats.totalPipeline?.toLocaleString('fr-FR') || '0'} F</div>
            <div class="sub">Chiffre d'affaires potentiel</div>
          </div>
          <div class="stat-card">
            <div class="label">Deals Actifs</div>
            <div class="value">${stats.activeDealsCount || 0}</div>
            <div class="sub">Opportunités en cours</div>
          </div>
          <div class="stat-card">
            <div class="label">Win Rate</div>
            <div class="value">${stats.winRate || 0}%</div>
            <div class="sub">Taux de conversion</div>
          </div>
        </div>
        
        ${topAgent ? `
        <div class="section-title">🏆 Meilleur Agent du Mois</div>
        <div class="top-performer">
          <div>
            <div class="name">${topAgent.name}</div>
            <div class="stats">${topAgent.wonDeals} deals gagnés · ${topAgent.winRate}% de réussite</div>
          </div>
          <div class="stats" style="font-size:18px;font-weight:800;">${topAgent.totalAmount.toLocaleString('fr-FR')} F</div>
        </div>
        ` : ''}
        
        <div class="section-title">📊 Objectifs</div>
        <table>
          <tr>
            <th>Période</th>
            <th>Objectif</th>
            <th>Réalisé</th>
            <th>Progression</th>
          </tr>
          <tr>
            <td>Hebdomadaire</td>
            <td>${goalsProgress.weekly.goal.toLocaleString('fr-FR')} F</td>
            <td>${goalsProgress.weekly.current.toLocaleString('fr-FR')} F</td>
            <td>${goalsProgress.weekly.percentage}%</td>
          </tr>
          <tr>
            <td>Mensuel</td>
            <td>${goalsProgress.monthly.goal.toLocaleString('fr-FR')} F</td>
            <td>${goalsProgress.monthly.current.toLocaleString('fr-FR')} F</td>
            <td>${goalsProgress.monthly.percentage}%</td>
          </tr>
          <tr>
            <td>Annuel</td>
            <td>${goalsProgress.yearly.goal.toLocaleString('fr-FR')} F</td>
            <td>${goalsProgress.yearly.current.toLocaleString('fr-FR')} F</td>
            <td>${goalsProgress.yearly.percentage}%</td>
          </tr>
        </table>
        
        <div class="section-title">📋 Top Performers</div>
        <table>
          <tr>
            <th>#</th>
            <th>Agent</th>
            <th>Deals Gagnés</th>
            <th>Montant Total</th>
            <th>Win Rate</th>
            <th>Score</th>
          </tr>
          ${(topPerformers.top5 || []).map((p, i) => `
          <tr>
            <td style="font-weight:700;">#${i + 1}</td>
            <td>${p.name}</td>
            <td>${p.wonDeals}</td>
            <td>${p.totalAmount.toLocaleString('fr-FR')} F</td>
            <td>${p.winRate}%</td>
            <td>${Math.round(p.performanceScore)}</td>
          </tr>
          `).join('')}
        </table>
        
        <div class="section-title">📈 Équipe (${commercials.length} membres)</div>
        <table>
          <tr>
            <th>Nom</th>
            <th>Rôle</th>
            <th>Deals</th>
            <th>Statut</th>
          </tr>
          ${commercials.map(c => `
          <tr>
            <td>${c.name}</td>
            <td style="text-transform:capitalize;">${c.role}</td>
            <td>${c.dealCount || 0}</td>
            <td>${c.isActive ? 'Actif' : 'Suspendu'}</td>
          </tr>
          `).join('')}
        </table>
        
        <div class="footer">
          Orbis CRM — Rapport généré automatiquement le ${now}<br>
          Ce document est confidentiel et destiné à l'usage interne.
        </div>
        
        <script>
          window.onload = function() { window.print(); };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
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
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => fetchAdminData()}>
            <img src="/outpout/wordmark/wordmark-transparent.png" alt="Orbis CRM" className="h-7 md:h-8 object-contain transform group-hover:scale-102 transition-transform duration-200" />
          </div>
          
          {/* Version desktop: affichage normal */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Bouton Recherche */}
            <button
              onClick={() => setShowSearch(true)}
              className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
              title="Recherche globale (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
            </button>
            {/* Bouton Factures */}
            <button
              onClick={() => setShowInvoices(true)}
              className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
              title="Factures & Devis"
            >
              <DollarSign className="w-4 h-4" />
            </button>
            {/* Bouton Rapports */}
            <button
              onClick={() => setShowReports(true)}
              className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
              title="Rapports & Export"
            >
              <FileText className="w-4 h-4" />
            </button>
            {/* Bouton Messagerie */}
            <button
              onClick={() => setChatOpen(true)}
              className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
              title="Messagerie"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            {/* Bouton Calendrier */}
            <button
              onClick={() => setShowCalendar(true)}
              className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
              title="Calendrier"
            >
              <Calendar className="w-4 h-4" />
            </button>
            <NotificationBadge />
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
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200 leading-none">{currentUser.name}</span>
                <span className="text-[9px] text-emerald-400 font-mono capitalize leading-none mt-1">{currentUser.role}</span>
              </div>
            </div>

            <button onClick={() => { localStorage.clear(); window.location.href = '/'; }} className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 text-slate-400 hover:text-rose-400 text-xs font-semibold transition-all duration-200">Déconnexion</button>
          </div>

          {/* Version mobile: hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <NotificationBadge />
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
              aria-label="Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Menu mobile déroulant */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800/60 bg-slate-950/95 backdrop-blur-md px-4 py-4 space-y-2 animate-fadeIn">
            <div 
              onClick={() => { setProfileName(currentUser.name); setProfileAvatar(currentUser.avatarUrl || ''); setShowProfileModal(true); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 cursor-pointer hover:bg-slate-800/40 transition-colors mb-2"
            >
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-emerald-500/30" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-sm font-black text-slate-950">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-200">{currentUser.name}</p>
                <p className="text-[10px] text-emerald-400 font-mono capitalize">{currentUser.role}</p>
              </div>
            </div>

            {/* Messagerie mobile */}
            <button
              onClick={() => { setChatOpen(true); setMobileMenuOpen(false); }}
              className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent"
            >
              <MessageSquare className="w-4 h-4" />
              Messagerie
            </button>

            <div className="border-t border-slate-800/40 pt-2 mt-1">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider px-4 mb-1 font-semibold">Navigation</p>
            </div>

            {/* Onglets mobiles */}
            {[
              { key: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard },
              { key: 'team', label: 'Équipe', icon: Users },
              { key: 'deals', label: 'Marchés', icon: Briefcase },
              { key: 'stats', label: 'Statistiques', icon: BarChart3 },
              { key: 'performances', label: 'Performances', icon: Medal },
              { key: 'settings', label: 'Configuration', icon: Settings }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 ${
                    activeTab === tab.key
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}

            <div className="flex gap-2 pt-2 border-t border-slate-800/60">
              <button
                onClick={() => { setShowUserModal(true); setMobileMenuOpen(false); }}
                className="flex-1 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-[11px] font-bold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Agent
              </button>
              <button
                onClick={() => { setShowDealModal(true); setMobileMenuOpen(false); }}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Rocket className="w-3.5 h-3.5" />
                Deal
              </button>
            </div>

            <button
              onClick={() => { localStorage.clear(); window.location.href = '/'; }}
              className="w-full py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 transition-all"
            >
              Déconnexion
            </button>
          </div>
        )}
      </nav>

      {/* ================= BARRE D'ONGLETS (DESKTOP) ================= */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-8">
        <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800/80 p-1 rounded-xl overflow-x-auto">
          {[
            { key: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard },
            { key: 'team', label: 'Équipe', icon: Users },
            { key: 'deals', label: 'Marchés', icon: Briefcase },
            { key: 'stats', label: 'Statistiques', icon: BarChart3 },
            { key: 'performances', label: 'Performances', icon: Medal },
            { key: 'settings', label: 'Configuration', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); }}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-semibold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= CONTENU PRINCIPAL (ONGLE PAR ONGLE) ================= */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8 animate-[fadeIn_0.4s_ease-out]">
        
        {/* ════════════════════════════════════════ */}
        {/* ONGLE 1 : TABLEAU DE BORD (KPI + Objectifs) */}
        {/* ════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* EN-TÊTE AVEC BOUTONS D'ACTIONS RAPIDES */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  ORBIS CRM <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono">QG DIRECTEUR</span>
                </h1>
                <p className="text-xs text-slate-400 mt-1">Supervision de l'équipe commerciale, arbitrages de portefeuilles et injection de leads en direct.</p>
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

            {/* Progression des objectifs */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2 mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Progression des Objectifs en Temps Réel
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: 'weekly', label: 'Hebdomadaire', data: goalsProgress.weekly, icon: TrendingUp, color: 'text-blue-400' },
                  { key: 'monthly', label: 'Mensuel', data: goalsProgress.monthly, icon: BarChart3, color: 'text-emerald-400' },
                  { key: 'yearly', label: 'Annuel', data: goalsProgress.yearly, icon: TrendingDown, color: 'text-amber-400' }
                ].map(p => {
                  const Icon = p.icon;
                  const percent = p.data.percentage || 0;
                  const progressColor = percent >= 100 ? 'bg-emerald-500' : percent >= 50 ? 'bg-amber-500' : 'bg-rose-500';
                  return (
                    <div key={p.key} className="bg-slate-950 border border-slate-800/60 rounded-xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-semibold ${p.color} uppercase tracking-wider`}>{p.label}</p>
                        <Icon className={`w-4 h-4 ${p.color}`} />
                      </div>
                      <div className="flex items-baseline justify-between">
                        <p className="text-2xl font-extrabold text-white font-mono">
                          {p.data.current.toLocaleString('fr-FR')} <span className="text-xs text-slate-500 font-sans">F</span>
                        </p>
                        <p className="text-xs text-slate-500 font-mono">/ {p.data.goal.toLocaleString('fr-FR')} F</p>
                      </div>
                      <div className="space-y-1.5">
                        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full ${progressColor} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${Math.min(percent, 100)}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className={`font-bold font-mono ${percent >= 100 ? 'text-emerald-400' : percent >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>{percent}%</span>
                          <span className="text-slate-600">{p.data.goal > 0 ? `${(p.data.current / p.data.goal * 100).toFixed(1)}% atteint` : 'Objectif non défini'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Graphiques analytiques */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                  Analyses & Graphiques
                </h3>
                <button
                  onClick={() => {
                    fetchGoalsProgress();
                    fetchDealStatsByAgent();
                    fetchTopPerformers();
                  }}
                  className="text-[10px] text-slate-500 hover:text-slate-300 px-2 py-1 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" />Actualiser
                </button>
              </div>
              <AdminCharts
                stats={stats}
                allDeals={allDeals}
                goalsProgress={goalsProgress}
                topPerformers={topPerformers}
                dealStatsByAgent={dealStatsByAgent}
              />
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════ */}
        {/* ONGLE 2 : ÉQUIPE */}
        {/* ════════════════════════════════════════ */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Gestion de l'Équipe
              </h2>
              <button 
                onClick={() => setShowUserModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Intégrer un Agent
              </button>
            </div>

            {/* Filtres équipe */}
            <div className="flex gap-2">
              <input
                value={teamSearch}
                onChange={e => setTeamSearch(e.target.value)}
                placeholder="Rechercher un membre..."
                className="flex-1 max-w-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-teal-500/40"
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
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {commercials
                .filter(c => {
                  const matchSearch = c.name.toLowerCase().includes(teamSearch.toLowerCase()) || c.email.toLowerCase().includes(teamSearch.toLowerCase());
                  const matchRole = teamRoleFilter === 'all' || c.role === teamRoleFilter;
                  return matchSearch && matchRole;
                })
                .map(c => (
                  <div key={c._id} className="p-4 bg-slate-900/20 border border-slate-800/60 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          {c.avatarUrl ? (
                            <img src={c.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-slate-800" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-400">{c.name.charAt(0).toUpperCase()}</div>
                          )}
                          <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-950 ${c.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{c.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{c.email}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold font-mono text-emerald-400">{c.dealCount || 0} deals</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-600 uppercase tracking-wider">Rôle :</span>
                      <select
                        value={c.role || 'commercial'}
                        onChange={e => handleChangeRole(c._id, e.target.value, c.name)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-teal-500/40 cursor-pointer"
                      >
                        <option value="commercial">Commercial</option>
                        <option value="marketing">Marketing</option>
                        <option value="rh">RH</option>
                        <option value="autre">Autre</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => handleToggleUserStatus(c)}
                        title={c.isActive ? "Suspendre" : "Réactiver"}
                        className={`px-2 py-1 rounded-md text-[10px] transition-all border ${
                          c.isActive
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        {c.isActive ? 'Suspendre' : 'Réactiver'}
                      </button>
                    </div>
                  </div>
                ))
              }
              {commercials.filter(c => {
                const matchSearch = c.name.toLowerCase().includes(teamSearch.toLowerCase()) || c.email.toLowerCase().includes(teamSearch.toLowerCase());
                const matchRole = teamRoleFilter === 'all' || c.role === teamRoleFilter;
                return matchSearch && matchRole;
              }).length === 0 && (
                <p className="text-xs text-slate-500 text-center py-8 col-span-full">Aucun membre trouvé.</p>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════ */}
        {/* ONGLE 3 : MARCHÉS / DEALS */}
        {/* ════════════════════════════════════════ */}
        {activeTab === 'deals' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-400" />
                Flux des Marchés
              </h2>
              <div className="flex items-center gap-2">
                <input
                  value={dealSearch}
                  onChange={e => { setDealSearch(e.target.value); setDealPage(1); }}
                  placeholder="Rechercher un lead..."
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-teal-500/40 w-40 md:w-48"
                />
                <button 
                  onClick={() => setShowDealModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
                >
                  <Rocket className="w-4 h-4" />
                  Nouveau
                </button>
              </div>
            </div>

            {/* Tableau des Deals */}
            <div className="overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                    <th className="p-3.5">Projet / Client</th>
                    <th className="p-3.5">Valeur</th>
                    <th className="p-3.5">Étape</th>
                    <th className="p-3.5">Assigné</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {allDeals
                    .filter(d => d.title?.toLowerCase().includes(dealSearch.toLowerCase()) || d.company?.toLowerCase().includes(dealSearch.toLowerCase()))
                    .slice((dealPage - 1) * DEALS_PER_PAGE, dealPage * DEALS_PER_PAGE)
                    .map(d => (
                      <tr key={d._id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3.5">
                          <p className="font-bold text-white text-xs">{d.title}</p>
                          <p className="text-[10px] text-slate-500">{d.company}</p>
                        </td>
                        <td className="p-3.5 font-mono text-slate-300 font-medium">{d.amount?.toLocaleString('fr-FR')} F</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            d.stage === 'découverte' ? 'bg-sky-500/10 text-sky-400' :
                            d.stage === 'proposition' ? 'bg-blue-500/10 text-blue-400' :
                            d.stage === 'négociation' ? 'bg-amber-500/10 text-amber-400' :
                            d.stage === 'gagné' ? 'bg-emerald-500/10 text-emerald-400' :
                            'bg-rose-500/10 text-rose-400'
                          }`}>
                            {d.stage}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 border rounded-md text-[10px] ${d.assignedTo ? 'text-slate-400 bg-slate-950 border-slate-800' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                            {d.assignedTo ? <span className="inline-flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{d.assignedTo?.name}</span> : <span className="inline-flex items-center gap-1.5"><Unlock className="w-3.5 h-3.5" />Public</span>}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => setSelectedDeal(d)} className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-teal-400 hover:text-white text-[10px] font-bold rounded-lg transition-all">Transférer</button>
                            <button onClick={() => handleDeleteDeal(d._id)} className="px-2.5 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-[10px] font-bold rounded-lg transition-all">Retirer</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {allDeals.filter(d => d.title?.toLowerCase().includes(dealSearch.toLowerCase()) || d.company?.toLowerCase().includes(dealSearch.toLowerCase())).length === 0 && (
                    <tr><td colSpan="5" className="p-8 text-center text-slate-500 font-mono">Aucun lead actif sur le marché.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {allDeals.filter(d => d.title?.toLowerCase().includes(dealSearch.toLowerCase()) || d.company?.toLowerCase().includes(dealSearch.toLowerCase())).length > DEALS_PER_PAGE && (
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-500">Page {dealPage} / {Math.ceil(allDeals.filter(d => d.title?.toLowerCase().includes(dealSearch.toLowerCase()) || d.company?.toLowerCase().includes(dealSearch.toLowerCase())).length / DEALS_PER_PAGE)}</p>
                <div className="flex gap-1">
                  <button onClick={() => setDealPage(p => Math.max(1, p - 1))} disabled={dealPage === 1} className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg disabled:opacity-40 transition-all">← Préc.</button>
                  <button onClick={() => setDealPage(p => p + 1)} disabled={dealPage >= Math.ceil(allDeals.filter(d => d.title?.toLowerCase().includes(dealSearch.toLowerCase()) || d.company?.toLowerCase().includes(dealSearch.toLowerCase())).length / DEALS_PER_PAGE)} className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg disabled:opacity-40 transition-all">Suiv. →</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════ */}
        {/* ONGLE 4 : STATISTIQUES */}
        {/* ════════════════════════════════════════ */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              Statistiques & Analyse
            </h2>

            {/* Deal Stats by Agent */}
            {dealStatsByAgent.length > 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                    État d'Avancement par Agent
                  </h3>
                  <button onClick={fetchDealStatsByAgent} className="text-[10px] text-slate-500 hover:text-slate-300 px-2 py-1 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3" />Actualiser
                  </button>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-800/80">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                        <th className="p-3">Agent</th>
                        <th className="p-3 text-center">Découverte</th>
                        <th className="p-3 text-center">Proposition</th>
                        <th className="p-3 text-center">Négociation</th>
                        <th className="p-3 text-center">Gagné</th>
                        <th className="p-3 text-center">Perdu</th>
                        <th className="p-3 text-right">Total</th>
                        <th className="p-3 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {dealStatsByAgent.map((agent, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                          <td className="p-3"><p className="font-semibold text-white text-xs">{agent.agentName}</p>{agent.agentEmail && <p className="text-[9px] text-slate-500">{agent.agentEmail}</p>}</td>
                          <td className="p-3 text-center"><span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20">{agent.stages.découverte}</span></td>
                          <td className="p-3 text-center"><span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">{agent.stages.proposition}</span></td>
                          <td className="p-3 text-center"><span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">{agent.stages.négociation}</span></td>
                          <td className="p-3 text-center"><span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{agent.stages.gagné}</span></td>
                          <td className="p-3 text-center"><span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20">{agent.stages.perdu}</span></td>
                          <td className="p-3 text-right font-mono font-bold text-slate-300">{agent.totalDeals}</td>
                          <td className="p-3 text-right font-mono text-slate-300">{agent.totalAmount.toLocaleString('fr-FR')} F</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-8 text-center">
                <p className="text-xs text-slate-500">Chargement des statistiques...</p>
              </div>
            )}

            {/* Journal d'Audit */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  Journal d'Audit
                </h3>
                <button onClick={fetchAuditLogs} className="text-[10px] text-slate-500 hover:text-slate-300 px-2 py-1 rounded-lg border border-slate-800 hover:border-slate-700 flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3" />Actualiser
                </button>
              </div>

              <div className="flex gap-2 mb-4">
                <select
                  value={auditFilterActor}
                  onChange={e => { setAuditFilterActor(e.target.value); setLogPage(1); fetchAuditLogs(e.target.value, 1); }}
                  className="flex-1 max-w-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-rose-500/40"
                >
                  <option value="">Tous les utilisateurs</option>
                  {commercials.map(c => (<option key={c._id} value={c._id}>{c.name}</option>))}
                </select>
                <button onClick={() => { setAuditFilterActor(''); setLogPage(1); fetchAuditLogs('', 1); }} className="text-[10px] text-slate-500 hover:text-slate-300 px-2 py-1 rounded-lg border border-slate-800 hover:border-slate-700">Réinitialiser</button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {auditLoading ? (
                  <div className="flex items-center justify-center h-24 text-slate-500"><div className="w-5 h-5 border-2 border-t-rose-400 border-slate-700 rounded-full animate-spin"></div></div>
                ) : auditLogs.length === 0 ? (
                  <p className="text-xs text-slate-600 italic text-center py-4">Aucune action enregistrée.</p>
                ) : (
                  auditLogs.map(log => (
                    <div key={log._id} className={`flex items-start gap-3 p-2.5 rounded-xl border ${log.severity === 'high' ? 'bg-rose-500/5 border-rose-500/20' : log.severity === 'warning' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-slate-900/60 border-slate-800/60'}`}>
                      <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${log.severity === 'high' ? 'bg-rose-400' : log.severity === 'warning' ? 'bg-amber-400' : 'bg-slate-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-300 leading-snug">{log.actionDescription}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{log.actorName} &bull; {new Date(log.createdAt).toLocaleString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination des logs (7 par page) */}
              {logTotalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 mt-3">
                  <p className="text-[9px] text-slate-500 font-mono">Page {logPage} / {logTotalPages}</p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        const newPage = Math.max(1, logPage - 1);
                        setLogPage(newPage);
                        fetchAuditLogs(auditFilterActor, newPage);
                      }}
                      disabled={logPage <= 1}
                      className="px-2 py-1 text-[10px] bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg disabled:opacity-40 transition-all flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3 h-3" /> Préc.
                    </button>
                    <button
                      onClick={() => {
                        const newPage = Math.min(logTotalPages, logPage + 1);
                        setLogPage(newPage);
                        fetchAuditLogs(auditFilterActor, newPage);
                      }}
                      disabled={logPage >= logTotalPages}
                      className="px-2 py-1 text-[10px] bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg disabled:opacity-40 transition-all flex items-center gap-1"
                    >
                      Suiv. <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════ */}
        {/* ONGLE 5 : PERFORMANCES & CLASSEMENTS */}
        {/* ════════════════════════════════════════ */}
        {activeTab === 'performances' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Medal className="w-5 h-5 text-emerald-400" />
                Performances & Classements
              </h2>
              <button onClick={fetchTopPerformers} className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-[10px] text-slate-400 hover:text-white rounded-xl flex items-center gap-1.5 transition-all">
                <RefreshCw className="w-3 h-3" />
                {perfLoading ? 'Chargement...' : 'Actualiser'}
              </button>
            </div>

            {perfLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-6 h-6 border-2 border-t-emerald-400 border-slate-700 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* TOP 5 Meilleurs Agents */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6">
                  <h3 className="text-base font-bold text-white flex items-center gap-2 mb-5">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    Top 5 des Meilleurs Agents
                  </h3>
                  
                  {topPerformers.top5.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">Chargement des données...</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-3">
                      {topPerformers.top5.map((agent, idx) => (
                        <div
                          key={agent.agentId}
                          onClick={() => handleViewAgentDetail(agent)}
                          className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800/60 hover:border-emerald-500/30 hover:bg-slate-900/60 transition-all cursor-pointer group"
                        >
                          {/* Rang */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                            idx === 0 ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' :
                            idx === 1 ? 'bg-slate-400 text-slate-950' :
                            idx === 2 ? 'bg-amber-700 text-white' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {idx + 1}
                          </div>
                          {/* Avatar avec photo */}
                          <div className="relative flex-shrink-0">
                            {agent.avatarUrl ? (
                              <img
                                src={agent.avatarUrl}
                                alt={agent.name}
                                className="w-9 h-9 rounded-full object-cover border-2 border-emerald-500/30 group-hover:border-emerald-400 transition-all"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-sm font-black text-slate-950">
                                {agent.name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            {/* Badge indicateur cliquable */}
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center">
                              <span className="text-[5px] text-white font-bold">›</span>
                            </div>
                          </div>
                          {/* Infos */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">{agent.name}</p>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5">
                              <span>{agent.wonDeals} gagnés</span>
                              <span>{agent.totalAmount.toLocaleString('fr-FR')} F</span>
                              <span className={`font-bold ${agent.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>{agent.winRate}%</span>
                            </div>
                          </div>
                          {/* Progression */}
                          <div className="text-right">
                            <div className={`text-[10px] font-bold font-mono ${agent.progressPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {agent.progressPercent >= 0 ? '+ ' : ''}{agent.progressPercent}%
                            </div>
                            <div className="text-[9px] text-slate-500">vs mois préc.</div>
                            <div className="mt-1 text-[8px] text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                              Voir détails →
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Agents en Retard / Inactifs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Agents en retard de relance */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                      <Clock className="w-4 h-4 text-rose-400" />
                      Agents en Retard de Relance
                    </h3>
                    {lateFollowups.agents.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">Aucun retard détecté ✓</p>
                    ) : (
                      <div className="space-y-2">
                        {lateFollowups.agents.slice(0, 5).map(a => (
                          <div key={a.agentId} className="flex items-center justify-between p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-rose-500/10 flex items-center justify-center text-xs font-bold text-rose-400">
                                {a.agentName?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-200">{a.agentName}</p>
                                <p className="text-[10px] text-slate-500">{a.lateCount} relance(s) en retard</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-rose-400">{a.lateCount}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Agents inactifs */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Agents Inactifs
                    </h3>
                    {topPerformers.inactiveAgents?.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">Tous les agents sont actifs ✓</p>
                    ) : (
                      <div className="space-y-2">
                        {topPerformers.inactiveAgents?.slice(0, 5).map(a => (
                          <div key={a.agentId} className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center text-xs font-bold text-amber-400">
                                {a.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-200">{a.name}</p>
                                <p className="text-[10px] text-slate-500">{a.role}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Historique des objectifs */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                    <BarChart3 className="w-4 h-4 text-amber-400" />
                    Historique des Objectifs
                  </h3>
                  {goalHistory.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">Aucun historique disponible.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                            <th className="p-2">Date</th>
                            <th className="p-2">Période</th>
                            <th className="p-2">Ancien</th>
                            <th className="p-2">Nouveau</th>
                            <th className="p-2">Modifié par</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {goalHistory.slice(0, 10).map(h => (
                            <tr key={h._id} className="hover:bg-slate-900/40">
                              <td className="p-2 font-mono text-slate-400">{new Date(h.createdAt).toLocaleDateString('fr-FR')}</td>
                              <td className="p-2 capitalize">{h.period}</td>
                              <td className="p-2 font-mono text-slate-500">{h.oldGoal.toLocaleString('fr-FR')} F</td>
                              <td className="p-2 font-mono text-emerald-400 font-bold">{h.newGoal.toLocaleString('fr-FR')} F</td>
                              <td className="p-2 text-slate-400">{h.changedByName}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════ */}
        {/* ONGLE 6 : CONFIGURATION */}
        {/* ════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-400" />
              Configuration
            </h2>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Objectifs de Revenue
              </h3>
              <p className="text-xs text-slate-400 mb-5">Définissez les caps de chiffre d'affaires par période.</p>
              
              <div className="flex rounded-xl border border-slate-800 overflow-hidden mb-4">
                {[
                  { value: 'monthly', label: 'Mensuel', current: settings.monthlyGoal },
                  { value: 'yearly', label: 'Annuel', current: settings.yearlyGoal },
                  { value: 'weekly', label: 'Hebdo', current: settings.weeklyGoal }
                ].map(p => (
                  <button key={p.value} type="button" onClick={() => { setGoalPeriod(p.value); setGoalValue(p.current ? String(p.current) : ''); }}
                    className={`flex-1 py-2 text-xs font-bold transition-all ${goalPeriod === p.value ? 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-400' : 'bg-slate-950 text-slate-500 hover:text-slate-300'}`}
                  >
                    {p.label}
                    {p.current > 0 && <span className="block text-[9px] font-mono text-slate-500 mt-0.5">{p.current.toLocaleString('fr-FR')} F</span>}
                  </button>
                ))}
              </div>

              <form onSubmit={handleUpdateGoal} className="flex gap-3">
                <input type="number" min="1" value={goalValue} onChange={e => setGoalValue(e.target.value)}
                  placeholder={`ex: ${goalPeriod === 'yearly' ? '60 000 000' : goalPeriod === 'weekly' ? '1 000 000' : '5 000 000'}`}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
                <button type="submit" disabled={goalSaving}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                >
                  {goalSaving ? "Sauvegarde..." : "Appliquer"}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

      {/* ================= MODAL DE RÉATTRIBUTION ================= */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
          <form onSubmit={handleReassignDeal} className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Transférer le dossier</h3>
            <p className="text-xs text-slate-400">Vous réattribuez <span className="text-emerald-400 font-bold">{selectedDeal.title}</span>.</p>
            <select required value={newAssigneeId} onChange={e => setNewAssigneeId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-sm rounded-xl p-3 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- Sélectionner un profil --</option>
              {commercials.filter(c => c._id !== selectedDeal.assignedTo?._id && c.isActive).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <div className="flex gap-3">
              <button type="button" onClick={() => setSelectedDeal(null)} className="flex-1 py-2 rounded-xl border border-slate-800 text-xs text-slate-400 hover:text-white">Annuler</button>
              <button type="submit" disabled={actionLoading} className="flex-1 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:opacity-90 disabled:opacity-40">{actionLoading ? "Mutation..." : "Confirmer"}</button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL INJECTER UN DEAL ================= */}
      {showDealModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleCreateDeal} className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 my-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Injecter un Nouveau Marché</h3>
              <button type="button" onClick={() => setShowDealModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mt-1">Informations du Marché</p>
              <input type="text" placeholder="Titre du projet *" required value={newDealData.title} onChange={e => setNewDealData({...newDealData, title: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none" />
              <input type="text" placeholder="Entreprise cliente *" required value={newDealData.company} onChange={e => setNewDealData({...newDealData, company: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Prénom" value={newDealData.contactFirstName} onChange={e => setNewDealData({...newDealData, contactFirstName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none" />
                <input type="text" placeholder="Nom" value={newDealData.contactLastName} onChange={e => setNewDealData({...newDealData, contactLastName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="tel" placeholder="Téléphone" value={newDealData.phone} onChange={e => setNewDealData({...newDealData, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none" />
                <input type="email" placeholder="Email" value={newDealData.email} onChange={e => setNewDealData({...newDealData, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none" />
              </div>
              <input type="text" placeholder="Adresse" value={newDealData.address} onChange={e => setNewDealData({...newDealData, address: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none" />
              <input type="number" placeholder="Budget estimé *" required value={newDealData.amount} onChange={e => setNewDealData({...newDealData, amount: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none" />
              <select value={newDealData.assignedTo} onChange={e => setNewDealData({...newDealData, assignedTo: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none">
                <option value="">-- Non assigné (Marché public) --</option>
                <option value="public">🌐 Public - Tout commercial peut réclamer</option>
                {commercials.filter(c => c.isActive).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setShowDealModal(false)} className="flex-1 py-2.5 border border-slate-800 rounded-xl text-xs text-slate-400">Annuler</button>
              <button type="submit" disabled={actionLoading} className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold rounded-xl text-xs">{actionLoading ? "Création..." : "Lancer le Deal"}</button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL CRÉER UN AGENT ================= */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateUser} className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Créer un Agent</h3>
              <button type="button" onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Nom de l'agent *" required value={newUserData.name} onChange={e => setNewUserData({...newUserData, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none" />
              <input type="email" placeholder="Email professionnel *" required value={newUserData.email} onChange={e => setNewUserData({...newUserData, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none" />
              <input type="password" placeholder="Mot de passe provisoire *" required value={newUserData.password} onChange={e => setNewUserData({...newUserData, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none" />
              <select value={newUserData.role || 'commercial'} onChange={e => setNewUserData({...newUserData, role: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none">
                <option value="commercial">Commercial / Vente</option>
                <option value="marketing">Marketing</option>
                <option value="rh">RH</option>
                <option value="autre">Autre service</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2 border-t border-slate-800">
              <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 py-2.5 border border-slate-800 rounded-xl text-xs text-slate-400">Annuler</button>
              <button type="submit" disabled={actionLoading} className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold rounded-xl text-xs">{actionLoading ? "Création..." : "Créer l'Accès"}</button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL DE PROFIL ================= */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <form onSubmit={handleUpdateProfile} className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Mon Profil</h3>
              <button type="button" onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-col items-center space-y-3 py-2">
              <div className="relative group cursor-pointer">
                {profileAvatar ? (
                  <img src={profileAvatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-emerald-500/40 group-hover:opacity-75" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-2xl font-black text-slate-950 group-hover:opacity-75">{profileName.charAt(0).toUpperCase()}</div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white font-bold cursor-pointer">Changer<input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" /></label>
              </div>
            </div>
            <input type="text" required value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-sm rounded-xl p-3 text-slate-200 focus:outline-none focus:border-emerald-500" />
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowProfileModal(false)} className="flex-1 py-2.5 border border-slate-800 rounded-xl text-xs text-slate-400 hover:text-white">Annuler</button>
              <button type="submit" disabled={profileSaving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-bold text-xs hover:opacity-90 disabled:opacity-40">{profileSaving ? "Enregistrement..." : "Sauvegarder"}</button>
            </div>
          </form>
        </div>
      )}

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

      {/* ================= MODAL DÉTAILS D'UN AGENT ================= */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl my-4 animate-[fadeIn_0.3s_ease-out]">
            {/* En-tête avec photo */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-5">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {selectedAgent.avatarUrl ? (
                    <img
                      src={selectedAgent.avatarUrl}
                      alt={selectedAgent.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500/40"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-2xl font-black text-slate-950">
                      {selectedAgent.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedAgent.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-slate-400 capitalize">{selectedAgent.role || 'Commercial'}</span>
                    <span className="text-[10px] text-slate-600">•</span>
                    <span className="text-[10px] text-slate-400">{selectedAgent.email}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono ${selectedAgent.progressPercent >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      {selectedAgent.progressPercent >= 0 ? '📈 +' : '📉 '}{selectedAgent.progressPercent}% vs mois préc.
                    </div>
                    <div className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold font-mono">
                      Score: {Math.round(selectedAgent.performanceScore)}
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setSelectedAgent(null); setAgentDetailData(null); }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {agentDetailLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-t-emerald-400 border-slate-700 rounded-full animate-spin" />
              </div>
            ) : agentDetailData ? (
              <div className="space-y-6 mt-5">
                {/* Stats principales */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-slate-950 border border-slate-800/60 p-3.5">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Total Deals</p>
                    <p className="text-xl font-extrabold text-white mt-1 font-mono">{agentDetailData.totalDeals || selectedAgent.totalDeals || 0}</p>
                  </div>
                  <div className="rounded-xl bg-slate-950 border border-slate-800/60 p-3.5">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Gagnés</p>
                    <p className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">{selectedAgent.wonDeals || 0}</p>
                  </div>
                  <div className="rounded-xl bg-slate-950 border border-slate-800/60 p-3.5">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Perdus</p>
                    <p className="text-xl font-extrabold text-rose-400 mt-1 font-mono">{selectedAgent.lostDeals || 0}</p>
                  </div>
                  <div className="rounded-xl bg-slate-950 border border-slate-800/60 p-3.5">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Actifs</p>
                    <p className="text-xl font-extrabold text-amber-400 mt-1 font-mono">{selectedAgent.activeDeals || 0}</p>
                  </div>
                </div>

                {/* Montant et Win Rate */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 p-4">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Montant Total Gagné</p>
                    <p className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">{selectedAgent.totalAmount.toLocaleString('fr-FR')} <span className="text-xs text-slate-500 font-sans">FCFA</span></p>
                    <p className="text-[10px] text-slate-500 mt-1">Moyenne: {selectedAgent.avgDealAmount.toLocaleString('fr-FR')} F/deal</p>
                  </div>
                  <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 p-4">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Taux de Réussite</p>
                    <p className="text-2xl font-extrabold text-amber-400 mt-1 font-mono">{selectedAgent.winRate}%</p>
                    <div className="mt-2 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${selectedAgent.winRate >= 50 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(selectedAgent.winRate, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Revenu mensuel: {selectedAgent.monthRevenue.toLocaleString('fr-FR')} F</p>
                  </div>
                </div>

                {/* Répartition par étape */}
                <div>
                  <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                    Répartition par Étape
                  </h4>
                  <div className="space-y-2.5">
                    {[
                      { stage: 'découverte', count: agentDetailData.stages?.découverte || 0, color: 'bg-sky-500', textColor: 'text-sky-400' },
                      { stage: 'proposition', count: agentDetailData.stages?.proposition || 0, color: 'bg-blue-500', textColor: 'text-blue-400' },
                      { stage: 'négociation', count: agentDetailData.stages?.négociation || 0, color: 'bg-amber-500', textColor: 'text-amber-400' },
                      { stage: 'gagné', count: agentDetailData.stages?.gagné || 0, color: 'bg-emerald-500', textColor: 'text-emerald-400' },
                      { stage: 'perdu', count: agentDetailData.stages?.perdu || 0, color: 'bg-rose-500', textColor: 'text-rose-400' }
                    ].map(s => {
                      const total = selectedAgent.totalDeals || 1;
                      const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                      return (
                        <div key={s.stage} className="flex items-center gap-3">
                          <span className={`w-20 text-[10px] capitalize ${s.textColor} font-medium`}>{s.stage}</span>
                          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full ${s.color} rounded-full transition-all duration-700`} style={{ width: `${Math.max(pct, s.count > 0 ? 5 : 0)}%` }} />
                          </div>
                          <span className="w-12 text-right text-[10px] text-slate-400 font-mono">{s.count} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Deals récents */}
                {agentDetailData.deals && agentDetailData.deals.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Deals ({agentDetailData.deals.length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {agentDetailData.deals.slice(0, 10).map(d => (
                        <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/60 hover:border-slate-700/60 transition-all">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-200 truncate">{d.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-medium capitalize ${
                                d.stage === 'gagné' ? 'bg-emerald-500/10 text-emerald-400' :
                                d.stage === 'perdu' ? 'bg-rose-500/10 text-rose-400' :
                                d.stage === 'négociation' ? 'bg-amber-500/10 text-amber-400' :
                                d.stage === 'proposition' ? 'bg-blue-500/10 text-blue-400' :
                                'bg-sky-500/10 text-sky-400'
                              }`}>
                                {d.stage}
                              </span>
                              <span className="text-[9px] text-slate-600">{d.probability}%</span>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-slate-300 font-mono ml-3">{d.amount.toLocaleString('fr-FR')} F</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!agentDetailData.deals || agentDetailData.deals.length === 0) && selectedAgent.totalDeals > 0 && (
                  <p className="text-xs text-slate-500 text-center py-4 italic">Les détails des deals ne sont pas disponibles dans cette vue.</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <User className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">Aucune donnée détaillée disponible</p>
                <p className="text-[10px] text-slate-600 mt-1">{selectedAgent.name} n'a pas encore de deals enregistrés.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL RAPPORTS & EXPORT ================= */}
      {showReports && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Rapports & Export</h3>
                  <p className="text-[10px] text-slate-500">Générez des rapports et exportez vos données</p>
                </div>
              </div>
              <button onClick={() => setShowReports(false)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold">Export Excel (CSV)</p>
              
              <button
                onClick={exportDealsToCSV}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/30 hover:bg-slate-900 transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Download className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">Deals & Marchés</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Tous les deals, valeurs, étapes et assignations</p>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">CSV</span>
              </button>
              
              <button
                onClick={exportTeamToCSV}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/30 hover:bg-slate-900 transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Download className="w-5 h-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">Équipe Commerciale</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Liste des agents, rôles, statuts et nombre de deals</p>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">CSV</span>
              </button>
              
              <button
                onClick={exportPerformancesToCSV}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/30 hover:bg-slate-900 transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Download className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">Performances des Agents</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Classement, scores, win rate et montants par agent</p>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">CSV</span>
              </button>
            </div>
            
            <div className="border-t border-slate-800 pt-4">
              <p className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-3">Rapport Complet (PDF)</p>
              <button
                onClick={generatePDFReport}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 hover:border-emerald-500/40 hover:from-emerald-500/20 hover:to-teal-500/20 transition-all group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Printer className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">Rapport de Direction Complet</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Statistiques, objectifs, top performers, équipe — prêt à imprimer</p>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">PDF</span>
              </button>
              <p className="text-[9px] text-slate-600 mt-2 text-center">
                Le rapport PDF s'ouvre dans un nouvel onglet et lance l'impression automatiquement.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= PANNEAU DE MESSAGERIE ================= */}
      <ChatPanel 
        isOpen={chatOpen} 
        onClose={() => setChatOpen(false)} 
      />
{/* ================= CALENDRIER ================= */}
      {showCalendar && (
        <CalendarPanel onClose={() => setShowCalendar(false)} />
      )}
{/* ================= FACTURES ================= */}
      {showInvoices && (
        <InvoicePanel onClose={() => setShowInvoices(false)} />
      )}

      {/* ================= RECHERCHE GLOBALE ================= */}
      {showSearch && (
        <GlobalSearch
          onClose={() => setShowSearch(false)}
          onNavigate={(category, id, data) => {
            console.log("Navigate to", category, id);
          }}
        />
      )}

    </div>
  );
}
