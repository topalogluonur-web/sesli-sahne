FROM node:22-bookworm-slim

WORKDIR /app

# Python + pip are needed for keysiz Türkçe neural ses (edge-tts Python package).
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip python3-venv ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY . ./

# Install Python Edge TTS inside the container. If you later switch to OpenAI TTS,
# this can stay installed; it does not require an API key.
RUN python3 -m venv /opt/edge-tts-venv \
  && /opt/edge-tts-venv/bin/pip install --no-cache-dir edge-tts

ENV PATH="/opt/edge-tts-venv/bin:${PATH}"
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5055
ENV DATABASE_PATH=/app/data/sesli-sahne.sqlite
ENV UPLOAD_ROOT=/app/uploads
ENV TTS_PROVIDER=edge_python
ENV EDGE_TTS_RATE=-16%

RUN mkdir -p /app/data /app/uploads/audio /app/uploads/covers /app/uploads/pdfs

EXPOSE 5055

CMD ["npm", "start"]
