# TypingWar — Cloudflare'ni ulash (qadam-baqadam)

Maqsad: `Foydalanuvchi → Cloudflare (DDoS qalqon) → server`. Server IP yashirin,
hajmli DDoS Cloudflare'da to'xtaydi, haqiqiy mijoz IP'si himoyalarga to'g'ri yetadi.

Repozitoriyda tayyor:
- `nginx/conf.d/cloudflare-realip.conf` — haqiqiy IP (CF-Connecting-IP) tiklash ✅ (avtomatik)
- `nginx/cloudflare.conf` — Origin sertifikat bilan HTTPS + barcha himoyalar
- `deploy/ufw-cloudflare.sh` — 80/443 ni faqat Cloudflare'ga ochish

---

## 1. DNS yozuvlari (Cloudflare panel → DNS → Records)

🟠 **Proxied (turuncha) = faqat veb-sayt.**  ⚪ **DNS only (kulrang) = pochta va boshqalar.**

| Type  | Name         | Content          | Proxy        |
|-------|--------------|------------------|--------------|
| A     | typingwar.uz | 89.167.74.156    | 🟠 Proxied   |
| CNAME | www          | typingwar.uz     | 🟠 Proxied   |
| A     | mail         | 45.138.159.4     | ⚪ DNS only  |
| A     | ftp          | 45.138.159.4     | ⚪ DNS only  |
| A     | webmail      | 45.138.159.4     | ⚪ DNS only  |
| MX    | typingwar.uz | mail.typingwar.uz| ⚪ DNS only  |
| TXT   | (SPF/DMARC)  | …                | ⚪ DNS only  |

> ⚠️ `mail` **albatta DNS only** bo'lsin — aks holda kelayotgan email yetib kelmaydi.

---

## 2. Nameserver'ni o'zgartirish (registratorda)
Cloudflare bergan 2 ta nameserver'ni (masalan `xxx.ns.cloudflare.com`) domeningiz
registratorida (`.uz` panel) eski NS o'rniga qo'ying. 2–24 soatda faollashadi
(Cloudflare "Active" emaili keladi).

---

## 3. Origin sertifikat (server↔Cloudflare uchun HTTPS)
1. Cloudflare panel: **SSL/TLS → Origin Server → Create Certificate** (standart, RSA, 15 yil).
2. Ikkita matn beradi. Serverda saqlang:
   ```bash
   cd /opt/typingwar
   nano nginx/ssl/cloudflare-origin.pem   # "Origin Certificate" matnini joylang
   nano nginx/ssl/cloudflare-origin.key   # "Private Key" matnini joylang
   chmod 600 nginx/ssl/cloudflare-origin.key
   ```
   (Bu fayllar git'ga kirmaydi — `.gitignore` da.)
3. SSL/TLS rejimi: **SSL/TLS → Overview → Full (strict)**.

---

## 4. nginx'ni qo'llash
`nginx/conf.d/default.conf` allaqachon Cloudflare (Origin sertifikat) konfiguratsiyasi —
3-qadamdagi sertifikat fayllari joyida bo'lsa, qo'shimcha nusxa shart emas:
```bash
cd /opt/typingwar
docker compose -f docker-compose.prod.yml up -d                 # ssl mount + konfig
docker compose -f docker-compose.prod.yml exec nginx nginx -t   # "syntax is ok" bo'lsin
docker compose -f docker-compose.prod.yml restart nginx         # MUHIM: yangi konfig yuklanadi
```
> ⚠️ `nginx -t` faqat TEKSHIRADI — `restart` qilmasangiz ishlab turgan nginx eski
> konfigda qoladi (443 ochilmaydi). Shuning uchun oxirgi `restart` shart.

Endi `https://typingwar.uz` Cloudflare orqali ochilishi kerak (🔒 qulf bilan).

---

## 5. Firewall — faqat Cloudflare'ga ochish (oxirgi qadam) ⚠️
**Sayt Cloudflare orqali ochilayotganini tasdiqlagandan keyin** ishga tushiring.

> ⚠️ **Docker UFW'ni chetlab o'tadi!** Konteyner portlari (80:80, 443:443) to'g'ridan-to'g'ri
> iptables'ga yoziladi, shuning uchun UFW yakka o'zi 80/443 ni himoyalamaydi. Docker-published
> portlar uchun **DOCKER-USER** zanjiri kerak:

```bash
cd /opt/typingwar
# (1) Docker portlari (80/443) ni faqat Cloudflare'ga cheklash — ASOSIY himoya:
sudo bash deploy/docker-cloudflare-firewall.sh
# (2) Host darajasi + SSH uchun UFW (defense-in-depth, ixtiyoriy):
sudo bash deploy/ufw-cloudflare.sh          # SSH boshqa portda: sudo SSH_PORT=2222 bash ...
```
`docker-cloudflare-firewall.sh` reboot'da avtomatik qayta qo'llanadi (systemd service).
SSH (22) ikkalasida ham ochiq qoladi.

> Muqobil (eng ishonchli): **Hetzner Cloud Firewall** (server tashqarisida) — panelда
> 80/443 ni faqat Cloudflare IP oraliqlariga, 22 ni hammaga ochib, serverga biriktiring.

---

## 6. Tekshirish
- `https://typingwar.uz` ochiladimi, qulf (HTTPS) bormi?
- To'g'ridan-to'g'ri `http://89.167.74.156` endi **ochilmasligi** kerak (firewall bloklaydi) — bu yaxshi.
- Cloudflare panel: **Analytics → Security** — bloklangan tahdidlar ko'rinadi.
- Login (`/api/auth/...`) va xona kodi qulflash haqiqiy IP bilan ishlayotganini
  app loglaridan tekshiring (bir IP hammaga aylanmasligi kerak).

---

## Eslatmalar
- **Google OAuth:** redirect URI `https://typingwar.uz/signin-google` (Cloudflare orqali ham xuddi shu).
- **Email** Cloudflare'dan ta'sirlanmaydi (mail yozuvlari DNS only).
- **Authenticated Origin Pulls** (ixtiyoriy, kuchliroq): `nginx/cloudflare.conf` ichidagi
  izohga qarang — faqat Cloudflare origin'ga ulanа oladigan qiladi.
- Cloudflare IP oralig'i o'zgarsa: `nginx/conf.d/cloudflare-realip.conf` ni yangilang
  va `deploy/ufw-cloudflare.sh` ni qayta ishga tushiring.
