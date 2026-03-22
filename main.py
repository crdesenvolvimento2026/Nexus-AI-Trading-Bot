import os
import asyncio
import logging
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import ccxt.async_support as ccxt
from dotenv import load_dotenv
from pydantic import BaseModel

# Configuração de Logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="Pro Crypto Trading Bot API")

# Configuração de CORS para o Frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Estado Global do Bot ---
class BotState:
    def __init__(self):
        self.is_active = False
        self.symbol = "BTC/USDT"
        self.last_price = 0.0
        self.balance_usdt = 0.0
        self.task: Optional[asyncio.Task] = None
        self.logs = []

bot_state = BotState()

# --- Inicialização da Exchange ---
def get_exchange():
    return ccxt.binance({
        'apiKey': os.getenv("BINANCE_API_KEY", ""),
        'secret': os.getenv("BINANCE_SECRET_KEY", ""),
        'enableRateLimit:': True,
        'options': {'defaultType': 'spot'}
    })

# --- Lógica do Bot (Loop 24/7) ---
async def trading_loop():
    exchange = get_exchange()
    logger.info(f"Iniciando loop de trading para {bot_state.symbol}")
    
    try:
        while bot_state.is_active:
            try:
                # 1. Buscar Preço Atual
                ticker = await exchange.fetch_ticker(bot_state.symbol)
                bot_state.last_price = ticker['last']
                
                # 2. Lógica de Estratégia (Exemplo Simples)
                # Aqui você integraria indicadores técnicos ou chamadas de IA
                logger.info(f"Preço Atual {bot_state.symbol}: {bot_state.last_price}")
                
                # 3. Simulação de Log de Trade
                # if strategy_signal == 'BUY':
                #     await exchange.create_market_buy_order(bot_state.symbol, amount)
                
                await asyncio.sleep(10) # Intervalo entre verificações
                
            except Exception as e:
                logger.error(f"Erro no loop de trading: {e}")
                await asyncio.sleep(30) # Espera mais tempo em caso de erro
    finally:
        await exchange.close()
        logger.info("Loop de trading encerrado.")

# --- Endpoints API ---

@app.get("/api/status")
async def get_status():
    return {
        "is_active": bot_state.is_active,
        "symbol": bot_state.symbol,
        "last_price": bot_state.last_price,
        "balance_usdt": bot_state.balance_usdt
    }

@app.get("/api/test-connection")
async def test_connection():
    exchange = get_exchange()
    try:
        if not exchange.apiKey or not exchange.secret:
            raise HTTPException(status_code=400, detail="Chaves API não configuradas")
            
        balance = await exchange.fetch_balance()
        bot_state.balance_usdt = balance['total'].get('USDT', 0.0)
        
        return {
            "status": "success",
            "connection": "ok",
            "usdt_balance": bot_state.balance_usdt
        }
    except Exception as e:
        logger.error(f"Erro de conexão: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        await exchange.close()

@app.post("/api/start-bot")
async def start_bot():
    if bot_state.is_active:
        return {"message": "Bot já está rodando"}
    
    bot_state.is_active = True
    bot_state.task = asyncio.create_task(trading_loop())
    return {"message": "Bot iniciado com sucesso"}

@app.post("/api/stop-bot")
async def stop_bot():
    if not bot_state.is_active:
        return {"message": "Bot já está parado"}
    
    bot_state.is_active = False
    if bot_state.task:
        bot_state.task.cancel()
    return {"message": "Bot parado com sucesso"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
