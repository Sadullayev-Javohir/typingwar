#!/usr/bin/env bash
# TypingWar.uz — Let's Encrypt SSL sertifikatini olish (2-bosqich).
# OLDIN: DNS typingwar.uz -> 89.167.74.156 ulangan va `docker compose ... up -d` ishlab turishi shart.
# Ishga tushirish (loyiha papkasida):  bash deploy/init-ssl.sh
set -euo pipefail

DOMAIN="typingwar.uz"
WWW="www.typingwar.uz"          # www DNS yo'q bo'lsa pastdagi -d "$WWW" ni o'chiring
EMAIL="javohirsadullayev836@gmail.com"
COMPOSE="docker compose -f docker-compose.prod.yml"

echo ">> 1) certbot sertifikat so'rayapti (webroot orqali)..."
docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d "$DOMAIN" -d "$WWW" \
  --email "$EMAIL" --agree-tos --no-eff-email --non-interactive

echo ">> 2) nginx konfigini HTTPS (ssl.conf) ga almashtiryapti..."
cp nginx/ssl.conf nginx/conf.d/default.conf

echo ">> 3) nginx qayta yuklanmoqda..."
$COMPOSE exec nginx nginx -s reload

echo ">> TAYYOR. Endi https://$DOMAIN ochiladi."
echo ">> Eslatma: Google OAuth ishlashi uchun .env ga GOOGLE_CLIENT_ID/SECRET qo'shib,"
echo ">>          '$COMPOSE up -d' qiling. Sertifikat 90 kunda tugaydi — renew uchun DEPLOY.md ga qarang."
