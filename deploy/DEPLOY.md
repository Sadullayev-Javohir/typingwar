# TypingWar.uz — Deploy qo'llanmasi (Hetzner cx23)

Server: **89.167.74.156** (Ubuntu, 2 vCPU / 4 GB RAM / 40 GB disk)
Domen: **typingwar.uz**
Usul: **Docker Compose** (Postgres + Redis + app + nginx, hammasi bitta serverda).

Deploy 2 bosqichda: avval **HTTP** (IP orqali sinash), keyin **DNS + SSL**.

---

## 0. Oldindan (mahalliy kompyuterda — bir marta)

Loyiha allaqachon GitHub'ga ulanган va push qilingan (pastdagi "Git" bo'limga qarang).

---

## 1. Serverga ulanish

Mahalliy terminalda:

```bash
ssh root@89.167.74.156
```

> Birinchi marta parol/yoki Hetzner bergan kalit so'raydi. Kirgach quyidagilar **serverda** bajariladi.

---

## 2. Serverni tayyorlash (bir marta)

```bash
# tizimni yangilash
apt update && apt upgrade -y

# Docker + Docker Compose o'rnatish
curl -fsSL https://get.docker.com | sh

# Firewall — faqat SSH, HTTP, HTTPS
apt install -y ufw
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable

# git
apt install -y git
```

Tekshirish: `docker --version` va `docker compose version` ishlashi kerak.

---

## 3. Loyihani serverga olish

```bash
cd /opt
git clone <SIZNING_GITHUB_REPO_URL> typingwar
cd typingwar
```

---

## 4. Sozlamalar (.env)

```bash
cp deploy/.env.example .env
nano .env
```

To'ldiring:
- `POSTGRES_PASSWORD` — kuchli parol. Yaratish: `openssl rand -base64 24`
- `JWT_KEY` — kamida 32 belgi. Yaratish: `openssl rand -base64 48`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — hozircha **bo'sh** qoldiring (SSL'dan keyin to'ldiramiz)
- `ADMIN_EMAIL` — sizning email (Admin roli uchun)
- `USE_HTTPS_REDIRECTION=false` — shu holatda qoldiring

`nano`da saqlash: `Ctrl+O`, `Enter`, keyin `Ctrl+X`.

---

## 5. 1-BOSQICH: HTTP bilan ishga tushirish

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

> Birinchi build 3–6 daqiqa (NuGet restore + publish). Keyingilari tez (kesh).

Holatni ko'rish:
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
```

**Tekshiruv:** brauzerda **http://89.167.74.156** oching — TypingWar bosh sahifasi chiqishi kerak.
(Login hali ishlamaydi — u SSL + Google sozlamasidan keyin.)

---

## 6. 2-BOSQICH: DNS + SSL (typingwar.uz)

### 6.1 DNS
Domen registratoringizda (typingwar.uz) **A record** qo'shing:

| Type | Name | Value |
|------|------|-------|
| A | @ | 89.167.74.156 |
| A | www | 89.167.74.156 |

DNS tarqalishini kuting (5 daqiqa – bir necha soat). Tekshirish:
```bash
dig +short typingwar.uz   # 89.167.74.156 chiqishi kerak
```

### 6.2 SSL sertifikat (DNS tayyor bo'lgach, serverda)

```bash
cd /opt/typingwar
bash deploy/init-ssl.sh
```

Bu skript: Let's Encrypt sertifikat oladi → nginx'ni HTTPS'ga o'tkazadi → qayta yuklaydi.

**Tekshiruv:** **https://typingwar.uz** ochiladi (yashil qulf).

> `www` DNS qo'shmagan bo'lsangiz, `deploy/init-ssl.sh` ichidagi `-d "$WWW"` qatorini o'chiring.

### 6.3 Google OAuth (login uchun)
1. https://console.cloud.google.com → APIs & Services → Credentials → **OAuth client ID** (Web)
2. **Authorized redirect URIs**: `https://typingwar.uz/signin-google`
3. ClientId/Secret'ni serverdagi `.env` ga yozing, keyin:
```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## 7. Yangilash (kod o'zgargach)

Mahalliy: `git push`. Keyin serverda:
```bash
cd /opt/typingwar
git pull
docker compose -f docker-compose.prod.yml up -d --build
```
> Migration'lar app ishga tushganda **avtomatik** qo'llanadi. Ma'lumotlar (Postgres/Redis) Docker volume'da saqlanadi — yo'qolmaydi.

---

## 8. SSL'ni yangilab turish (90 kunda tugaydi)

Avtomatik yangilash uchun cron qo'shing (`crontab -e`):
```cron
0 3 * * 1 cd /opt/typingwar && docker run --rm -v "$(pwd)/certbot/conf:/etc/letsencrypt" -v "$(pwd)/certbot/www:/var/www/certbot" certbot/certbot renew --webroot -w /var/www/certbot --quiet && docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

---

## 9. Foydali buyruqlar

```bash
# loglar
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f nginx

# qayta ishga tushirish / to'xtatish
docker compose -f docker-compose.prod.yml restart app
docker compose -f docker-compose.prod.yml down          # to'xtatish (ma'lumot saqlanadi)
docker compose -f docker-compose.prod.yml up -d          # qayta yoqish

# bazaga kirish
docker compose -f docker-compose.prod.yml exec postgres psql -U typingwar -d typingwar

# disk/keshni tozalash
docker system prune -af
```

---

## 10. Muammolar

- **Sahifa ochilmaydi** → `docker compose ... ps` (hammasi "Up"?), `logs -f app`.
- **502 Bad Gateway** → app hali ishga tushmagan yoki yiqilgan; `logs -f app`.
- **DB ulanmadi** → `.env` dagi `POSTGRES_PASSWORD` compose va app'da bir xilligini tekshiring.
- **SSL olinmadi** → DNS hali tarqalmagan; `dig +short typingwar.uz` IP ni qaytarishini kuting.
- **Login ishlamaydi** → Google redirect URI aynan `https://typingwar.uz/signin-google` ekanini tekshiring.
