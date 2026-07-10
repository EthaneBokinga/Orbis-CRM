import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, DollarSign } from 'lucide-react';

// Couleurs du thème Orbis
const COLORS = {
  découverte: '#38bdf8',   // sky-400
  proposition: '#60a5fa',  // blue-400
  négociation: '#fbbf24',  // amber-400
  gagné: '#34d399',        // emerald-400
  perdu: '#fb7185',        // rose-400
  objectif: '#64748b',     // slate-500
  realise: '#0d9488',      // teal-600
  grid: '#1e293b',         // slate-800
  text: '#94a3b8',         // slate-400
  textLight: '#cbd5e1'     // slate-300
};

// ==================== 1. PIPELINE PAR ÉTAPE (PieChart) ====================
export function PipelinePieChart({ deals = [] }) {
  const stages = ['découverte', 'proposition', 'négociation', 'gagné', 'perdu'];
  const data = stages.map(stage => ({
    name: stage,
    value: deals.filter(d => d.stage === stage).length,
    montant: deals.filter(d => d.stage === stage).reduce((s, d) => s + (d.amount || 0), 0)
  }));

  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-xs">
        Aucune donnée de pipeline disponible
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-400">Répartition des {total} deals</p>
        <div className="flex items-center gap-1 text-[10px] text-slate-500">
          <DollarSign className="w-3 h-3" />
          {data.reduce((s, d) => s + d.montant, 0).toLocaleString('fr-FR')} F
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={COLORS[entry.name] || '#64748b'} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#f1f5f9'
            }}
            formatter={(value, name, props) => [
              `${value} deals (${props.payload.montant.toLocaleString('fr-FR')} F)`,
              name.charAt(0).toUpperCase() + name.slice(1)
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Légende */}
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        {data.map((d, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: COLORS[d.name] || '#64748b' }} />
            <span className="text-slate-400 capitalize">{d.name}</span>
            <span className="text-slate-500 font-mono ml-auto">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 2. PROGRESSION DES OBJECTIFS (BarChart) ====================
export function GoalsBarChart({ goals = {} }) {
  const periods = ['weekly', 'monthly', 'yearly'];
  const labels = { weekly: 'Hebdo', monthly: 'Mensuel', yearly: 'Annuel' };

  const data = periods.map(p => ({
    name: labels[p],
    Objectif: goals[p]?.goal || 0,
    Réalisé: goals[p]?.current || 0,
    percentage: goals[p]?.percentage || 0
  }));

  const hasData = data.some(d => d.Objectif > 0 || d.Réalisé > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-xs">
        Aucun objectif défini
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: COLORS.text, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: COLORS.text, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
          />
          <Tooltip
            contentStyle={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#f1f5f9'
            }}
            formatter={(value) => [`${value.toLocaleString('fr-FR')} F`, '']}
          />
          <Bar dataKey="Réalisé" radius={[4, 4, 0, 0]} maxBarSize={36}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.percentage >= 100 ? '#34d399' : entry.percentage >= 50 ? '#fbbf24' : '#fb7185'} />
            ))}
          </Bar>
          <Bar dataKey="Objectif" radius={[4, 4, 0, 0]} maxBarSize={36} fill={COLORS.objectif} opacity={0.5} />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-4 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-teal-500 opacity-80" />
          <span className="text-slate-400">Réalisé</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-500 opacity-50" />
          <span className="text-slate-400">Objectif</span>
        </div>
        {data.map(d => (
          <span key={d.name} className={`font-bold font-mono ${d.percentage >= 100 ? 'text-emerald-400' : d.percentage >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
            {d.percentage}%
          </span>
        ))}
      </div>
    </div>
  );
}

// ==================== 3. TOP PERFORMERS (Horizontal BarChart) ====================
export function TopPerformersChart({ top5 = [] }) {
  if (top5.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-xs">
        Chargement des performances...
      </div>
    );
  }

  // Trier par score décroissant pour l'affichage
  const data = [...top5].sort((a, b) => b.performanceScore - a.performanceScore).map(p => ({
    name: p.name?.length > 12 ? p.name.slice(0, 11) + '…' : p.name,
    score: Math.round(p.performanceScore),
    deals: p.wonDeals,
    montant: p.totalAmount
  }));

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={top5.length * 42 + 20}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
          barCategoryGap={6}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: COLORS.textLight, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={90}
          />
          <Tooltip
            contentStyle={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#f1f5f9'
            }}
            formatter={(value, name, props) => {
              if (name === 'score') return [`${value} pts — ${props.payload.deals} deals gagnés`, 'Score'];
              return [value, name];
            }}
          />
          <Bar dataKey="score" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={
                  idx === 0 ? '#f59e0b' :
                  idx === 1 ? '#94a3b8' :
                  idx === 2 ? '#d97706' :
                  '#334155'
                }
                opacity={idx < 3 ? 1 : 0.6}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {/* Badges des médailles */}
      <div className="flex items-center justify-center gap-3 text-[10px] text-slate-500">
        {data.slice(0, 3).map((d, idx) => (
          <span key={idx} className="flex items-center gap-1">
            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} {d.name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ==================== 4. REVENU MENSUEL (LineChart simulé) ====================
export function MonthlyRevenueChart({ deals = [] }) {
  // Grouper les deals gagnés par mois
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const currentYear = new Date().getFullYear();

  const monthlyData = months.map((name, idx) => {
    const total = deals
      .filter(d => {
        const date = new Date(d.createdAt || d.updatedAt);
        return date.getMonth() === idx &&
               date.getFullYear() === currentYear &&
               d.stage === 'gagné';
      })
      .reduce((s, d) => s + (d.amount || 0), 0);
    return { name, revenu: total };
  });

  const totalYear = monthlyData.reduce((s, d) => s + d.revenu, 0);

  if (totalYear === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-xs">
        Aucun deal gagné cette année
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-400">CA mensuel {currentYear}</p>
        <p className="text-xs font-bold font-mono text-emerald-400">
          {totalYear.toLocaleString('fr-FR')} F
        </p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={monthlyData}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: COLORS.text, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={2}
          />
          <YAxis
            tick={{ fill: COLORS.text, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
          />
          <Tooltip
            contentStyle={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#f1f5f9'
            }}
            formatter={(value) => [`${value.toLocaleString('fr-FR')} F`, 'Revenu']}
          />
          <Area
            type="monotone"
            dataKey="revenu"
            stroke="#0d9488"
            strokeWidth={2}
            fill="url(#revenueGradient)"
            dot={{ fill: '#0d9488', stroke: '#0d9488', strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, fill: '#34d399', stroke: '#0f172a', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ==================== 5. REPARTITION PAR AGENT (Stacked Bar) ====================
export function DealsByAgentChart({ dealStats = [] }) {
  if (dealStats.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-xs">
        Aucune donnée agent disponible
      </div>
    );
  }

  const data = dealStats
    .filter(a => a.agentId) // Filtrer les non-assignés
    .slice(0, 8) // Top 8 max
    .map(a => ({
      name: a.agentName?.length > 10 ? a.agentName.slice(0, 9) + '…' : a.agentName || 'Inconnu',
      Découverte: a.stages?.découverte || 0,
      Proposition: a.stages?.proposition || 0,
      Négociation: a.stages?.négociation || 0,
      Gagné: a.stages?.gagné || 0,
      Perdu: a.stages?.perdu || 0,
      total: a.totalDeals
    }));

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-400">Top {data.length} agents — répartition par étape</p>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 36)}>
        <BarChart data={data} layout="vertical" barCategoryGap={4} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: COLORS.textLight, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={80}
          />
          <Tooltip
            contentStyle={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
              fontSize: '11px',
              color: '#f1f5f9'
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '9px', color: COLORS.text }}
            iconType="circle"
            iconSize={8}
          />
          <Bar dataKey="Découverte" stackId="a" fill={COLORS.découverte} radius={[0, 0, 0, 0]} />
          <Bar dataKey="Proposition" stackId="a" fill={COLORS.proposition} />
          <Bar dataKey="Négociation" stackId="a" fill={COLORS.négociation} />
          <Bar dataKey="Gagné" stackId="a" fill={COLORS.gagné} />
          <Bar dataKey="Perdu" stackId="a" fill={COLORS.perdu} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ==================== 6. WIN RATE PAR AGENT (BarChart horizontal) ====================
export function WinRateChart({ topPerformers = [] }) {
  const data = topPerformers
    .filter(p => p.winRate > 0 || p.totalDeals > 0)
    .slice(0, 8)
    .map(p => ({
      name: p.name?.length > 12 ? p.name.slice(0, 11) + '…' : p.name,
      winRate: p.winRate || 0,
      deals: p.wonDeals || 0
    }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-xs">
        Aucune performance disponible
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={data.length * 38 + 20}>
        <BarChart data={[...data].reverse()} layout="vertical" barCategoryGap={8} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: COLORS.text, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
          <YAxis type="category" dataKey="name" tick={{ fill: COLORS.textLight, fontSize: 10 }} axisLine={false} tickLine={false} width={90} />
          <Tooltip
            contentStyle={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
              fontSize: '11px',
              color: '#f1f5f9'
            }}
            formatter={(value, name, props) => [`${value}% (${props.payload.deals} gagnés)`, 'Win Rate']}
          />
          <Bar dataKey="winRate" radius={[0, 6, 6, 0]} maxBarSize={22}>
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={
                  entry.winRate >= 70 ? '#34d399' :
                  entry.winRate >= 40 ? '#fbbf24' :
                  '#fb7185'
                }
                opacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ==================== COMPOSANT PRINCIPAL ====================
export default function AdminCharts({ stats, allDeals, goalsProgress, topPerformers, dealStatsByAgent, loading = false }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900/20 p-5 animate-pulse">
            <div className="h-4 w-32 bg-slate-800 rounded mb-4" />
            <div className="h-48 bg-slate-800/50 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ligne 1 : Pipeline + Objectifs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-5">
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            Pipeline par Étape
          </h4>
          <PipelinePieChart deals={allDeals} />
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-5">
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Objectifs vs Réalisé
          </h4>
          <GoalsBarChart goals={goalsProgress} />
        </div>
      </div>

      {/* Ligne 2 : Revenu mensuel + Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-5">
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            Chiffre d'Affaires Mensuel
          </h4>
          <MonthlyRevenueChart deals={allDeals} />
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-5">
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Top Performers
          </h4>
          <TopPerformersChart top5={topPerformers.top5} />
        </div>
      </div>

      {/* Ligne 3 : Deals par Agent + Win Rate (pleine largeur sur desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-5">
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            Répartition des Deals par Agent
          </h4>
          <DealsByAgentChart dealStats={dealStatsByAgent} />
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-5">
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Win Rate par Agent
          </h4>
          <WinRateChart topPerformers={topPerformers.allPerformers || topPerformers.top5} />
        </div>
      </div>
    </div>
  );
}
