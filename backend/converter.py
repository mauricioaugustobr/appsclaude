"""
Núcleo de compressão e conversão de vídeo baseado em FFmpeg.

Define os formatos de entrada/saída suportados, os codecs, os presets de
compressão e monta a linha de comando do FFmpeg de acordo com as opções
escolhidas pelo usuário.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass, field
from typing import Optional

# ---------------------------------------------------------------------------
# Descoberta dos binários do FFmpeg
# ---------------------------------------------------------------------------

FFMPEG_BIN = shutil.which("ffmpeg") or "ffmpeg"
FFPROBE_BIN = shutil.which("ffprobe") or "ffprobe"


def ffmpeg_available() -> bool:
    """Retorna True se ffmpeg e ffprobe estiverem disponíveis no sistema."""
    return shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def ffmpeg_version() -> Optional[str]:
    if not ffmpeg_available():
        return None
    try:
        out = subprocess.run(
            [FFMPEG_BIN, "-version"], capture_output=True, text=True, timeout=10
        )
        return out.stdout.splitlines()[0] if out.stdout else None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Extensões de entrada aceitas (praticamente qualquer vídeo)
# ---------------------------------------------------------------------------

INPUT_EXTENSIONS = [
    "mp4", "m4v", "mov", "avi", "mkv", "webm", "flv", "wmv", "mpeg", "mpg",
    "mpe", "3gp", "3g2", "ts", "mts", "m2ts", "ogv", "ogg", "vob", "asf",
    "rm", "rmvb", "divx", "f4v", "gif", "mxf", "dv", "hevc", "h264",
]

# ---------------------------------------------------------------------------
# Formatos de saída suportados
# ---------------------------------------------------------------------------


@dataclass
class OutputFormat:
    ext: str
    label: str
    container: str            # container passado ao ffmpeg via extensão
    default_vcodec: str       # codec de vídeo padrão para esse formato
    default_acodec: str       # codec de áudio padrão
    codecs: list[str] = field(default_factory=list)  # codecs de vídeo válidos
    audio_only: bool = False  # extrai apenas áudio
    animated_image: bool = False  # gif/webp animado (sem faixa de áudio)


# Codecs de vídeo (chave técnica -> descrição amigável)
VIDEO_CODECS = {
    "h264": {"label": "H.264 / AVC (compatível)", "encoder": "libx264"},
    "h265": {"label": "H.265 / HEVC (menor arquivo)", "encoder": "libx265"},
    "vp9": {"label": "VP9 (WebM)", "encoder": "libvpx-vp9"},
    "av1": {"label": "AV1 (máxima compressão)", "encoder": "libaom-av1"},
    "mpeg4": {"label": "MPEG-4 (legado)", "encoder": "mpeg4"},
    "copy": {"label": "Sem recodificar (copiar)", "encoder": "copy"},
}

AUDIO_CODECS = {
    "aac": "aac",
    "mp3": "libmp3lame",
    "opus": "libopus",
    "vorbis": "libvorbis",
    "ac3": "ac3",
    "copy": "copy",
    "none": None,
}

OUTPUT_FORMATS: dict[str, OutputFormat] = {
    "mp4": OutputFormat(
        ext="mp4", label="MP4 (H.264/H.265)", container="mp4",
        default_vcodec="h264", default_acodec="aac",
        codecs=["h264", "h265", "mpeg4"],
    ),
    "webm": OutputFormat(
        ext="webm", label="WebM (VP9/AV1)", container="webm",
        default_vcodec="vp9", default_acodec="opus",
        codecs=["vp9", "av1"],
    ),
    "mkv": OutputFormat(
        ext="mkv", label="MKV (Matroska)", container="matroska",
        default_vcodec="h264", default_acodec="aac",
        codecs=["h264", "h265", "vp9", "av1"],
    ),
    "mov": OutputFormat(
        ext="mov", label="MOV (QuickTime)", container="mov",
        default_vcodec="h264", default_acodec="aac",
        codecs=["h264", "h265"],
    ),
    "avi": OutputFormat(
        ext="avi", label="AVI (legado)", container="avi",
        default_vcodec="mpeg4", default_acodec="mp3",
        codecs=["mpeg4", "h264"],
    ),
    "flv": OutputFormat(
        ext="flv", label="FLV (Flash)", container="flv",
        default_vcodec="h264", default_acodec="aac",
        codecs=["h264"],
    ),
    "3gp": OutputFormat(
        ext="3gp", label="3GP (celulares)", container="3gp",
        default_vcodec="h264", default_acodec="aac",
        codecs=["h264", "mpeg4"],
    ),
    "gif": OutputFormat(
        ext="gif", label="GIF animado", container="gif",
        default_vcodec="gif", default_acodec="none",
        codecs=["gif"], animated_image=True,
    ),
    "webp": OutputFormat(
        ext="webp", label="WebP animado", container="webp",
        default_vcodec="webp", default_acodec="none",
        codecs=["webp"], animated_image=True,
    ),
    "mp3": OutputFormat(
        ext="mp3", label="MP3 (somente áudio)", container="mp3",
        default_vcodec="", default_acodec="mp3",
        codecs=[], audio_only=True,
    ),
    "aac": OutputFormat(
        ext="aac", label="AAC (somente áudio)", container="adts",
        default_vcodec="", default_acodec="aac",
        codecs=[], audio_only=True,
    ),
    "wav": OutputFormat(
        ext="wav", label="WAV (áudio sem perdas)", container="wav",
        default_vcodec="", default_acodec="pcm_s16le",
        codecs=[], audio_only=True,
    ),
}

# ---------------------------------------------------------------------------
# Presets de compressão (nível -> CRF por codec)
# CRF menor = mais qualidade e arquivo maior; maior = mais compressão.
# ---------------------------------------------------------------------------

COMPRESSION_LEVELS = {
    "lossless": {"label": "Máxima qualidade", "crf": {"h264": 18, "h265": 20, "vp9": 24, "av1": 24, "mpeg4": 3}},
    "high": {"label": "Alta qualidade", "crf": {"h264": 22, "h265": 26, "vp9": 30, "av1": 30, "mpeg4": 5}},
    "balanced": {"label": "Equilibrado (recomendado)", "crf": {"h264": 26, "h265": 30, "vp9": 34, "av1": 34, "mpeg4": 8}},
    "strong": {"label": "Compressão forte", "crf": {"h264": 30, "h265": 34, "vp9": 38, "av1": 40, "mpeg4": 12}},
    "extreme": {"label": "Compressão extrema", "crf": {"h264": 34, "h265": 38, "vp9": 44, "av1": 46, "mpeg4": 18}},
}

# Presets de velocidade do encoder (x264/x265)
SPEED_PRESETS = ["ultrafast", "superfast", "veryfast", "faster", "fast",
                 "medium", "slow", "slower", "veryslow"]

# Resoluções pré-definidas (altura em pixels; -2 mantém proporção na largura)
RESOLUTIONS = {
    "original": None,
    "2160p": 2160,
    "1440p": 1440,
    "1080p": 1080,
    "720p": 720,
    "480p": 480,
    "360p": 360,
    "240p": 240,
}


# ---------------------------------------------------------------------------
# ffprobe: metadados do arquivo de entrada
# ---------------------------------------------------------------------------


def probe(path: str) -> dict:
    """Retorna metadados do vídeo usando ffprobe (duração, resolução, etc.)."""
    cmd = [
        FFPROBE_BIN, "-v", "error", "-print_format", "json",
        "-show_format", "-show_streams", path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe falhou: {result.stderr.strip()}")
    data = json.loads(result.stdout or "{}")

    fmt = data.get("format", {})
    video_stream = next(
        (s for s in data.get("streams", []) if s.get("codec_type") == "video"), None
    )
    audio_stream = next(
        (s for s in data.get("streams", []) if s.get("codec_type") == "audio"), None
    )

    duration = float(fmt.get("duration", 0) or 0)
    info = {
        "duration": duration,
        "size": int(fmt.get("size", 0) or 0),
        "bit_rate": int(fmt.get("bit_rate", 0) or 0),
        "format_name": fmt.get("format_name", ""),
        "has_video": video_stream is not None,
        "has_audio": audio_stream is not None,
    }
    if video_stream:
        info["width"] = video_stream.get("width")
        info["height"] = video_stream.get("height")
        info["vcodec"] = video_stream.get("codec_name")
        # fps pode vir como fração "30000/1001"
        fr = video_stream.get("avg_frame_rate") or video_stream.get("r_frame_rate") or "0/1"
        try:
            num, den = fr.split("/")
            info["fps"] = round(float(num) / float(den), 3) if float(den) else None
        except Exception:
            info["fps"] = None
    if audio_stream:
        info["acodec"] = audio_stream.get("codec_name")
        info["audio_bitrate"] = int(audio_stream.get("bit_rate", 0) or 0)
    return info


# ---------------------------------------------------------------------------
# Opções de conversão
# ---------------------------------------------------------------------------


@dataclass
class ConvertOptions:
    output_format: str = "mp4"
    codec: Optional[str] = None            # None = usa padrão do formato
    audio_codec: Optional[str] = None      # None = usa padrão do formato
    # Modo de compressão: "quality" (CRF), "target_size" (MB), "target_percent",
    # "bitrate" (kbps) ou "none" (apenas troca de container)
    mode: str = "quality"
    level: str = "balanced"                # usado no modo quality
    target_size_mb: Optional[float] = None
    target_percent: Optional[float] = None  # 0-100
    video_bitrate_kbps: Optional[int] = None
    audio_bitrate_kbps: int = 128
    resolution: str = "original"           # chave de RESOLUTIONS ou "WxH"
    fps: Optional[int] = None
    speed: str = "medium"
    remove_audio: bool = False
    two_pass: bool = False
    # Corte opcional (segundos)
    trim_start: Optional[float] = None
    trim_end: Optional[float] = None


def _compute_target_bitrate(options: ConvertOptions, info: dict) -> Optional[int]:
    """Calcula o bitrate de vídeo (kbps) para atingir um tamanho alvo."""
    duration = info.get("duration") or 0
    if duration <= 0:
        return None

    target_bytes: Optional[float] = None
    if options.mode == "target_size" and options.target_size_mb:
        target_bytes = options.target_size_mb * 1024 * 1024
    elif options.mode == "target_percent" and options.target_percent:
        original = info.get("size") or 0
        if original > 0:
            target_bytes = original * (options.target_percent / 100.0)
    if not target_bytes or target_bytes <= 0:
        return None

    # Reserva o espaço do áudio (se mantido)
    audio_kbps = 0 if options.remove_audio else options.audio_bitrate_kbps
    total_kbps = (target_bytes * 8) / 1000.0 / duration
    # Margem de 3% para overhead do container
    video_kbps = int(max(64, (total_kbps * 0.97) - audio_kbps))
    return video_kbps


def _resolution_filter(options: ConvertOptions) -> Optional[str]:
    if options.resolution and options.resolution != "original":
        if "x" in options.resolution.lower():
            try:
                w, h = options.resolution.lower().split("x")
                return f"scale={int(w)}:{int(h)}"
            except Exception:
                return None
        height = RESOLUTIONS.get(options.resolution)
        if height:
            # -2 garante largura par mantendo proporção
            return f"scale=-2:{height}"
    return None


def build_commands(input_path: str, output_path: str,
                   options: ConvertOptions, info: dict,
                   passlog_prefix: Optional[str] = None) -> list[list[str]]:
    """
    Monta a(s) linha(s) de comando do FFmpeg.

    Retorna uma lista de comandos (normalmente 1; 2 quando two-pass).
    Cada comando inclui `-progress pipe:1 -nostats` para acompanhamento.
    """
    out_fmt = OUTPUT_FORMATS.get(options.output_format)
    if out_fmt is None:
        raise ValueError(f"Formato de saída não suportado: {options.output_format}")

    base: list[str] = [FFMPEG_BIN, "-y", "-hide_banner"]

    # Corte na entrada (antes de -i para busca rápida)
    if options.trim_start:
        base += ["-ss", str(options.trim_start)]
    base += ["-i", input_path]
    if options.trim_end:
        dur = options.trim_end - (options.trim_start or 0)
        if dur > 0:
            base += ["-t", str(dur)]

    # ------------------------------------------------------------------
    # Saída somente de áudio
    # ------------------------------------------------------------------
    if out_fmt.audio_only:
        acodec = AUDIO_CODECS.get(options.audio_codec or "", None) or \
            AUDIO_CODECS.get(out_fmt.default_acodec, "aac")
        cmd = base + ["-vn", "-c:a", acodec]
        if out_fmt.ext != "wav":
            cmd += ["-b:a", f"{options.audio_bitrate_kbps}k"]
        cmd += _progress_args() + [output_path]
        return [cmd]

    # ------------------------------------------------------------------
    # GIF / WebP animado
    # ------------------------------------------------------------------
    if out_fmt.animated_image:
        filters = []
        res = _resolution_filter(options)
        if res:
            filters.append(res)
        fps = options.fps or 15
        filters.append(f"fps={fps}")
        if out_fmt.ext == "gif":
            # Paleta de alta qualidade para GIF
            vf = ",".join(filters) + ",split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse"
            cmd = base + ["-vf", vf, "-loop", "0"]
        else:  # webp
            vf = ",".join(filters)
            cmd = base + ["-vf", vf, "-loop", "0", "-c:v", "libwebp",
                          "-lossless", "0", "-q:v", "70"]
        cmd += _progress_args() + [output_path]
        return [cmd]

    # ------------------------------------------------------------------
    # Vídeo normal
    # ------------------------------------------------------------------
    codec_key = options.codec or out_fmt.default_vcodec
    if codec_key == "copy":
        vcodec_args = ["-c:v", "copy"]
    else:
        codec_meta = VIDEO_CODECS.get(codec_key)
        if not codec_meta:
            raise ValueError(f"Codec de vídeo não suportado: {codec_key}")
        vcodec_args = ["-c:v", codec_meta["encoder"]]

    common: list[str] = []

    # Filtros de vídeo (resolução)
    res = _resolution_filter(options)
    if res and codec_key != "copy":
        common += ["-vf", res]

    # FPS
    if options.fps and codec_key != "copy":
        common += ["-r", str(options.fps)]

    # Preset de velocidade (x264/x265)
    if codec_key in ("h264", "h265") and codec_key != "copy":
        common += ["-preset", options.speed]
    if codec_key == "h265":
        # tag hvc1 melhora compatibilidade (Apple)
        common += ["-tag:v", "hvc1"]

    # Áudio
    if options.remove_audio:
        audio_args = ["-an"]
    else:
        acodec = AUDIO_CODECS.get(options.audio_codec or "", "keep") if options.audio_codec else None
        if not acodec or acodec == "keep":
            acodec = AUDIO_CODECS.get(out_fmt.default_acodec, "aac")
        audio_args = ["-c:a", acodec]
        if acodec != "copy":
            audio_args += ["-b:a", f"{options.audio_bitrate_kbps}k"]

    # ------------------------------------------------------------------
    # Estratégia de taxa de bits / qualidade
    # ------------------------------------------------------------------
    rate_args: list[str] = []
    use_bitrate = False
    target_kbps: Optional[int] = None

    if codec_key == "copy":
        rate_args = []
    elif options.mode == "bitrate" and options.video_bitrate_kbps:
        target_kbps = options.video_bitrate_kbps
        use_bitrate = True
    elif options.mode in ("target_size", "target_percent"):
        target_kbps = _compute_target_bitrate(options, info)
        use_bitrate = target_kbps is not None
        if not use_bitrate:
            # fallback para qualidade se não der para calcular
            options.mode = "quality"

    if use_bitrate and target_kbps:
        if codec_key == "vp9":
            rate_args = ["-b:v", f"{target_kbps}k"]
        elif codec_key == "av1":
            rate_args = ["-b:v", f"{target_kbps}k"]
        else:
            maxrate = int(target_kbps * 1.45)
            bufsize = int(target_kbps * 2)
            rate_args = ["-b:v", f"{target_kbps}k",
                         "-maxrate", f"{maxrate}k",
                         "-bufsize", f"{bufsize}k"]
    elif codec_key != "copy":
        # Modo qualidade (CRF)
        crf_map = COMPRESSION_LEVELS.get(options.level, COMPRESSION_LEVELS["balanced"])["crf"]
        crf = crf_map.get(codec_key, 26)
        if codec_key in ("h264", "h265", "mpeg4"):
            rate_args = ["-crf", str(crf)]
            if codec_key == "mpeg4":
                # mpeg4 usa -q:v em vez de -crf
                rate_args = ["-q:v", str(crf)]
        elif codec_key in ("vp9", "av1"):
            rate_args = ["-crf", str(crf), "-b:v", "0"]

    # Flag para streaming (mp4/mov)
    faststart = []
    if out_fmt.ext in ("mp4", "mov", "m4v"):
        faststart = ["-movflags", "+faststart"]

    # ------------------------------------------------------------------
    # Two-pass (apenas para modos com bitrate alvo e codecs suportados)
    # ------------------------------------------------------------------
    if options.two_pass and use_bitrate and codec_key in ("h264", "h265", "vp9", "av1"):
        prefix = passlog_prefix or output_path
        # Passo 1: análise, descarta a saída
        pass1 = base + vcodec_args + common + rate_args + [
            "-pass", "1", "-passlogfile", prefix, "-an", "-f", "null",
        ] + _progress_args() + ["/dev/null"]
        # Passo 2: gera o arquivo final
        pass2 = base + vcodec_args + common + rate_args + audio_args + faststart + [
            "-pass", "2", "-passlogfile", prefix,
        ] + _progress_args() + [output_path]
        return [pass1, pass2]

    cmd = base + vcodec_args + common + rate_args + audio_args + faststart
    cmd += _progress_args() + [output_path]
    return [cmd]


def _progress_args() -> list[str]:
    return ["-progress", "pipe:1", "-nostats"]
