import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, FileText, Download, Printer, CheckCircle, XCircle, Clock, AlertTriangle, Search, RefreshCw, Eye, Trash2, DollarSign } from 'lucide-react';

const API_INVOICES = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/invoices`
  : 'http://localhost:5001/api/invoices';

const API_DEALS = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/crm/admin/deals/global`
  : 'http://localhost:5001/api/crm/admin/deals/global';

const STATUS_LABELS = {
  brouillon: 'Brouillon',
  envoyé: 'Envoyé',
  payé: 'Payé',
  partiel: 'Partiel',
  annulé: 'Annulé',
  impayé: 'Impayé'
};

const STATUS_COLORS = {
  brouillon: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  envoyé: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  payé: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  partiel: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  annulé: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  impayé: 'bg-red-500/10 text-red-400 border-red-500/20'
};

// === GÉNÉRATION PDF ===
const generateInvoicePDF = (invoice) => {
  if (!invoice) return;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const now = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  const dueDate = new Date(invoice.dueDate).toLocaleDateString('fr-FR');
  const issueDate = new Date(invoice.issueDate).toLocaleDateString('fr-FR');

  const itemsRows = (invoice.items || []).map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:13px;">${item.description}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;text-align:center;font-size:13px;">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;text-align:right;font-size:13px;">${Number(item.unitPrice).toLocaleString('fr-FR')} F</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;text-align:right;font-size:13px;">${item.tva || 0}%</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#334155;text-align:right;font-size:13px;font-weight:600;">${(item.quantity * item.unitPrice).toLocaleString('fr-FR')} F</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Facture ${invoice.numero} - ${invoice.clientName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; color: #1e293b; padding: 40px; }
        .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 3px solid #0d9488; padding-bottom: 24px; margin-bottom: 24px; }
        .header h1 { font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: 2px; }
        .header .numero { font-size: 20px; font-weight: 700; color: #0d9488; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
        .info-box { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
        .info-box h3 { font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 8px; }
        .info-box p { font-size: 13px; color: #1e293b; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { background: #f1f5f9; color: #475569; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; }
        th:not(:first-child) { text-align: right; }
        .totals { margin-left: auto; width: 320px; }
        .totals table { margin-bottom: 0; }
        .totals td { padding: 8px 12px; font-size: 13px; }
        .totals .grand-total td { font-size: 18px; font-weight: 800; color: #0d9488; border-top: 2px solid #0d9488; }
        .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .notes { margin-top: 24px; padding: 16px; background: #fef9c3; border: 1px solid #fde68a; border-radius: 12px; font-size: 12px; color: #92400e; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>ORBIS CRM</h1>
          <p style="color:#64748b;font-size:11px;margin-top:4px;">Force de vente & Gestion Commerciale</p>
        </div>
        <div style="text-align:right;">
          <div class="numero">${invoice.numero}</div>
          <p style="color:#64748b;font-size:11px;margin-top:4px;">${issueDate}</p>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <h3>Facturé à</h3>
          <p><strong>${invoice.clientName}</strong></p>
          ${invoice.clientCompany ? `<p>${invoice.clientCompany}</p>` : ''}
          ${invoice.clientEmail ? `<p style="color:#0d9488;">${invoice.clientEmail}</p>` : ''}
          ${invoice.clientPhone ? `<p>${invoice.clientPhone}</p>` : ''}
          ${invoice.clientAddress ? `<p>${invoice.clientAddress}</p>` : ''}
        </div>
        <div class="info-box" style="text-align:right;">
          <h3>Détails</h3>
          <p>Date d'émission : <strong>${issueDate}</strong></p>
          <p>Date d'échéance : <strong>${dueDate}</strong></p>
          <p>Statut : <span class="status-badge" style="background:${invoice.status === 'payé' ? '#d1fae5' : invoice.status === 'impayé' ? '#fee2e2' : '#e2e8f0'};color:${invoice.status === 'payé' ? '#065f46' : invoice.status === 'impayé' ? '#991b1b' : '#475569'};">${STATUS_LABELS[invoice.status]}</span></p>
        </div>
      </div>

      <table>
        <thead>
          <tr><th>Description</th><th style="text-align:center;">Qté</th><th style="text-align:right;">Prix unit.</th><th style="text-align:right;">TVA</th><th style="text-align:right;">Total</th></tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr><td style="color:#64748b;">Sous-total</td><td style="text-align:right;">${Number(invoice.subTotal).toLocaleString('fr-FR')} F</td></tr>
          <tr><td style="color:#64748b;">TVA</td><td style="text-align:right;">${Number(invoice.tvaTotal).toLocaleString('fr-FR')} F</td></tr>
          ${invoice.discount > 0 ? `<tr><td style="color:#64748b;">Remise</td><td style="text-align:right;color:#ef4444;">-${Number(invoice.discount).toLocaleString('fr-FR')} F</td></tr>` : ''}
          <tr class="grand-total"><td>Total TTC</td><td style="text-align:right;">${Number(invoice.total).toLocaleString('fr-FR')} F</td></tr>
          ${invoice.status === 'payé' ? `<tr><td style="color:#10b981;font-weight:600;">Payé le</td><td style="text-align:right;color:#10b981;font-weight:600;">${invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString('fr-FR') : '-'}</td></tr>` : ''}
          ${invoice.status === 'partiel' ? `<tr><td style="color:#f59e0b;font-weight:600;">Payé</td><td style="text-align:right;color:#f59e0b;font-weight:600;">${Number(invoice.paidAmount).toLocaleString('fr-FR')} F</td></tr>` : ''}
        </table>
      </div>

      ${invoice.notes ? `<div class="notes">📝 ${invoice.notes}</div>` : ''}

      <div class="footer">
        Orbis CRM — ${invoice.numero} — Généré le ${now}<br>
        Ce document est une facture officielle. Merci de votre confiance.
      </div>

      <script>window.onload = function() { window.print(); };<\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
};

// === MODAL DE CRÉATION DE FACTURE ===
function InvoiceFormModal({ onClose, onRefresh, deals }) {
  const [step, setStep] = useState(1); // 1 = depuis deal ou manuel, 2 = formulaire
  const [selectedDeal, setSelectedDeal] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clientName: '', clientCompany: '', clientEmail: '', clientPhone: '', clientAddress: '',
    items: [{ description: '', quantity: 1, unitPrice: 0, tva: 18 }],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: ''
  });
  const [error, setError] = useState('');

  const wonDeals = (deals || []).filter(d => d.stage === 'gagné');

  const handleCreateFromDeal = async () => {
    if (!selectedDeal) return setError('Sélectionnez un deal gagné.');
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_INVOICES}/from-deal`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: selectedDeal, dueDate: form.dueDate })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur génération.');
      onRefresh();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateManual = async (e) => {
    e.preventDefault();
    if (!form.clientName || form.items.length === 0 || !form.items[0].description) {
      return setError('Nom client et au moins un article requis.');
    }
    setLoading(true);
    setError('');
    const items = form.items.filter(i => i.description.trim());
    const subTotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const tvaTotal = items.reduce((s, i) => s + Math.round(i.quantity * i.unitPrice * (i.tva || 0) / 100), 0);
    try {
      const res = await fetch(API_INVOICES, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items,
          subTotal,
          tvaTotal,
          total: subTotal + tvaTotal,
          dueDate: new Date(form.dueDate).toISOString()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur création.');
      onRefresh();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unitPrice: 0, tva: 18 }] }));
  const updateItem = (idx, field, val) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: val };
    setForm(f => ({ ...f, items }));
  };
  const removeItem = (idx) => {
    if (form.items.length <= 1) return;
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          Nouvelle facture
        </h3>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-400">{error}</div>}

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400 mb-3">Choisissez une méthode de création :</p>
          
          {wonDeals.length > 0 && (
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-3">
              <p className="text-xs font-bold text-white">📦 Depuis un deal gagné</p>
              <select value={selectedDeal} onChange={e => setSelectedDeal(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500">
                <option value="">-- Choisir un deal --</option>
                {wonDeals.map(d => (
                  <option key={d._id} value={d._id}>{d.title} — {d.amount?.toLocaleString('fr-FR')} F</option>
                ))}
              </select>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Date d'échéance</label>
                <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500" />
              </div>
              <button onClick={handleCreateFromDeal} disabled={!selectedDeal || loading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs hover:opacity-90 disabled:opacity-50">
                {loading ? 'Génération...' : 'Générer la facture'}
              </button>
            </div>
          )}

          <div className="text-center">
            <span className="text-[10px] text-slate-600">ou</span>
          </div>

          <button onClick={() => setStep(2)}
            className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold hover:bg-slate-800 transition-all">
            ✏️ Créer une facture vierge
          </button>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleCreateManual} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Client</p>
            <input type="text" placeholder="Nom du client *" value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Entreprise" value={form.clientCompany} onChange={e => setForm(f => ({ ...f, clientCompany: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
              <input type="email" placeholder="Email" value={form.clientEmail} onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="tel" placeholder="Téléphone" value={form.clientPhone} onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Articles</p>
              <button type="button" onClick={addItem} className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Ajouter
              </button>
            </div>
            {form.items.map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <input type="text" placeholder="Description" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
                  {form.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="text-rose-400 hover:text-rose-300 p-1">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] text-slate-500 mb-0.5">Qté</label>
                    <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 mb-0.5">Prix unit.</label>
                    <input type="number" min="0" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 mb-0.5">TVA %</label>
                    <input type="number" min="0" max="100" value={item.tva} onChange={e => updateItem(idx, 'tva', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 mb-1">Notes (optionnel)</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none" />
          </div>

          <div className="flex gap-3 pt-2 border-t border-slate-800">
            <button type="button" onClick={() => setStep(1)} className="flex-1 py-2.5 border border-slate-800 rounded-xl text-xs text-slate-400 hover:text-white">
              ← Retour
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs hover:opacity-90 disabled:opacity-50">
              {loading ? 'Création...' : 'Créer la facture'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// === COMPOSANT PRINCIPAL : INVOICE PANEL ===
export default function InvoicePanel({ onClose }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [deals, setDeals] = useState([]);

  const fetchInvoices = useCallback(async () => {
    try {
      let url = `${API_INVOICES}?page=${page}&limit=15`;
      if (statusFilter) url += `&status=${statusFilter}`;
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
        setTotalPages(data.pages || 1);
        setTotalInvoices(data.total || 0);
      }
    } catch (err) {
      console.error('Erreur chargement factures:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => {
    fetch(API_DEALS, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(d => setDeals(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const handlePay = async (invoiceId, total) => {
    try {
      const res = await fetch(`${API_INVOICES}/${invoiceId}/pay`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paidAmount: total })
      });
      if (res.ok) {
        fetchInvoices();
      }
    } catch {}
  };

  const handleDelete = async (invoiceId) => {
    if (!window.confirm('Supprimer cette facture ?')) return;
    try {
      await fetch(`${API_INVOICES}/${invoiceId}`, { method: 'DELETE', credentials: 'include' });
      fetchInvoices();
    } catch {}
  };

  const filteredInvoices = invoices.filter(inv =>
    inv.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.numero?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">Factures</h2>
              <p className="text-[10px] text-slate-500">{totalInvoices} facture(s)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowForm(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold rounded-xl hover:opacity-90 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Nouvelle
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input type="text" placeholder="Rechercher une facture..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none">
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button onClick={fetchInvoices} className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-t-emerald-400 border-slate-700 rounded-full animate-spin" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <FileText className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-xs">Aucune facture trouvée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInvoices.map(inv => (
                <div key={inv._id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800/60 hover:border-emerald-500/20 transition-all group">
                  {/* Numéro */}
                  <div className="w-16 flex-shrink-0">
                    <p className="text-[10px] font-bold font-mono text-emerald-400">{inv.numero?.replace('FAC-', '')}</p>
                  </div>
                  {/* Client */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{inv.clientName}</p>
                    <p className="text-[10px] text-slate-500">{inv.clientCompany || inv.clientEmail || '—'}</p>
                  </div>
                  {/* Montant */}
                  <div className="text-right">
                    <p className="text-xs font-bold font-mono text-white">{Number(inv.total).toLocaleString('fr-FR')} F</p>
                    <p className={`text-[10px] mt-0.5 ${inv.status === 'payé' ? 'text-emerald-400' : inv.status === 'impayé' ? 'text-rose-400' : 'text-slate-500'}`}>
                      {new Date(inv.dueDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  {/* Statut */}
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${STATUS_COLORS[inv.status]}`}>
                    {STATUS_LABELS[inv.status]}
                  </span>
                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => generateInvoicePDF(inv)} title="PDF"
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-emerald-500/40 transition-all">
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    {inv.status !== 'payé' && inv.status !== 'annulé' && (
                      <button onClick={() => handlePay(inv._id, inv.total)} title="Marquer payé"
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/40 transition-all">
                        <CheckCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {inv.status !== 'payé' && (
                      <button onClick={() => handleDelete(inv._id)} title="Supprimer"
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-rose-400 hover:text-rose-300 hover:border-rose-500/40 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between">
            <p className="text-[10px] text-slate-500">Page {page} / {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-2 py-1 text-[10px] bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-lg disabled:opacity-40">
                ← Préc.
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
                className="px-2 py-1 text-[10px] bg-slate-950 border border-slate-800 text-slate-400 hover:text-white rounded-lg disabled:opacity-40">
                Suiv. →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de création */}
      {showForm && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <InvoiceFormModal
              onClose={() => { setShowForm(false); }}
              onRefresh={fetchInvoices}
              deals={deals}
            />
          </div>
        </div>
      )}
    </div>
  );
}
