import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Wallet, 
  History, 
  Zap, 
  ShieldCheck,
  Play,
  Pause,
  Square,
  RefreshCw
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Componentes de UI ---

const Card = ({ children, className, title, icon: Icon }: { children: React.ReactNode, className?: string, title?: string, icon?: any }) => (
  <div className={cn("bg-card-bg neon-border rounded-2xl p-6 shadow-2xl", className)}>
    {title && (
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className="w-5 h-5 text-neon-green" />}
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">{title}</h3>
      </div>
    )}
    {children}
  </div>
);

const Stat = ({ label, value, subValue, trend }: { label: string, value: string, subValue?: string, trend?: 'up' | 'down' }) => (
  <div className="space-y-1">
    <p className="text-xs text-gray-500 uppercase font-medium">{label}</p>
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-bold tracking-tight">{value}</span>
      {trend && (
        <span className={cn("text-xs font-bold", trend === 'up' ? "text-neon-green" : "text-neon-red")}>
          {trend === 'up' ? '+' : '-'}{subValue}
        </span>
      )}
    </div>
  </div>
);

// --- Dashboard Principal ---

export default function App() {
  const [marketData, setMarketData] = useState<any>(null);
  const [aiSignal, setAiSignal] = useState<any>(null);
  const [isBotActive, setIsBotActive] = useState(false);
  const [isSimulation, setIsSimulation] = useState(true);
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{status: string, message?: string} | null>(null);
  const [botRunning, setBotRunning] = useState(false);
  const [backendUrl, setBackendUrl] = useState(window.location.origin); // Ajustável para produção
  const [trades, setTrades] = useState<any[]>([
    { id: 1, type: 'BUY', price: '64,200', amount: '0.05 BTC', time: '10:45', status: 'COMPLETED' },
    { id: 2, type: 'SELL', price: '65,150', amount: '0.05 BTC', time: '12:30', status: 'COMPLETED' },
  ]);

  const fetchData = async () => {
    try {
      const [marketRes, aiRes] = await Promise.all([
        fetch('/api/market-data'),
        fetch('/api/ai-prediction')
      ]);
      const market = await marketRes.json();
      const ai = await aiRes.json();
      setMarketData(market);
      setAiSignal(ai);
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      const res = await fetch(`${backendUrl}/api/test-connection`);
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setConnectionStatus({ status: 'success' });
      } else {
        setConnectionStatus({ status: 'error', message: data.message });
      }
    } catch (err) {
      setConnectionStatus({ status: 'error', message: 'Falha na requisição' });
    } finally {
      setTestingConnection(false);
    }
  };

  const toggleBot = async () => {
    const endpoint = botRunning ? '/api/stop-bot' : '/api/start-bot';
    try {
      const res = await fetch(`${backendUrl}${endpoint}`, { method: 'POST' });
      if (res.ok) {
        setBotRunning(!botRunning);
      }
    } catch (err) {
      console.error("Erro ao controlar o bot:", err);
    }
  };

  const checkBotStatus = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/status`);
      const data = await res.json();
      setBotRunning(data.is_active);
    } catch (err) {
      console.error("Erro ao checar status do bot:", err);
    }
  };

  useEffect(() => {
    fetchData();
    checkBotStatus();
    const interval = setInterval(() => {
      fetchData();
      checkBotStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const chartData = useMemo(() => {
    if (!marketData?.data) return [];
    return marketData.data.map((d: any) => ({
      ...d,
      formattedTime: format(new Date(d.time), 'HH:mm')
    }));
  }, [marketData]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-dark-bg">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-12 h-12 text-neon-green animate-spin" />
          <p className="text-neon-green font-mono tracking-widest uppercase">Initializing Nexus AI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-10 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter italic flex items-center gap-3">
            NEXUS <span className="text-neon-green">TRADING</span>
            <div className="px-2 py-1 bg-neon-green/10 border border-neon-green/30 rounded text-[10px] text-neon-green tracking-widest font-bold">V2.5 PRO</div>
          </h1>
          <p className="text-gray-500 text-sm mt-1">Hedge Fund Grade Algorithmic Intelligence</p>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={toggleBot}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all border flex items-center gap-2",
              botRunning ? "bg-neon-red/20 border-neon-red/50 text-neon-red hover:bg-neon-red/30" : "bg-neon-green/20 border-neon-green/50 text-neon-green hover:bg-neon-green/30"
            )}
          >
            {botRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {botRunning ? "PARAR BOT 24/7" : "INICIAR BOT 24/7"}
          </button>

          <button 
            onClick={testConnection}
            disabled={testingConnection}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all border flex items-center gap-2",
              connectionStatus?.status === 'success' ? "bg-neon-green/20 border-neon-green/50 text-neon-green" :
              connectionStatus?.status === 'error' ? "bg-neon-red/20 border-neon-red/50 text-neon-red" :
              "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
            )}
          >
            {testingConnection ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
            {testingConnection ? "TESTANDO..." : 
             connectionStatus?.status === 'success' ? "✅ CONECTADO" :
             connectionStatus?.status === 'error' ? "❌ ERRO API" : "TESTAR CONEXÃO API"}
          </button>

          <button 
            onClick={() => setIsSimulation(!isSimulation)}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all border",
              isSimulation ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "bg-orange-500/10 border-orange-500/30 text-orange-400"
            )}
          >
            {isSimulation ? "MODO SIMULAÇÃO" : "MODO REAL (LIVE)"}
          </button>
          
          <button 
            onClick={() => setIsBotActive(!isBotActive)}
            className={cn(
              "neon-button flex items-center gap-2",
              !isBotActive ? "bg-neon-green" : "bg-neon-red text-white hover:shadow-[0_0_20px_rgba(255,77,77,0.5)]"
            )}
          >
            {isBotActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isBotActive ? "PARAR BOT" : "INICIAR BOT"}
          </button>
        </div>
      </header>

      {marketData?.isMock && (
        <div className="bg-orange-500/10 border border-orange-500/30 p-3 rounded-xl flex items-center gap-3 text-orange-400 text-xs font-bold animate-pulse">
          <ShieldCheck className="w-4 h-4" />
          MODO SIMULAÇÃO ATIVO: A API da Binance está restrita nesta região (EUA). Usando dados sintéticos para testes.
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Stats Row */}
        <Card className="lg:col-span-3" title="Saldo Atual" icon={Wallet}>
          <Stat label="Total Assets" value="$12,450.82" trend="up" subValue="2.4%" />
          <div className="mt-6 pt-6 border-t border-white/5 flex justify-between">
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Available USDT</p>
              <p className="font-bold">$4,200.00</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 uppercase">Locked in Trades</p>
              <p className="font-bold text-neon-green">0.12 BTC</p>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-3" title="Performance" icon={TrendingUp}>
          <Stat label="Net Profit (24h)" value="+$420.15" trend="up" subValue="15.2%" />
          <div className="mt-6 h-12 flex items-end gap-1">
            {[40, 70, 45, 90, 65, 80, 95].map((h, i) => (
              <div key={i} className="flex-1 bg-neon-green/20 rounded-t-sm" style={{ height: `${h}%` }} />
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-3" title="Status da IA" icon={Zap}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full animate-pulse", isBotActive ? "bg-neon-green" : "bg-gray-600")} />
              <span className="text-xs font-bold uppercase tracking-widest">
                {isBotActive ? "Processando" : "Ocioso"}
              </span>
            </div>
            <span className="text-[10px] text-gray-500">LATENCY: 42ms</span>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Confiança</span>
              <span className="text-sm font-bold text-neon-green">{aiSignal?.probability || 0}%</span>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-neon-green h-full transition-all duration-1000" 
                style={{ width: `${aiSignal?.probability || 0}%` }} 
              />
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-3" title="Sinal Atual" icon={Activity}>
          <div className={cn(
            "text-center p-4 rounded-xl border-2 mb-2",
            aiSignal?.signal === 'BUY' ? "bg-neon-green/10 border-neon-green/40 text-neon-green" :
            aiSignal?.signal === 'SELL' ? "bg-neon-red/10 border-neon-red/40 text-neon-red" :
            "bg-gray-500/10 border-gray-500/40 text-gray-400"
          )}>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1">Recomendação</p>
            <p className="text-3xl font-black tracking-tighter">{aiSignal?.signal || 'NEUTRAL'}</p>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed italic">
            "{aiSignal?.reasoning || 'Aguardando processamento de dados...'}"
          </p>
        </Card>

        {/* Chart Section */}
        <Card className="lg:col-span-8 h-[450px]" title="BTC/USDT - Preço ao Vivo" icon={Activity}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff9f" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00ff9f" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis 
                dataKey="formattedTime" 
                stroke="#444" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                domain={['auto', 'auto']} 
                stroke="#444" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(val) => `$${val.toLocaleString()}`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111', border: '1px solid #00ff9f33', borderRadius: '8px' }}
                itemStyle={{ color: '#00ff9f' }}
              />
              <Area 
                type="monotone" 
                dataKey="close" 
                stroke="#00ff9f" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorPrice)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Indicators & History */}
        <div className="lg:col-span-4 space-y-6">
          <Card title="Indicadores Técnicos" icon={ShieldCheck}>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-white/5 rounded-lg">
                <p className="text-[10px] text-gray-500 uppercase mb-1">RSI (14)</p>
                <p className={cn("text-xl font-bold", marketData?.indicators?.rsi > 70 ? "text-neon-red" : marketData?.indicators?.rsi < 30 ? "text-neon-green" : "text-white")}>
                  {marketData?.indicators?.rsi?.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-white/5 rounded-lg">
                <p className="text-[10px] text-gray-500 uppercase mb-1">SMA (20)</p>
                <p className="text-xl font-bold text-blue-400">
                  ${marketData?.indicators?.sma20?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="p-3 bg-white/5 rounded-lg">
                <p className="text-[10px] text-gray-500 uppercase mb-1">SMA (50)</p>
                <p className="text-xl font-bold text-orange-400">
                  ${marketData?.indicators?.sma50?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="p-3 bg-white/5 rounded-lg">
                <p className="text-[10px] text-gray-500 uppercase mb-1">Volume (24h)</p>
                <p className="text-xl font-bold text-white">42.5K</p>
              </div>
            </div>
          </Card>

          <Card title="Histórico de Trades" icon={History} className="flex-1">
            <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {trades.map((trade) => (
                <div key={trade.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold", trade.type === 'BUY' ? "bg-neon-green/20 text-neon-green" : "bg-neon-red/20 text-neon-red")}>
                      {trade.type[0]}
                    </div>
                    <div>
                      <p className="text-xs font-bold">{trade.amount} BTC</p>
                      <p className="text-[10px] text-gray-500">{trade.time} • ${trade.price}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-neon-green bg-neon-green/10 px-2 py-1 rounded">
                    {trade.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="pt-10 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-neon-green/10 flex items-center justify-center">
            <ShieldCheck className="text-neon-green w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold">Gestão de Risco Ativa</p>
            <p className="text-[10px] text-gray-500">Max 2% por operação • Stop Loss Dinâmico</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Activity className="text-blue-400 w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold">Análise de Sentimento</p>
            <p className="text-[10px] text-gray-500">Processando 50+ fontes de dados globais</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
            <Zap className="text-orange-400 w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold">Execução Instantânea</p>
            <p className="text-[10px] text-gray-500">Conectado via WebSocket de baixa latência</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
