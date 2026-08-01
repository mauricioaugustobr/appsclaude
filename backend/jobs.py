"""
Gerenciador de jobs de conversão.

Cada upload vira um Job processado em uma thread separada. O progresso é
extraído da saída `-progress` do FFmpeg (campo out_time_ms) e comparado com
a duração total do vídeo. Arquivos temporários são limpos após expirarem.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Optional

import converter
from converter import ConvertOptions


@dataclass
class Job:
    id: str
    input_path: str
    original_name: str
    original_size: int
    options: ConvertOptions
    output_path: Optional[str] = None
    output_name: Optional[str] = None
    status: str = "queued"          # queued | processing | done | error | canceled
    progress: float = 0.0           # 0-100
    error: Optional[str] = None
    info: dict = field(default_factory=dict)
    output_size: int = 0
    created_at: float = field(default_factory=time.time)
    finished_at: Optional[float] = None
    _process: Optional[subprocess.Popen] = None
    _cancel: bool = False


class JobManager:
    def __init__(self, work_dir: str, ttl_seconds: int = 3600):
        self.work_dir = work_dir
        self.ttl_seconds = ttl_seconds
        self.jobs: dict[str, Job] = {}
        self._lock = threading.Lock()
        os.makedirs(self.work_dir, exist_ok=True)

    # ------------------------------------------------------------------
    def create_job(self, input_path: str, original_name: str,
                   original_size: int, options: ConvertOptions) -> Job:
        job_id = uuid.uuid4().hex[:12]
        job = Job(
            id=job_id,
            input_path=input_path,
            original_name=original_name,
            original_size=original_size,
            options=options,
        )
        with self._lock:
            self.jobs[job_id] = job
        thread = threading.Thread(target=self._run, args=(job,), daemon=True)
        thread.start()
        return job

    def get(self, job_id: str) -> Optional[Job]:
        return self.jobs.get(job_id)

    def cancel(self, job_id: str) -> bool:
        job = self.jobs.get(job_id)
        if not job or job.status not in ("queued", "processing"):
            return False
        job._cancel = True
        if job._process and job._process.poll() is None:
            try:
                job._process.terminate()
            except Exception:
                pass
        job.status = "canceled"
        return True

    # ------------------------------------------------------------------
    def _run(self, job: Job) -> None:
        try:
            job.status = "processing"
            # Metadados do arquivo de entrada
            try:
                job.info = converter.probe(job.input_path)
            except Exception as e:
                job.info = {}
                # segue mesmo sem probe; progresso pode ficar indisponível

            out_fmt = converter.OUTPUT_FORMATS[job.options.output_format]
            base_name = os.path.splitext(job.original_name)[0]
            job.output_name = f"{base_name}.{out_fmt.ext}"
            job.output_path = os.path.join(self.work_dir, f"{job.id}.{out_fmt.ext}")
            passlog_prefix = os.path.join(self.work_dir, f"{job.id}_pass")

            commands = converter.build_commands(
                job.input_path, job.output_path, job.options, job.info,
                passlog_prefix=passlog_prefix,
            )

            total_passes = len(commands)
            for idx, cmd in enumerate(commands):
                if job._cancel:
                    job.status = "canceled"
                    return
                self._run_command(job, cmd, pass_index=idx, total_passes=total_passes)
                if job.status == "error":
                    return

            if job._cancel:
                job.status = "canceled"
                return

            if not job.output_path or not os.path.exists(job.output_path):
                job.status = "error"
                job.error = "Arquivo de saída não foi gerado."
                return

            job.output_size = os.path.getsize(job.output_path)
            job.progress = 100.0
            job.status = "done"
            job.finished_at = time.time()
        except Exception as e:  # noqa: BLE001
            job.status = "error"
            job.error = str(e)
            job.finished_at = time.time()
        finally:
            self._cleanup_passlogs(job)

    def _run_command(self, job: Job, cmd: list[str],
                     pass_index: int, total_passes: int) -> None:
        duration = job.info.get("duration") or 0
        stderr_tail: list[str] = []
        try:
            process = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                text=True, bufsize=1,
            )
        except FileNotFoundError:
            job.status = "error"
            job.error = ("FFmpeg não encontrado. Instale o FFmpeg no servidor "
                         "para habilitar a conversão.")
            return

        job._process = process

        # Thread para consumir stderr (evita bloqueio do buffer)
        def _drain_stderr():
            assert process.stderr is not None
            for line in process.stderr:
                stderr_tail.append(line)
                if len(stderr_tail) > 30:
                    stderr_tail.pop(0)

        err_thread = threading.Thread(target=_drain_stderr, daemon=True)
        err_thread.start()

        # Leitura do progresso via stdout (-progress pipe:1)
        assert process.stdout is not None
        for line in process.stdout:
            if job._cancel:
                break
            line = line.strip()
            if line.startswith("out_time_ms=") and duration > 0:
                try:
                    out_ms = int(line.split("=", 1)[1])
                    seconds = out_ms / 1_000_000.0
                    pass_progress = min(100.0, (seconds / duration) * 100.0)
                    # Distribui o progresso entre os passos (two-pass)
                    base = (pass_index / total_passes) * 100.0
                    job.progress = round(base + pass_progress / total_passes, 1)
                except Exception:
                    pass
            elif line == "progress=end":
                base = ((pass_index + 1) / total_passes) * 100.0
                job.progress = round(base, 1)

        process.wait()
        err_thread.join(timeout=2)

        if job._cancel:
            job.status = "canceled"
            return

        if process.returncode != 0:
            job.status = "error"
            tail = "".join(stderr_tail[-8:]).strip()
            job.error = tail or f"FFmpeg terminou com código {process.returncode}"

    # ------------------------------------------------------------------
    def _cleanup_passlogs(self, job: Job) -> None:
        for suffix in ("_pass-0.log", "_pass-0.log.mbtree", "_pass",
                       "_pass.log", "_pass.log.mbtree"):
            p = os.path.join(self.work_dir, f"{job.id}{suffix}")
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass

    def cleanup_expired(self) -> None:
        """Remove jobs e arquivos que passaram do TTL."""
        now = time.time()
        expired: list[str] = []
        with self._lock:
            for jid, job in list(self.jobs.items()):
                ref = job.finished_at or job.created_at
                if now - ref > self.ttl_seconds:
                    expired.append(jid)
        for jid in expired:
            self._remove_job(jid)

    def _remove_job(self, job_id: str) -> None:
        job = self.jobs.pop(job_id, None)
        if not job:
            return
        for path in (job.input_path, job.output_path):
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass

    def to_dict(self, job: Job) -> dict:
        saved = 0.0
        if job.status == "done" and job.original_size > 0 and job.output_size > 0:
            saved = round((1 - job.output_size / job.original_size) * 100, 1)
        return {
            "id": job.id,
            "status": job.status,
            "progress": job.progress,
            "error": job.error,
            "original_name": job.original_name,
            "original_size": job.original_size,
            "output_name": job.output_name,
            "output_size": job.output_size,
            "saved_percent": saved,
            "info": job.info,
            "output_format": job.options.output_format,
        }
