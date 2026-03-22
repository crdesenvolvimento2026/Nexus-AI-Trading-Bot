# 🚀 Guia de Deploy Profissional - Trading Bot 24/7

Este guia descreve como rodar seu sistema de trading fora do ambiente restrito do Google AI Studio, garantindo operação contínua e sem bloqueios geográficos.

---

## 🏗️ Arquitetura Recomendada

1.  **Backend (Python/FastAPI)**: Hospedado em um servidor na **Europa (Londres/Frankfurt)** ou **Brasil (São Paulo)** para evitar bloqueios da Binance.com.
2.  **Frontend (React)**: Hospedado em serviços estáticos como Vercel ou Netlify.
3.  **Banco de Dados**: SQLite (incluso no código) ou PostgreSQL para logs de trades.

---

## ☁️ Opções de Deploy

### Opção 1: Railway (Recomendado - Mais Fácil)
1.  Crie uma conta em [railway.app](https://railway.app).
2.  Conecte seu repositório GitHub.
3.  Adicione as variáveis de ambiente:
    - `BINANCE_API_KEY`
    - `BINANCE_SECRET_KEY`
4.  O Railway detectará o `Dockerfile.backend` e fará o deploy automático.
5.  **Importante**: Escolha uma região fora dos EUA nas configurações do projeto.

### Opção 2: Render (Gratuito/Barato)
1.  Crie um "Web Service" no Render.
2.  Aponte para o seu repositório.
3.  Configure o comando de build: `pip install -r requirements.txt`.
4.  Configure o comando de start: `uvicorn main:app --host 0.0.0.0 --port 8000`.

### Opção 3: VPS (DigitalOcean / Linode / AWS)
1.  Crie uma instância (Droplet) com Ubuntu 22.04.
2.  Instale o Docker: `curl -fsSL https://get.docker.com | sh`.
3.  Clone seu código e rode:
    ```bash
    docker build -t trading-bot -f Dockerfile.backend .
    docker run -d -p 8000:8000 --env-file .env trading-bot
    ```

---

## 🔐 Segurança em Produção

- **IP Whitelisting**: Na Binance, configure sua API Key para aceitar ordens apenas do IP fixo do seu servidor.
- **HTTPS**: Use um domínio com SSL (Railway e Render fornecem isso automaticamente).
- **Monitoramento**: Use o endpoint `/api/status` para verificar se o bot está ativo.

---

## 🔄 Como Rodar Localmente

1.  Instale as dependências: `pip install -r requirements.txt`.
2.  Crie um arquivo `.env` com suas chaves.
3.  Rode o servidor: `python main.py`.
4.  Acesse a documentação automática em: `http://localhost:8000/docs`.
