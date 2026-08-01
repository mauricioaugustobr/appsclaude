"""
API do Compressor e Conversor de Vídeos.

Backend FastAPI que recebe uploads de vídeo, executa a conversão/compressão
com FFmpeg em segundo plano e disponibiliza o download do resultado. Sem
limites artificiais de tamanho ou quantidade — os limites são apenas os
recursos do servidor onde a aplicação roda.
"""
from __future__ import annotations

import os
import shutil
import tempfile
import threading
import time
import uuid

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

import converter
from converter import ConvertOptions
from jobs import JobManager

# Diretório de trabalho (uploads + saídas). Configurável por env.
WORK_DIR = os.environ.get("WORK_DIR", os.path.join(tempfile.gettempdir(), "video_convert"))
os.makedirs(WORK_DIR, exist_ok=True)

# Tempo de vida dos arquivos temporários (segundos)
FILE_TTL = int(os.environ.get("FILE_TTL", "3600"))

# Tamanho máximo de upload em MB (0 = sem limite)
MAX_UPLOAD_MB = int(os.environ.get("MAX_UPLOAD_MB", "0"))

app = FastAPI(title="Compressor e Conversor de Vídeos", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = JobManager(WORK_DIR, ttl_seconds=FILE_TTL)


# ---------------------------------------------------------------------------
# Limpeza periódica dos arquivos expirados
# ---------------------------------------------------------------------------
def _cleanup_loop():
    while True:
        time.sleep(300)
        try:
            manager.cleanup_expired()
        except Exception:
            pass


threading.Thread(target=_cleanup_loop, daemon=True).start()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "ffmpeg_available": converter.ffmpeg_available(),
        "ffmpeg_version": converter.ffmpeg_version(),
    }


@app.get("/api/formats")
def formats():
    """Formatos, codecs, níveis e resoluções suportados (para a UI)."""
    return {
        "input_extensions": converter.INPUT_EXTENSIONS,
        "output_formats": [
            {
                "id": key,
                "label": fmt.label,
                "ext": fmt.ext,
                "codecs": [
                    {"id": c, "label": converter.VIDEO_CODECS[c]["label"]}
                    for c in fmt.codecs if c in converter.VIDEO_CODECS
                ],
                "audio_only": fmt.audio_only,
                "animated_image": fmt.animated_image,
                "default_codec": fmt.default_vcodec,
            }
            for key, fmt in converter.OUTPUT_FORMATS.items()
        ],
        "compression_levels": [
            {"id": k, "label": v["label"]}
            for k, v in converter.COMPRESSION_LEVELS.items()
        ],
        "resolutions": list(converter.RESOLUTIONS.keys()),
        "speed_presets": converter.SPEED_PRESETS,
        "audio_codecs": list(converter.AUDIO_CODECS.keys()),
        "max_upload_mb": MAX_UPLOAD_MB,
    }


def _save_upload(file: UploadFile) -> tuple[str, int]:
    """Salva o upload em disco em streaming e retorna (caminho, tamanho)."""
    ext = os.path.splitext(file.filename or "")[1] or ".bin"
    dest = os.path.join(WORK_DIR, f"in_{uuid.uuid4().hex[:12]}{ext}")
    size = 0
    limit = MAX_UPLOAD_MB * 1024 * 1024 if MAX_UPLOAD_MB > 0 else None
    with open(dest, "wb") as out:
        while True:
            chunk = file.file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if limit and size > limit:
                out.close()
                os.remove(dest)
                raise HTTPException(
                    status_code=413,
                    detail=f"Arquivo excede o limite de {MAX_UPLOAD_MB} MB.",
                )
            out.write(chunk)
    return dest, size


@app.post("/api/convert")
async def convert(
    file: UploadFile = File(...),
    output_format: str = Form("mp4"),
    codec: str = Form(""),
    audio_codec: str = Form(""),
    mode: str = Form("quality"),
    level: str = Form("balanced"),
    target_size_mb: float = Form(0),
    target_percent: float = Form(0),
    video_bitrate_kbps: int = Form(0),
    audio_bitrate_kbps: int = Form(128),
    resolution: str = Form("original"),
    fps: int = Form(0),
    speed: str = Form("medium"),
    remove_audio: bool = Form(False),
    two_pass: bool = Form(False),
    trim_start: float = Form(0),
    trim_end: float = Form(0),
):
    if not converter.ffmpeg_available():
        raise HTTPException(
            status_code=503,
            detail="FFmpeg não está instalado no servidor. Instale-o para converter vídeos.",
        )
    if output_format not in converter.OUTPUT_FORMATS:
        raise HTTPException(status_code=400, detail="Formato de saída inválido.")

    input_path, size = _save_upload(file)

    options = ConvertOptions(
        output_format=output_format,
        codec=codec or None,
        audio_codec=audio_codec or None,
        mode=mode,
        level=level,
        target_size_mb=target_size_mb or None,
        target_percent=target_percent or None,
        video_bitrate_kbps=video_bitrate_kbps or None,
        audio_bitrate_kbps=audio_bitrate_kbps,
        resolution=resolution,
        fps=fps or None,
        speed=speed,
        remove_audio=remove_audio,
        two_pass=two_pass,
        trim_start=trim_start or None,
        trim_end=trim_end or None,
    )

    job = manager.create_job(input_path, file.filename or "video", size, options)
    return manager.to_dict(job)


@app.get("/api/jobs/{job_id}")
def job_status(job_id: str):
    job = manager.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado.")
    return manager.to_dict(job)


@app.post("/api/jobs/{job_id}/cancel")
def cancel_job(job_id: str):
    ok = manager.cancel(job_id)
    if not ok:
        raise HTTPException(status_code=400, detail="Não foi possível cancelar o job.")
    return {"status": "canceled"}


@app.get("/api/download/{job_id}")
def download(job_id: str):
    job = manager.get(job_id)
    if not job or job.status != "done" or not job.output_path:
        raise HTTPException(status_code=404, detail="Resultado indisponível.")
    if not os.path.exists(job.output_path):
        raise HTTPException(status_code=404, detail="Arquivo expirado.")
    return FileResponse(
        job.output_path,
        filename=job.output_name or "output",
        media_type="application/octet-stream",
    )


@app.get("/")
def root():
    return {"service": "Compressor e Conversor de Vídeos", "docs": "/docs"}
