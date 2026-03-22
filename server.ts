import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import ccxt from "ccxt";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

// Configuração da Binance (Carrega chaves se disponíveis)
const exchange = new ccxt.binance({
  apiKey: process.env.BINANCE_API_KEY || "",
  secret: process.env.BINANCE_SECRET || "",
  enableRateLimit: true,
});

// --- Lógica de Trading & Indicadores ---

function calculateRSI(prices: number[], period = 14) {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
  }
  return 100 - (100 / (1 + avgGain / avgLoss));
}

function calculateSMA(prices: number[], period: number) {
  if (prices.length < period) return prices[prices.length - 1];
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// --- Gerador de Dados de Simulação (Fallback para regiões restritas) ---

function generateMockOHLCV(count: number) {
  let price = 65000 + (Math.random() * 1000);
  const data = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 200;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + (Math.random() * 50);
    const low = Math.min(open, close) - (Math.random() * 50);
    data.push([
      now - (count - i) * 3600000,
      open, high, low, close,
      Math.random() * 100
    ]);
    price = close;
  }
  return data;
}

// --- Estado Global do Bot (Mock para Preview) ---
let botState = {
  is_active: false,
  symbol: "BTC/USDT",
  last_price: 65000.0,
  balance_usdt: 1000.0
};

// --- Endpoints da API ---

app.get("/api/status", (req, res) => {
  res.json(botState);
});

app.post("/api/start-bot", (req, res) => {
  botState.is_active = true;
  res.json({ message: "Bot iniciado (Preview)" });
});

app.post("/api/stop-bot", (req, res) => {
  botState.is_active = false;
  res.json({ message: "Bot parado (Preview)" });
});

app.get("/api/test-connection", async (req, res) => {
  try {
    // Tenta buscar o saldo real se as chaves estiverem configuradas
    if (process.env.BINANCE_API_KEY && process.env.BINANCE_SECRET_KEY) {
      const balance = await exchange.fetchBalance();
      res.json({ 
        status: "success", 
        connection: "ok", 
        usdt_balance: balance.total.USDT || 0 
      });
    } else {
      // Se não houver chaves, simula sucesso para o preview
      res.json({ 
        status: "success", 
        connection: "simulated", 
        usdt_balance: 1000.0 
      });
    }
  } catch (error: any) {
    res.status(400).json({ status: "error", message: error.message });
  }
});

app.get("/api/market-data", async (req, res) => {
  try {
    const symbol = "BTC/USDT";
    const timeframe = "1h";
    let ohlcv;
    let isMock = false;

    try {
      ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, 50);
    } catch (error: any) {
      if (error.message.includes("restricted location") || error.message.includes("Service unavailable")) {
        console.warn("[Binance] Região restrita detectada. Usando dados de simulação.");
        ohlcv = generateMockOHLCV(50);
        isMock = true;
      } else {
        throw error;
      }
    }
    
    const formattedData = ohlcv.map((candle) => ({
      time: candle[0],
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5],
    }));

    const closes = formattedData.map(d => d.close);
    const rsi = calculateRSI(closes);
    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);

    res.json({
      symbol,
      isMock,
      data: formattedData,
      indicators: {
        rsi,
        sma20,
        sma50,
        currentPrice: closes[closes.length - 1]
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar dados do mercado" });
  }
});

app.get("/api/test-connection", async (req, res) => {
  try {
    // Se estiver em simulação forçada ou sem chaves, retorna sucesso simulado
    if (!exchange.apiKey || !exchange.secret) {
      return res.json({
        status: "success",
        connection: "simulated",
        usdt_balance: 10000.00,
        message: "Modo Simulação Ativo (Sem chaves API)"
      });
    }
    
    console.log("[Binance] Testando conexão...");
    const balance = await exchange.fetchBalance();
    
    res.json({
      status: "success",
      connection: "ok",
      usdt_balance: balance.total["USDT"] || 0,
      total_assets: balance.total
    });
  } catch (error: any) {
    const isRestricted = error.message.includes("restricted location") || error.message.includes("Service unavailable");
    
    if (isRestricted) {
      console.warn("[Binance] Região restrita. Fornecendo conexão simulada para o dashboard.");
      return res.json({
        status: "success",
        connection: "restricted_mock",
        usdt_balance: 5000.00,
        message: "Conexão Simulada (Região Restrita: EUA)"
      });
    }

    res.status(401).json({
      status: "error",
      message: error.message || "Erro de conexão"
    });
  }
});

app.get("/api/ai-prediction", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      console.warn("[AI] Chave API do Gemini não configurada ou inválida.");
      return res.json({ 
        signal: "NEUTRAL", 
        probability: 0, 
        reasoning: "IA desativada: Configure a GEMINI_API_KEY no menu de Secrets.",
        isMock: true 
      });
    }

    const genAI = new GoogleGenAI({ apiKey });
    const symbol = "BTC/USDT";
    let ohlcv;
    let isMock = false;

    try {
      ohlcv = await exchange.fetchOHLCV(symbol, "1h", undefined, 24);
    } catch (error: any) {
      if (error.message.includes("restricted location") || error.message.includes("Service unavailable")) {
        console.warn("[AI] Região restrita. Usando dados simulados para previsão.");
        ohlcv = generateMockOHLCV(24);
        isMock = true;
      } else {
        throw error;
      }
    }

    const dataString = ohlcv.map(c => `H:${c[2]} L:${c[3]} C:${c[4]}`).join(" | ");
    const model = "gemini-3-flash-preview";
    const prompt = `Analise os seguintes dados de preço de 24h do ${symbol}: ${dataString}. 
    Com base em análise técnica (RSI, tendências, volume), qual a probabilidade de alta nas próximas 4h?
    Responda em JSON com os campos: "signal" (BUY, SELL ou NEUTRAL), "probability" (0-100), "reasoning" (curta explicação em português).`;

    console.log(`[AI] Generating prediction for ${symbol} (Mock: ${isMock})...`);
    const response = await genAI.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    
    const result = JSON.parse(response.text || "{}");
    res.json({ ...result, isMock });
  } catch (error) {
    console.error("[AI] Erro:", error);
    res.status(500).json({ error: "Erro na IA" });
  }
});

// --- Configuração Full-Stack ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
