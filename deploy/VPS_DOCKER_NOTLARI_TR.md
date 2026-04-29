# VPS / Sunucu üzerinde Docker ile yayınlama

Bu yöntem DigitalOcean, Hetzner, AWS Lightsail gibi bir Linux sunucu için uygundur.

## Sunucuda

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin git
sudo systemctl enable --now docker
```

Projeyi sunucuya al:

```bash
git clone <repo-url> sesli-sahne
cd sesli-sahne
```

Çalıştır:

```bash
docker compose -f docker-compose.cloud-local.yml up -d --build
```

Kontrol:

```bash
curl http://localhost:5055/api/health
```

Dışarı açılınca:

```text
http://SUNUCU_IP:5055/api/health
```

## Domain + SSL

Gerçek yayın için Nginx veya Caddy ile HTTPS önerilir:

```text
https://api.seslisahne.com/api
```

Mobil uygulamada production API URL bu adres olmalı.
