# TypingWar — Xavfsizlik qo'llanmasi (deploy / server)

Ilova darajasidagi himoyalar kodda (rate limiting, CSP, brute-force qulflash,
WPM validatsiya, JWT HttpOnly cookie). Bu fayl — **server / infratuzilma** darajasidagi
qo'shimcha qatlamlar (volumetrik DDoS, hujumchi IP'larni bloklash).

---

## 1. Firewall (UFW) — faqat zarur portlar

PostgreSQL (5432) va Redis (6379) Docker ichki tarmog'ida; tashqariga **ochilmaydi**
(`docker-compose.prod.yml` da `ports:` yo'q). Server firewall faqat 22/80/443 ni ochsin:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp      # SSH (yoki o'zgartirilgan port)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

Tekshirish — DB/Redis tashqaridan yopiqligini tasdiqlang:
```bash
sudo ss -tlnp | grep -E '5432|6379'   # natija BO'SH bo'lishi kerak (host'da listen qilmaydi)
```

---

## 2. fail2ban — nginx 429 / hujumchi IP'larni avtomatik bloklash

nginx allaqachon `limit_req` bilan 429 qaytaradi; fail2ban takroran 429 olgan IP'ni
butunlay (firewall darajasida) bloklaydi.

O'rnatish:
```bash
sudo apt-get update && sudo apt-get install -y fail2ban
```

nginx loglari konteynerda — host'ga chiqaring (`docker-compose.prod.yml` nginx xizmatiga):
```yaml
    volumes:
      - ./nginx/logs:/var/log/nginx
```

`/etc/fail2ban/jail.d/typingwar.conf`:
```ini
[nginx-limit-req]
enabled  = true
filter   = nginx-limit-req
port     = http,https
logpath  = /opt/typingwar/nginx/logs/error.log
findtime = 600
maxretry = 20
bantime  = 3600

[nginx-bad-request]
enabled  = true
filter   = nginx-bad-request
port     = http,https
logpath  = /opt/typingwar/nginx/logs/access.log
findtime = 600
maxretry = 50
bantime  = 3600
```

```bash
sudo systemctl restart fail2ban
sudo fail2ban-client status nginx-limit-req
```

---

## 3. Cloudflare (volumetrik DDoS uchun tavsiya etiladi)

nginx `limit_req` bitta server imkoniyatidagi floodni ushlaydi, lekin haqiqiy
hajmli (L3/L4, gigabitli) DDoS uchun proxy/CDN kerak.

1. DNS'ni Cloudflare'ga o'tkazing, `typingwar.uz` A-yozuvini **proxied (turuncha bulut)** qiling.
2. **SSL/TLS → Full (strict)** (server'da Let's Encrypt sertifikati bilan).
3. **Security → WAF / DDoS** — boshqariladigan qoidalarni yoqing.
4. **Rate limiting rules** — `/api/auth/*` uchun qo'shimcha qoida.
5. Cloudflare orqasida haqiqiy IP uchun nginx'ga `CF-Connecting-IP` ni o'qishni qo'shing
   (yoki Cloudflare IP oralig'ini `set_real_ip_from` bilan ishonchli proxy qiling) —
   aks holda rate limiting/fail2ban hammani bitta IP (Cloudflare) deb ko'radi.

> Eslatma: Cloudflare ulangach, origin server faqat Cloudflare IP'laridan
> 80/443 ni qabul qilsin (UFW yoki nginx `allow`/`deny`) — to'g'ridan-to'g'ri origin'ga
> hujumni oldini oladi.

---

## 4. Maxfiy ma'lumotlar (secrets)

- `JWT_KEY` va `POSTGRES_PASSWORD` — `.env` da, kuchli tasodifiy (`openssl rand -base64 48`).
  `.env` git'ga **kirmaydi** (`.gitignore`). `appsettings.json` dagi standart kalit faqat dev uchun.
- Google OAuth `ClientSecret` — faqat `.env` da.
- Server SSH — parol bilan emas, faqat kalit bilan kirish (`PasswordAuthentication no`).

---

## 5. Yangilanishlar

```bash
sudo apt-get update && sudo apt-get upgrade -y     # OS xavfsizlik yangilanishlari
docker compose -f docker-compose.prod.yml pull     # bazaviy image (postgres/redis/nginx)
docker compose -f docker-compose.prod.yml up -d --build
```

`.NET`, `postgres:16`, `redis:7`, `nginx:1.27` teglarini vaqti-vaqti bilan yangilab turing.
