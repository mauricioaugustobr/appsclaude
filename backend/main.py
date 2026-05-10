from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
import hashlib

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Rastreador de Ações Brasileiras", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base prices and characteristics for each stock
ACOES_POPULARES = [
    {"symbol": "PETR4.SA",  "name": "Petrobras PN",        "sector": "Energia",              "preco_base": 38.50,  "vol": 0.025, "drift": 0.0002},
    {"symbol": "VALE3.SA",  "name": "Vale",                 "sector": "Mineração",            "preco_base": 64.80,  "vol": 0.022, "drift": -0.0001},
    {"symbol": "ITUB4.SA",  "name": "Itaú Unibanco PN",    "sector": "Financeiro",           "preco_base": 33.20,  "vol": 0.018, "drift": 0.0003},
    {"symbol": "BBDC4.SA",  "name": "Bradesco PN",          "sector": "Financeiro",           "preco_base": 16.90,  "vol": 0.020, "drift": -0.0002},
    {"symbol": "ABEV3.SA",  "name": "Ambev",                "sector": "Consumo",              "preco_base": 13.40,  "vol": 0.015, "drift": 0.0001},
    {"symbol": "WEGE3.SA",  "name": "WEG",                  "sector": "Industrial",           "preco_base": 51.80,  "vol": 0.019, "drift": 0.0004},
    {"symbol": "BBAS3.SA",  "name": "Banco do Brasil",      "sector": "Financeiro",           "preco_base": 59.40,  "vol": 0.021, "drift": 0.0002},
    {"symbol": "MGLU3.SA",  "name": "Magazine Luiza",       "sector": "Varejo",               "preco_base": 5.30,   "vol": 0.045, "drift": -0.0005},
    {"symbol": "LREN3.SA",  "name": "Lojas Renner",         "sector": "Varejo",               "preco_base": 17.60,  "vol": 0.028, "drift": 0.0001},
    {"symbol": "SUZB3.SA",  "name": "Suzano",               "sector": "Papel e Celulose",     "preco_base": 55.20,  "vol": 0.023, "drift": 0.0003},
    {"symbol": "RENT3.SA",  "name": "Localiza",             "sector": "Aluguel de Veículos",  "preco_base": 68.90,  "vol": 0.022, "drift": 0.0002},
    {"symbol": "GGBR4.SA",  "name": "Gerdau PN",            "sector": "Siderurgia",           "preco_base": 18.20,  "vol": 0.027, "drift": -0.0001},
    {"symbol": "KLBN11.SA", "name": "Klabin",               "sector": "Papel e Celulose",     "preco_base": 22.50,  "vol": 0.020, "drift": 0.0002},
    {"symbol": "RADL3.SA",  "name": "RaiaDrogasil",         "sector": "Saúde",                "preco_base": 31.80,  "vol": 0.017, "drift": 0.0003},
    {"symbol": "JBSS3.SA",  "name": "JBS",                  "sector": "Alimentos",            "preco_base": 32.60,  "vol": 0.024, "drift": 0.0001},
    {"symbol": "EMBR3.SA",  "name": "Embraer",              "sector": "Aeronáutico",          "preco_base": 46.70,  "vol": 0.026, "drift": 0.0004},
    {"symbol": "PRIO3.SA",  "name": "PetroRio",             "sector": "Energia",              "preco_base": 52.40,  "vol": 0.030, "drift": 0.0002},
    {"symbol": "CSAN3.SA",  "name": "Cosan",                "sector": "Energia",              "preco_base": 17.80,  "vol": 0.028, "drift": -0.0001},
    {"symbol": "VIVT3.SA",  "name": "Telefônica Brasil",    "sector": "Telecom",              "preco_base": 50.20,  "vol": 0.014, "drift": 0.0001},
    {"symbol": "TOTS3.SA",  "name": "Totvs",                "sector": "Tecnologia",           "preco_base": 29.60,  "vol": 0.022, "drift": 0.0003},
]

ACOES_MAP = {a["symbol"]: a for a in ACOES_POPULARES}


def _seed_for(symbol: str, date_str: str) -> int:
    """Deterministic seed from symbol + date so data is stable per day."""
    return int(hashlib.md5(f"{symbol}:{date_str}".encode()).hexdigest(), 16) % (2**31)


def _gerar_historico(symbol: str, periodo: str) -> pd.DataFrame:
    """Generate realistic OHLCV data using GBM."""
    meta = ACOES_MAP.get(symbol)
    if meta is None:
        raise HTTPException(status_code=404, detail=f"Ação {symbol} não encontrada.")

    dias_map = {"1mo": 30, "3mo": 90, "6mo": 180, "1y": 252}
    n_dias_cal = dias_map.get(periodo, 90)

    # Only trading days (Mon-Fri)
    end = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    dates = pd.bdate_range(end=end, periods=n_dias_cal)

    # Fixed seed per symbol+today for reproducibility within the same day
    today_str = end.strftime("%Y-%m-%d")
    rng = np.random.default_rng(_seed_for(symbol, today_str))

    n = len(dates)
    vol = meta["vol"]
    drift = meta["drift"]
    preco_base = meta["preco_base"]

    # GBM returns
    returns = rng.normal(drift, vol, n)
    prices = preco_base * np.exp(np.cumsum(returns))

    # Intraday noise for OHLC
    daily_range = np.abs(rng.normal(0, vol * 0.6, n))
    opens  = prices * (1 + rng.uniform(-0.005, 0.005, n))
    highs  = np.maximum(opens, prices) * (1 + daily_range)
    lows   = np.minimum(opens, prices) * (1 - daily_range)

    avg_vol = meta["preco_base"] * 1_000_000 / preco_base
    volumes = (rng.lognormal(np.log(avg_vol), 0.5, n)).astype(int)

    df = pd.DataFrame({
        "Date": dates,
        "Open": opens.round(2),
        "High": highs.round(2),
        "Low":  lows.round(2),
        "Close": prices.round(2),
        "Volume": volumes,
    })
    return df


def calc_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def calc_macd(close: pd.Series, fast=12, slow=26, signal=9):
    ema_fast = close.ewm(span=fast, adjust=False).mean()
    ema_slow = close.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    return macd_line, signal_line


def calc_sma(close: pd.Series, period: int) -> pd.Series:
    return close.rolling(window=period).mean()


def calc_bollinger(close: pd.Series, period=20, std_dev=2):
    sma = close.rolling(window=period).mean()
    std = close.rolling(window=period).std()
    upper = sma + std_dev * std
    lower = sma - std_dev * std
    return upper, sma, lower


def calcular_sinal(df: pd.DataFrame) -> dict:
    if df is None or len(df) < 30:
        return {"sinal": "NEUTRO", "score": 0, "detalhes": {}}

    close = df["Close"].squeeze().astype(float)
    sinais = {}
    score = 0

    # RSI
    rsi_s = calc_rsi(close, 14)
    rsi_val = float(rsi_s.iloc[-1]) if not pd.isna(rsi_s.iloc[-1]) else None
    if rsi_val is not None:
        sinais["rsi"] = {"valor": round(rsi_val, 2)}
        if rsi_val < 30:
            sinais["rsi"]["sinal"] = "FORTE COMPRA"; score += 2
        elif rsi_val < 45:
            sinais["rsi"]["sinal"] = "COMPRA"; score += 1
        elif rsi_val > 70:
            sinais["rsi"]["sinal"] = "FORTE VENDA"; score -= 2
        elif rsi_val > 55:
            sinais["rsi"]["sinal"] = "VENDA"; score -= 1
        else:
            sinais["rsi"]["sinal"] = "NEUTRO"

    # MACD
    macd_line, signal_line = calc_macd(close)
    if len(macd_line) >= 2:
        mv, sv = float(macd_line.iloc[-1]), float(signal_line.iloc[-1])
        mp, sp = float(macd_line.iloc[-2]), float(signal_line.iloc[-2])
        sinais["macd"] = {"macd": round(mv, 4), "signal": round(sv, 4)}
        if mp < sp and mv > sv:
            sinais["macd"]["sinal"] = "FORTE COMPRA"; score += 2
        elif mv > sv:
            sinais["macd"]["sinal"] = "COMPRA"; score += 1
        elif mp > sp and mv < sv:
            sinais["macd"]["sinal"] = "FORTE VENDA"; score -= 2
        else:
            sinais["macd"]["sinal"] = "VENDA"; score -= 1

    # Médias Móveis
    sma20 = calc_sma(close, 20)
    sma50 = calc_sma(close, 50)
    s20 = float(sma20.iloc[-1]) if not pd.isna(sma20.iloc[-1]) else None
    s50 = float(sma50.iloc[-1]) if not pd.isna(sma50.iloc[-1]) else None
    preco = float(close.iloc[-1])
    if s20 and s50:
        s20p = float(sma20.iloc[-2]) if not pd.isna(sma20.iloc[-2]) else s20
        s50p = float(sma50.iloc[-2]) if not pd.isna(sma50.iloc[-2]) else s50
        sinais["medias_moveis"] = {"sma20": round(s20, 2), "sma50": round(s50, 2), "preco": round(preco, 2)}
        if s20p < s50p and s20 > s50:
            sinais["medias_moveis"]["sinal"] = "FORTE COMPRA (Golden Cross)"; score += 2
        elif s20p > s50p and s20 < s50:
            sinais["medias_moveis"]["sinal"] = "FORTE VENDA (Death Cross)"; score -= 2
        elif preco > s20 and preco > s50:
            sinais["medias_moveis"]["sinal"] = "COMPRA"; score += 1
        elif preco < s20 and preco < s50:
            sinais["medias_moveis"]["sinal"] = "VENDA"; score -= 1
        else:
            sinais["medias_moveis"]["sinal"] = "NEUTRO"

    # Bollinger Bands
    bbu_s, bbm_s, bbl_s = calc_bollinger(close)
    bbu = float(bbu_s.iloc[-1]) if not pd.isna(bbu_s.iloc[-1]) else None
    bbm = float(bbm_s.iloc[-1]) if not pd.isna(bbm_s.iloc[-1]) else None
    bbl = float(bbl_s.iloc[-1]) if not pd.isna(bbl_s.iloc[-1]) else None
    if bbu and bbm and bbl and (bbu - bbl) > 0:
        pct_b = (preco - bbl) / (bbu - bbl)
        sinais["bollinger"] = {
            "superior": round(bbu, 2), "media": round(bbm, 2),
            "inferior": round(bbl, 2), "pct_b": round(pct_b, 2),
        }
        if pct_b < 0.05:
            sinais["bollinger"]["sinal"] = "FORTE COMPRA"; score += 2
        elif pct_b < 0.2:
            sinais["bollinger"]["sinal"] = "COMPRA"; score += 1
        elif pct_b > 0.95:
            sinais["bollinger"]["sinal"] = "FORTE VENDA"; score -= 2
        elif pct_b > 0.8:
            sinais["bollinger"]["sinal"] = "VENDA"; score -= 1
        else:
            sinais["bollinger"]["sinal"] = "NEUTRO"

    if score >= 4:
        sinal_final = "FORTE COMPRA"
    elif score >= 2:
        sinal_final = "COMPRA"
    elif score <= -4:
        sinal_final = "FORTE VENDA"
    elif score <= -2:
        sinal_final = "VENDA"
    else:
        sinal_final = "NEUTRO"

    return {"sinal": sinal_final, "score": score, "detalhes": sinais}


def _meta_info(meta: dict) -> dict:
    base = meta["preco_base"]
    return {
        "nome": meta["name"],
        "setor": meta["sector"],
        "industria": meta["sector"],
        "market_cap": int(base * 1e9 * (5 + base / 10)),
        "pe_ratio": round(8 + base / 10, 1),
        "dividend_yield": round(0.04 + meta["drift"] * 50, 4),
        "52w_high": round(base * 1.35, 2),
        "52w_low": round(base * 0.72, 2),
    }


@app.get("/api/acoes")
def listar_acoes():
    return {"acoes": [{"symbol": a["symbol"], "name": a["name"], "sector": a["sector"]} for a in ACOES_POPULARES]}


@app.get("/api/acao/{symbol}")
def buscar_acao(
    symbol: str,
    periodo: str = Query("3mo"),
):
    ticker_symbol = symbol.upper()
    if not ticker_symbol.endswith(".SA"):
        ticker_symbol += ".SA"

    df = _gerar_historico(ticker_symbol, periodo)
    meta = ACOES_MAP[ticker_symbol]
    analise = calcular_sinal(df)

    historico = [
        {
            "data": row["Date"].strftime("%Y-%m-%d"),
            "abertura": float(row["Open"]),
            "maxima": float(row["High"]),
            "minima": float(row["Low"]),
            "fechamento": float(row["Close"]),
            "volume": int(row["Volume"]),
        }
        for _, row in df.iterrows()
    ]

    preco_atual = historico[-1]["fechamento"]
    preco_ontem = historico[-2]["fechamento"] if len(historico) >= 2 else None
    variacao = round(preco_atual - preco_ontem, 2) if preco_ontem else None
    variacao_pct = round((variacao / preco_ontem) * 100, 2) if preco_ontem and preco_ontem > 0 else None

    return {
        "symbol": ticker_symbol,
        "info": _meta_info(meta),
        "preco_atual": preco_atual,
        "variacao": variacao,
        "variacao_pct": variacao_pct,
        "historico": historico,
        "analise": analise,
    }


@app.get("/api/resumo")
def resumo_mercado():
    resultados = []
    for meta in ACOES_POPULARES[:12]:
        try:
            df = _gerar_historico(meta["symbol"], "3mo")
            analise = calcular_sinal(df)
            preco_atual = float(df["Close"].iloc[-1])
            preco_ontem = float(df["Close"].iloc[-2]) if len(df) >= 2 else None
            variacao_pct = None
            if preco_ontem and preco_ontem > 0:
                variacao_pct = round(((preco_atual - preco_ontem) / preco_ontem) * 100, 2)
            resultados.append({
                "symbol": meta["symbol"],
                "name": meta["name"],
                "sector": meta["sector"],
                "preco": round(preco_atual, 2),
                "variacao_pct": variacao_pct,
                "sinal": analise["sinal"],
                "score": analise["score"],
            })
        except Exception as e:
            logger.warning(f"Erro ao processar {meta['symbol']}: {e}")
    resultados.sort(key=lambda x: x.get("score", 0), reverse=True)
    return {"resumo": resultados, "atualizado_em": datetime.now().isoformat()}


@app.get("/api/buscar")
def buscar_ticker(q: str = Query(...)):
    symbol = q.upper()
    if not symbol.endswith(".SA"):
        symbol += ".SA"
    if symbol in ACOES_MAP:
        df = _gerar_historico(symbol, "5d")
        return {"encontrado": True, "symbol": symbol, "preco": round(float(df["Close"].iloc[-1]), 2)}
    return {"encontrado": False, "symbol": symbol}
