# 🎬 Compressor & Conversor de Vídeos

Ferramenta web para **comprimir e converter vídeos** em diversos formatos —
inspirada no FreeConvert, mas **auto-hospedada** e **sem limites** de tamanho,
duração ou quantidade de conversões. Todo o processamento roda no seu próprio
servidor usando [FFmpeg](https://ffmpeg.org/), então nada é enviado para
serviços de terceiros.

## ✨ Funcionalidades

- **Upload em lote** com arrastar e soltar (vários vídeos de uma vez)
- **Entrada** em praticamente qualquer formato: MP4, MOV, AVI, MKV, WEBM, FLV,
  WMV, MPEG, 3GP, TS, M2TS, OGV, VOB e muitos outros
- **Saída** em: MP4, WebM, MKV, MOV, AVI, FLV, 3GP, GIF animado, WebP animado,
  além de extração de áudio (MP3, AAC, WAV)
- **Codecs**: H.264, H.265/HEVC, VP9, AV1, MPEG-4
- **Modos de compressão**:
  - Por **qualidade** (níveis de máxima qualidade até compressão extrema)
  - Por **tamanho alvo** (defina o tamanho final em MB)
  - Por **redução percentual** (reduza para X% do original)
  - Por **bitrate manual** (kbps)
- **Opções avançadas**: resolução (até 4K), FPS, codec/bitrate de áudio,
  remover áudio, velocidade de encode, codificação em **duas passagens**
- **Acompanhamento de progresso** em tempo real e download direto do resultado
- Mostra **quanto de espaço foi economizado** em cada arquivo
- **Login simples** por email e senha, para uso interno da empresa

## 🧱 Arquitetura

```
┌─────────────┐        HTTP        ┌──────────────────┐
│  Frontend   │  ───────────────►  │     Backend      │
│ React + TS  │   /api/convert     │  FastAPI (Python)│
│  Tailwind   │   /api/jobs/{id}   │       +          │
│  (Vite)     │   /api/download    │     FFmpeg       │
└─────────────┘                    └──────────────────┘
```

- **Backend** (`backend/`): FastAPI recebe os uploads, executa o FFmpeg em
  segundo plano (uma thread por job), reporta o progresso lendo a saída
  `-progress` do FFmpeg e disponibiliza o arquivo final para download. Arquivos
  temporários são limpos automaticamente após o TTL configurado.
- **Frontend** (`frontend/`): interface em React que envia os arquivos,
  acompanha o progresso via polling e permite baixar o resultado.

## 🚀 Como rodar

### Opção 1 — Docker (recomendado para produção)

Requer apenas Docker e Docker Compose instalados. O FFmpeg já vem incluído na
imagem do backend.

```bash
docker compose up --build
```

Acesse **http://localhost:8080**.

Para não ter limite de upload, `MAX_UPLOAD_MB=0` já vem configurado no
`docker-compose.yml` (e o Nginx usa `client_max_body_size 0`).

### Opção 2 — Desenvolvimento local

**Pré-requisito:** ter o **FFmpeg** e o **FFprobe** instalados no sistema.

```bash
# Linux (Debian/Ubuntu)
sudo apt install ffmpeg

# macOS
brew install ffmpeg
```

**Backend:**

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend** (em outro terminal):

```bash
cd frontend
npm install
npm run dev
```

Acesse **http://localhost:3000** (o Vite já faz proxy de `/api` para o
backend na porta 8000).

## 🔐 Login (autenticação)

O acesso é protegido por email e senha. Os usuários são definidos pela
variável de ambiente `AUTH_USERS`, no formato `email:senha` separados por
vírgula:

```bash
AUTH_USERS="joao@empresa.com:senhaForte,maria@empresa.com:outraSenha"
```

- Se `AUTH_USERS` não for definida, um usuário padrão é criado para o primeiro
  acesso: **admin@empresa.com** / **admin123** (a interface avisa e pede para
  trocar).
- As senhas nunca são armazenadas em texto puro — apenas o hash (PBKDF2) fica
  em memória.
- O login devolve um token assinado (HMAC) que expira conforme `TOKEN_TTL`.
- Defina um `SECRET_KEY` fixo em produção para que as sessões continuem válidas
  após reiniciar o servidor.

## ⚙️ Configuração (variáveis de ambiente do backend)

| Variável        | Padrão      | Descrição                                              |
|-----------------|-------------|--------------------------------------------------------|
| `WORK_DIR`      | tempdir     | Diretório dos arquivos temporários                     |
| `FILE_TTL`      | `3600`      | Segundos até os arquivos temporários expirarem         |
| `MAX_UPLOAD_MB` | `0`         | Limite de upload em MB (`0` = sem limite)              |
| `AUTH_USERS`    | *(padrão)*  | Usuários no formato `email:senha,email2:senha2`        |
| `SECRET_KEY`    | aleatório   | Segredo para assinar os tokens (defina em produção)    |
| `TOKEN_TTL`     | `43200`     | Validade da sessão em segundos (padrão 12h)            |

## 🔌 API

| Método | Rota                      | Auth | Descrição                              |
|--------|---------------------------|------|----------------------------------------|
| GET    | `/api/health`             | não  | Status e disponibilidade do FFmpeg     |
| POST   | `/api/login`              | não  | Autentica e devolve o token de sessão  |
| GET    | `/api/me`                 | sim  | Retorna o email do usuário logado      |
| GET    | `/api/formats`            | sim  | Formatos, codecs e opções suportados   |
| POST   | `/api/convert`            | sim  | Envia um vídeo e inicia a conversão    |
| GET    | `/api/jobs/{id}`          | sim  | Status/progresso de um job             |
| POST   | `/api/jobs/{id}/cancel`   | sim  | Cancela um job em andamento            |
| GET    | `/api/download/{id}`      | sim* | Baixa o resultado (token na query)     |

\* O download aceita o token via `?token=` na URL, pois é aberto por link direto.

Documentação interativa (Swagger) disponível em `/docs` no backend.

## 📝 Observações

- Os arquivos ficam em disco apenas durante o processamento e até o `FILE_TTL`
  expirar; depois são removidos automaticamente.
- Para vídeos muito grandes, ajuste os timeouts do proxy/Nginx e o espaço em
  disco do servidor. Não há limites impostos pela aplicação.
- Codecs como **AV1** oferecem a maior compressão, porém são mais lentos para
  codificar. **H.265** é um bom equilíbrio; **H.264** é o mais compatível.
