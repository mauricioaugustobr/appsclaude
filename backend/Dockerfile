FROM python:3.11-slim

# FFmpeg é obrigatório para a conversão de vídeos
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV WORK_DIR=/data
ENV FILE_TTL=3600
# 0 = sem limite de upload
ENV MAX_UPLOAD_MB=0

RUN mkdir -p /data
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
