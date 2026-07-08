#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# TypingWar — UFW: 80/443 ni FAQAT Cloudflare IP'lariga ochadi
# ─────────────────────────────────────────────────────────────
# Maqsad: hujumchi Cloudflare'ni chetlab to'g'ridan-to'g'ri server IP'siga
# (89.167.74.156) urilа olmasin. Veb-trafik faqat Cloudflare orqali kiradi.
#
# ⚠️ MUHIM — qachon ishga tushirish:
#   • Cloudflare ALLAQACHON faol (DNS proxied, sayt Cloudflare orqali ochilyapti) bo'lsin.
#   • Aks holda 80/443 hammaga yopiladi va sayt vaqtincha ochilmaydi.
#   • SSH (22) ochiq qoladi — server bilan aloqa uzilmaydi.
#
# Ishlatish (server'da, root sifatida):
#   sudo bash deploy/ufw-cloudflare.sh
#
# SSH boshqa portda bo'lsa, pastdagi SSH_PORT ni o'zgartiring.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SSH_PORT="${SSH_PORT:-22}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Bu skript root huquqida ishlashi kerak:  sudo bash $0" >&2
  exit 1
fi

command -v ufw >/dev/null || { echo "ufw o'rnatilmagan:  apt-get install -y ufw" >&2; exit 1; }
command -v curl >/dev/null || { echo "curl kerak:  apt-get install -y curl" >&2; exit 1; }

echo "==> SSH (${SSH_PORT}) ochilyapti (o'zingizni qulflab qo'ymaslik uchun)…"
ufw allow "${SSH_PORT}"/tcp

echo "==> Standart siyosat: kiruvchi DENY, chiquvchi ALLOW…"
ufw default deny incoming
ufw default allow outgoing

echo "==> Eski keng 80/443 qoidalarini olib tashlash (bo'lsa)…"
ufw delete allow 80/tcp   2>/dev/null || true
ufw delete allow 443/tcp  2>/dev/null || true
ufw delete allow 'Nginx Full'  2>/dev/null || true
ufw delete allow 'Nginx HTTP'  2>/dev/null || true
ufw delete allow 'Nginx HTTPS' 2>/dev/null || true

echo "==> Cloudflare IP ro'yxati yuklanyapti…"
CF_V4="$(curl -fsS https://www.cloudflare.com/ips-v4)"
CF_V6="$(curl -fsS https://www.cloudflare.com/ips-v6)"

if [[ -z "${CF_V4}" ]]; then
  echo "Cloudflare IP ro'yxatini olib bo'lmadi. Internet/curl ni tekshiring." >&2
  exit 1
fi

echo "==> 80/443 faqat Cloudflare IP'lariga ochilyapti…"
while read -r ip; do
  [[ -z "${ip}" ]] && continue
  ufw allow from "${ip}" to any port 80,443 proto tcp comment 'Cloudflare'
done <<< "${CF_V4}
${CF_V6}"

echo "==> UFW yoqilyapti…"
ufw --force enable
ufw reload

echo
echo "==> Tayyor. Joriy qoidalar:"
ufw status verbose
echo
echo "Eslatma: Cloudflare IP oralig'i kelajakda o'zgarsa, shu skriptni qayta ishga tushiring."
