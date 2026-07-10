#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# TypingWar — Docker-published 80/443 ni FAQAT Cloudflare IP'lariga cheklash
# ─────────────────────────────────────────────────────────────
# NEGA KERAK: Docker konteyner portlarini (80:80, 443:443) to'g'ridan-to'g'ri
# iptables'ga yozadi va UFW'ni CHETLAB o'tadi. Shuning uchun "ufw deny" ishlamaydi.
# To'g'ri joy — DOCKER-USER zanjiri (Docker shuni hurmat qiladi).
#
# Bu skript:
#   1. DOCKER-USER'ga qoida qo'yadi: 80/443 ga faqat Cloudflare IP'lari kiradi, qolgani DROP.
#   2. Reboot'da avtomatik qayta qo'llanishi uchun systemd service o'rnatadi
#      (Docker reboot'da DOCKER-USER'ni tozalaydi, shuning uchun qayta qo'llash kerak).
#
# SSH (22) host xizmati — DOCKER-USER unga TEGMAYDI, ochiq qoladi.
#
# Ishlatish (server'da):
#   sudo bash deploy/docker-cloudflare-firewall.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SELF=/usr/local/sbin/tw-docker-cf-firewall.sh
PORTS="80,443"

apply_rules() {
  local cf_v4 cf_v6 ip ext_if
  cf_v4="$(curl -fsS https://www.cloudflare.com/ips-v4)"
  cf_v6="$(curl -fsS https://www.cloudflare.com/ips-v6)"
  [[ -n "${cf_v4}" ]] || { echo "Cloudflare IPv4 ro'yxatini olib bo'lmadi." >&2; exit 1; }

  # MUHIM: DOCKER-USER zanjiri FORWARD yo'lida — ya'ni IKKALA yo'nalish uchun ham
  # ishlaydi (tashqaridan konteynerga KIRUVCHI va konteynerdan tashqariga CHIQUVCHI).
  # Agar DROP qoidasi interfeyssiz bo'lsa, u konteynerning tashqariga 443-portga
  # CHIQUVCHI ulanishlarini ham bloklaydi (masalan Google OAuth token almashinuvi).
  # Shuning uchun cheklov FAQAT tashqi interfeysdan (${ext_if}) KIRUVCHI trafikka
  # qo'llanadi; konteyner egress (docker bridge'dan) tegmasdan o'tadi.
  ext_if="$(ip -4 route show default 2>/dev/null | awk '{print $5; exit}')"
  [[ -n "${ext_if}" ]] || ext_if="eth0"

  # ── IPv4 ──
  iptables -N DOCKER-USER 2>/dev/null || true
  iptables -F DOCKER-USER
  iptables -A DOCKER-USER -m conntrack --ctstate RELATED,ESTABLISHED -j RETURN
  while read -r ip; do
    [[ -z "${ip}" ]] && continue
    iptables -A DOCKER-USER -i "${ext_if}" -s "${ip}" -p tcp -m multiport --dports "${PORTS}" -j RETURN
  done <<< "${cf_v4}"
  iptables -A DOCKER-USER -i "${ext_if}" -p tcp -m multiport --dports "${PORTS}" -j DROP
  iptables -A DOCKER-USER -j RETURN

  # ── IPv6 ──
  if command -v ip6tables >/dev/null; then
    ip6tables -N DOCKER-USER 2>/dev/null || true
    ip6tables -F DOCKER-USER
    ip6tables -A DOCKER-USER -m conntrack --ctstate RELATED,ESTABLISHED -j RETURN
    while read -r ip; do
      [[ -z "${ip}" ]] && continue
      ip6tables -A DOCKER-USER -i "${ext_if}" -s "${ip}" -p tcp -m multiport --dports "${PORTS}" -j RETURN
    done <<< "${cf_v6}"
    ip6tables -A DOCKER-USER -i "${ext_if}" -p tcp -m multiport --dports "${PORTS}" -j DROP
    ip6tables -A DOCKER-USER -j RETURN
  fi
}

# systemd boot'da shu rejim bilan chaqiradi
if [[ "${1:-}" == "--apply" ]]; then
  apply_rules
  echo "DOCKER-USER qoidalari qo'llandi (80/443 → faqat Cloudflare)."
  exit 0
fi

if [[ "${EUID}" -ne 0 ]]; then
  echo "Bu skript root huquqida ishlashi kerak:  sudo bash $0" >&2
  exit 1
fi
command -v iptables >/dev/null || { echo "iptables topilmadi." >&2; exit 1; }
command -v curl >/dev/null || { echo "curl kerak." >&2; exit 1; }

# Skriptni o'rnat + reboot'da avtomatik qayta qo'llash uchun systemd service
install -m 755 "$0" "${SELF}"
cat > /etc/systemd/system/tw-docker-cf-firewall.service <<EOF
[Unit]
Description=TypingWar — Docker 80/443 ni Cloudflare IP'lariga cheklash
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=${SELF} --apply
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable tw-docker-cf-firewall.service >/dev/null 2>&1 || true

apply_rules

echo
echo "==> Tayyor."
echo "    • 80/443 endi faqat Cloudflare IP'laridan ochiq (DOCKER-USER)."
echo "    • Reboot'da avtomatik qayta qo'llanadi (systemd: tw-docker-cf-firewall)."
echo "    • Cloudflare IP oralig'i o'zgarsa shu skriptni qayta ishga tushiring."
