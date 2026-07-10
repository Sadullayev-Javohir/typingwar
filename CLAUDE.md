# CLAUDE.md — TypingWar.uz

> Bu fayl Claude Code CLI tomonidan har sessiyada avtomatik o'qiladi.
> Loyiha konteksti, qoidalar va joriy holat shu yerda saqlanadi.

---

## 1. Loyiha haqida

**Nomi:** TypingWar.uz
**Domen:** typingwar.uz
**Turi:** O'zbek tilidagi typing musobaqa platformasi (monkeytype.com ga o'xshash, lekin kuchliroq va noyob xususiyatlarga ega).
**Auditoriya:** O'zbekistondagi talabalar, dasturchilar, freylanserllar, typing ishqibozlari.

**Brending:**
- Logo: yuguruvchi cheetah (gepard), oltin-sariq rangda
- Asosiy rang: `#E8A020` (oltin sariq)
- Fon rangi: `#0F0F1A` (qoramtir ko'k-qora)
- Accent: `#FF9900` (ko'z rangi)
- Shior: "Eng tez barmoqlar g'alaba qozonadi"

---

## 2. Texnologiya Stack

### Backend
- **ASP.NET Core 8.0 LTS** — asosiy web framework
- **C# 12** — dasturlash tili
- **Clean Architecture + CQRS** — MediatR 12.x bilan
- **Entity Framework Core 8.x** — ORM (PostgreSQL)
- **SignalR 8.x** — real-time WebSocket
- **Hangfire 1.8.x** — background jobs (daily contest scheduler)
- **FluentValidation 11.x** — model validatsiya
- **Mapster 7.x** — DTO mapping (⚠️ AutoMapper EMAS — zaiflik bor)
- **Serilog 3.x** — structured logging
- **StackExchange.Redis 2.x** — Redis client

### Frontend
- **Razor Pages 8.x** — server-side rendering
- **Bootstrap 5.3** — responsive layout
- **Vanilla JavaScript (ES2022)** — typing engine, keystroke handler
- **SignalR JS Client 8.x** — real-time
- **Chart.js 4.x** — grafiklar
- **Alpine.js 3.x** — yengil reaktiv UI
- **Animate.css 4.x** — animatsiyalar

### Ma'lumotlar bazasi va infratuzilma
- **PostgreSQL 16.x** — asosiy DB (Docker port **5433:5432**)
- **Redis 7.x** — leaderboard cache, session (Docker port **6380:6379**)
- **Nginx 1.24** — reverse proxy, SSL
- **Docker + Docker Compose** — konteynerizatsiya
- **Let's Encrypt** — bepul SSL
- **GitHub Actions** — CI/CD
- **DigitalOcean** — server (GitHub Student Pack: $200 kredit)

### Autentifikatsiya
- **JWT Bearer Token** — HttpOnly cookie da saqlanadi
- **Google OAuth 2.0** — ijtimoiy kirish
- **ASP.NET Core Identity 8.x** — foydalanuvchi menejment
- **BCrypt.Net-Next** — parol xeshlash

---

## 3. Qat'iy QOIDALAR (har doim amal qil)

1. **`global.json`** yarat va `.NET 8.0` ni fiksatsiya qil
2. **Mapster** ishlat — AutoMapper EMAS (zaiflik bor)
3. **Enum nomlari aniq:** `RaceStatus`, `RoomStatus` (framework bilan to'qnashmasin — `TaskStatus` kabi nomlardan qoch)
4. **Docker portlar:** PostgreSQL = `5433:5432`, Redis = `6380:6379` (local conflict oldini olish)
5. Har **Command/Query** uchun MediatR **Handler** yoz
6. Har **Service** uchun **interface** yarat va **Program.cs** da DI ga ro'yxatdan o'tkaz
7. Barcha kod **toza, xatosiz, kompilatsiya bo'ladigan** bo'lsin
8. Kod yozishdan oldin **reja tuz**, keyin amalga oshir
9. Har vazifadan keyin **`dotnet build`** qilib xato yo'qligini tekshir
10. Har bosqich oxirida **`loglar/faza-N-hisobot.txt`** yarat
11. JWT **HttpOnly cookie** da, Authorization header da EMAS
12. EF Core **parametrli query** — xom SQL ishlatma (SQL injection himoya)
13. Har bosqich tugagach **git commit** qil
14. **TO'LIQ AVTONOM ishla:** har qadamda tasdiq so'rama ("commit qilaymi?", "davom etaymi?", "Yes/No?"). So'rovni oxirigacha o'zing bajar — tahlil, kod, build/test, **`git add` + `git commit`** (o'zbekcha xabar) — hammasi savolsiz. Faqat OXIRIDA qisqa xulosa yoz. Savolni faqat haqiqatan bloklovchi, foydalanuvchigagina tegishli holatda ber.

---

## 4. Arxitektura (4 qatlam)

```
TypingWar/
├── src/
│   ├── TypingWar.Domain/          # Entities, Enums, Events, Interfaces (BOG'LIQLIKSIZ)
│   ├── TypingWar.Application/      # CQRS Commands/Queries, DTOs, Validators, Services
│   ├── TypingWar.Infrastructure/   # EF Core, Redis, Hangfire, Email, OAuth
│   └── TypingWar.Web/              # Razor Pages, Controllers, SignalR Hubs, Middleware
├── tests/
│   ├── TypingWar.UnitTests/
│   └── TypingWar.IntegrationTests/
├── loglar/                         # faza-N-hisobot.txt fayllar
├── docker-compose.yml
├── nginx.conf
├── global.json
└── CLAUDE.md
```

**Qatlam bog'liqliklari (faqat ichkariga):**
- Domain → hech kimga bog'liq emas
- Application → faqat Domain
- Infrastructure → Domain + Application
- Web → hammasiga

---

## 5. Ma'lumotlar bazasi jadvallar (14 ta asosiy)

| Jadval | Asosiy ustunlar |
|--------|-----------------|
| `Users` | Id, Username, Email, PasswordHash, EloRating, RegionCode, AvatarUrl |
| `RaceTexts` | Id, Content, Language, WordCount, Difficulty, Category |
| `RaceResults` | Id, UserId, TimeMode, Wpm, RawWpm, Accuracy, TextId, PlayedAt |
| `PersonalBests` | UserId, TimeMode, BestWpm, Accuracy, AchievedAt (PK: UserId+TimeMode) |
| `Rooms` | Id, Code(8 char), HostId, Status, Settings(JSON), CreatedAt |
| `RoomPlayers` | RoomId, UserId, JoinedAt, IsHost, FinalWpm |
| `Tournaments` | Id, Name, Status, BracketType, StartAt, Settings(JSON) |
| `TournamentMatches` | Id, TournamentId, Round, Player1Id, Player2Id, WinnerId |
| `TeamRaces` | Id, Status, TeamAScore, TeamBScore, TextId, StartedAt |
| `TeamMembers` | TeamRaceId, UserId, Team(A/B), Wpm, Accuracy |
| `TypingFingerprints` | UserId, BigramStats(JSON), SlowKeys(JSON), AvgWpm, UpdatedAt |
| `DailyContests` | Id, Date, TextId, Status, WinnerId, TotalParticipants |
| `RegionStats` | RegionCode, RegionName, TotalWpm, PlayerCount, AvgWpm, Date |
| `Friendships` | RequesterId, AddresseeId, Status, CreatedAt |

---

## 6. Enum lar

- `RaceStatus` — Waiting, Countdown, InProgress, Finished
- `RoomStatus` — Waiting, Countdown, InProgress, Finished, Expired
- `TimeMode` — Ten=10, Fifteen=15, Thirty=30, Sixty=60, OneTwenty=120
- `Language` — Uzbek, English, Russian
- `Difficulty` — Easy, Normal, Hard, Expert
- `TextMode` — Words, Sentences, Numbers, Code
- `SabotageType` — Blackout, Shuffle, Shake, Mirror, Slowdown
- `TournamentStatus` — Registration, InProgress, Finished

---

## 7. O'zbekiston hududlari (14 ta — RegionStats uchun)

| Hudud nomi | Region kodi |
|------------|-------------|
| Toshkent shahri | `TASHKENT_CITY` |
| Toshkent viloyati | `TASHKENT_REGION` |
| Andijon viloyati | `ANDIJAN` |
| Farg'ona viloyati | `FERGANA` |
| Namangan viloyati | `NAMANGAN` |
| Samarqand viloyati | `SAMARKAND` |
| Buxoro viloyati | `BUKHARA` |
| Navoiy viloyati | `NAVOI` |
| Qashqadaryo viloyati | `KASHKADARYA` |
| Surxondaryo viloyati | `SURKHANDARYA` |
| Jizzax viloyati | `JIZZAKH` |
| Sirdaryo viloyati | `SYRDARYA` |
| Xorazm viloyati | `KHOREZM` |
| Qoraqalpog'iston Respublikasi | `KARAKALPAKSTAN` |

> O'zbekiston xaritasi: har hudud alohida SVG `<path>`, `data-region` atributi bilan
> (masalan `data-region="SAMARKAND"`). Bosilganda o'sha hududning WPM ko'rsatiladi.
> Hududlar o'rtacha WPM bo'yicha rang intensivligi bilan bo'yaladi (issiq=tez).

---

## 8. Asosiy formulalar

- **WPM** = (to'g'ri yozilgan harflar / 5) / o'tgan daqiqalar
- **Raw WPM** = (jami bosilgan tugmalar / 5) / o'tgan daqiqalar
- **Accuracy** = (to'g'ri harflar / jami harflar) × 100
- **5 harf = 1 so'z** (xalqaro typing standart)
- Backspace xatoni to'g'irlaydi, lekin Raw WPM ga ta'sir qilmaydi

---

## 9. SignalR Hub lar

| Hub | Fayl | Ishlatilishi |
|-----|------|--------------|
| `RaceHub` | Hubs/RaceHub.cs | 1vs1, Ghost, Blind Duel, AI musobaqasi |
| `LobbyHub` | Hubs/LobbyHub.cs | Do'stlar xonasi — qo'shilish, kutish, boshlash |
| `TeamRaceHub` | Hubs/TeamRaceHub.cs | 5x5 jamoaviy musobaqa |
| `TournamentHub` | Hubs/TournamentHub.cs | Turnir bracket — live natijalar |
| `UzMapHub` | Hubs/UzMapHub.cs | O'zbekiston xaritasi — real-time hududlar statistikasi |

---

## 10. Xususiyatlar (qisqacha mantiq)

### Do'stlar musobaqasi (Room)
- 8 xonali kod: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (I, O, 0, 1 yo'q — chalkashlik oldini olish)
- Kod Redis da 30 daqiqa TTL
- Faqat host "Boshlash" tugmasini bosadi, 3-2-1 countdown

### Leaderboard
- 5 ta tab: 10s/15s/30s/60s/120s
- Doim top 50 ko'rsatiladi
- User 50da bo'lmasa → separator(···) + uning qatori oxirida (ajratilgan)
- Faqat PersonalBest leaderboard ga tushadi
- Redis Sorted Set — top 50 ni 0.1ms da qaytaradi

### AI Raqib (adaptive algorithm, haqiqiy AI emas)
- So'nggi 10 poyga avg WPM → target = avg + delta
- User yutsa: delta +2 (max +10), yutqazsa: delta -2 (min -10)
- Redis key: `ai_delta_{userId}`
- AiTypingSimulator: har (60000/wpm/5)ms da signal, ±15ms jitter, ±3 WPM og'ish

### Ghost rejimi
- PersonalBest ga qarshi o'ynaydi
- Frontend da pure JS, CSS animation (server hisoblamaydi)

### Sabotaj (3+ o'yinchi)
- 5 tur: Blackout, Shuffle, Shake, Mirror, Slowdown
- Har o'yinchi 1 musobaqada faqat 1 marta (Redis guard)

### 5x5 Jamoaviy
- 5 a'zo, bir xil matn, WPM lar qo'shiladi, jamoalar solishtiriladi

### Turnir
- 16/32 kishi bracket, Hangfire scheduler, live (TournamentHub), tomoshabin rejimi

### Daily Contest
- Hangfire RecurringJob har kuni 20:00, streak tizimi + badge

### AI Fingerprint
- Keystroke timing, sekin bigramlar → "Yozish Pasporti" + heat map klaviatura

### Offline PWA
- Service Worker, IndexedDB, internet kelganda sync

---

## 11. Foydalanuvchi sozlamalari (15 ta)

TextMode, WordCount (10/25/50/100), TimedMode, TimeLimitSeconds (10/15/30/60/120),
Difficulty, Language, Theme (Dark/Light/Sepia/Custom), FontFamily, FontSize (14-24px),
CaretStyle (Line/Block/Underline/Off), SmoothCaret, ShowLiveWpm, BlindMode, StopOnError,
SoundOnClick (Off/Soft/Mechanical/Typewriter)

> Saqlash: kirgan user → DB (UserSettings), kirmagan → LocalStorage. Ikkalasi sinxronlanadi.

---

## 12. Xavfsizlik (barcha bosqichlarda)

- Rate limiting: login 5 urinish / 15 daqiqa
- WPM validatsiya: >250 WPM → rad etiladi (aldash himoyasi)
- Room kodi bruteforce: 10 xato → IP 1 soat bloklanadi
- XSS: Razor default escaping + CSP header
- CSRF: ASP.NET Core Antiforgery token
- SQL injection: EF Core parametrli query
- JWT: HttpOnly cookie, SameSite, HTTPS only
- Sabotaj spam: Redis flag, 1 musobaqa = 1 sabotaj
- Nginx orqasida IP rate limiting uchun `UseForwardedHeaders` qo'shish

---

## 13. Build va ishga tushirish buyruqlari

```bash
# Infratuzilmani ko'tarish
docker-compose up -d

# Build
dotnet build

# Migration
dotnet ef migrations add [Name] --project src/TypingWar.Infrastructure --startup-project src/TypingWar.Web
dotnet ef database update --project src/TypingWar.Infrastructure --startup-project src/TypingWar.Web

# Ishga tushirish
dotnet run --project src/TypingWar.Web

# Test
dotnet test
```

---

## 14. Qurilish bosqichlari (10 bosqich)

1. **Foundation** — solution, Docker, entities, EF Core, Identity, JWT, OAuth, Redis
2. **Typing Engine** — keystroke handler, WPM, accuracy, solo practice, settings
3. **Leaderboard** — Redis Sorted Set, top 50 + user rank, 5 tab
4. **Do'stlar musobaqasi** — Room, 8 xonali kod, LobbyHub, RaceHub, countdown
5. **AI + Ghost** — AiOpponentService, AiTypingSimulator, Ghost, Blind Duel
6. **5x5 Jamoaviy** — TeamRace, TeamRaceHub, jamoa WPM
7. **Sabotaj** — 5 tur effekt, RaceHub.SabotageAttack
8. **Daily Contest + Turnir** — Hangfire job, streak, bracket, TournamentHub
9. **O'zbekiston xaritasi + Fingerprint** — RegionStats, UzMapHub, SVG xarita, fingerprint
10. **Qo'shimcha** — ovozli typing, kod rejimi, takroriy xotira, PWA, admin, profil

---

## 15. JORIY HOLAT

```
Bosqich: 10 (Qo'shimcha) — TUGALLANDI ✅  >>> LOYIHA YAKUNLANDI (10/10) <<<
Keyingi vazifa: yo'q — barcha 10 bosqich tugallandi. Ixtiyoriy yaxshilanishlar pastda.
Tugallangan:
  - Bosqich 1 (Foundation): solution, 6 loyiha, Docker, 14 entity, EF Core,
    Identity, JWT cookie, Google OAuth (backend), Redis, migration
  - Bosqich 2 (Typing Engine): UserSettings, TypingCalculator, 4 rejim,
    WordBanks, DataSeeder, /Practice + /Settings
  - Bosqich 3 (Auth + Leaderboard): auth (JWT cookie, lockout), /Login +
    /Register; Redis leaderboard (top 50 + user rank), /Leaderboard
  - Bosqich 4 (Do'stlar musobaqasi): RoomCodeGenerator, Create/GetRoom
    (Redis kod 30daq TTL), RoomLiveState, LobbyHub (/hubs/lobby), /Rooms + /Room
  - Bosqich 5 (AI + Ghost): AiTypingSimulator (jadval), AiOpponentService
    (avg10+delta, ai_delta_{userId}), RaceHub (/hubs/race: StartAiRace/
    FinishAiRace), RecordResultCommand refaktor, GetPersonalBest, /Race
    (AI/Ghost/Blind Duel), 16 unit test, negotiate OK
  - Bosqich 6 (5x5 Jamoaviy): TeamRace/TeamMember, TeamSide, TeamRaceScoring,
    Create/GetTeamRace (Redis tr:{code} 30daq TTL), TeamRaceLiveState
    (singleton, jamoa WPM yig'indisi), TeamRaceHub (/hubs/teamrace: Join/
    ChangeSide/Start/ReportProgress/Finish, DB persist), /Teams + /Team
  - Bosqich 7 (Sabotaj): SabotageRules (5 tur duration+Parse), LobbyHub.
    SabotageAttack (InProgress, 3+ o'yinchi, Redis guard sab:{room}:{round}:
    {conn} 1×/poyga, yetakchiga hujum), 5 vizual effekt (Blackout/Shuffle/
    Shake/Mirror/Slowdown), /Room sabotaj paneli+banner+lenta, 13 test
  - Bosqich 8 (Daily Contest + Turnir): TournamentBracket+ContestStreak
    (sof), DailyContestEntry/TournamentPlayer entity, Hangfire In-Memory
    (daily-contest 20:00, tournament-starter har daqiqa), Contests CQRS
    (Ensure/GetToday/Submit, streak+badge), Tournaments CQRS (Create/
    Register/Start[bracket+bye]/ReportMatch/Get/List), TournamentHub
    (/hubs/tournament, live+tomoshabin), /Contest+/Tournaments+/Tournament,
    migration AddContestsAndTournaments, 24 yangi test (jami 65)
  - Bosqich 9 (Xarita + Fingerprint): FingerprintAnalyzer (sof Merge/
    Slowest), IUserProfileReader, Map CQRS (GetRegionStats/SubmitRegion),
    Fingerprint CQRS (Get/Update, JSON), UzMapHub (/hubs/uzmap live),
    Regions+Fingerprint controller, /Map (stilize SVG 14 hudud heat map +
    mini test) + /Fingerprint (QWERTY heat map), 5 yangi test (jami 70)
  - Bosqich 10 (Qo'shimcha): ovozli typing (tw-sound.js WebAudio sintez),
    kod rejimi (mavjud), Review (GetReviewText fingerprint drill, /Review),
    PWA (manifest+sw.js app shell+tw-offline.js IndexedDB navbat), Admin
    (GetAdminStats/AddRaceText, role seed+Admin:Email, /Admin), Profil
    (GetProfile, /Profile). 70 test o'tadi.
Yaxshilanishlar:
  - [2026-06-20] /Race ADAPTIV AI raqib (jonli) + Tab orqali qaytadan boshlash:
    (1) ADAPTIV AI: avval AI butun poyga davomida O'ZGARMAS targetWpm (tarix avg+delta) jadvali
    bilan yozardi. Endi AI foydalanuvchining JORIY tezligini kuzatadi va doim undan biroz USTUN
    turadi. race.js tick() qayta yozildi: ikki EMA (tez tau 500ms = joriy tezlik, sekin tau 2500ms
    = tendensiya); accel = userFast-userSlow; AI maqsadi = userFast + AI_BASE_LEAD(2.5) +
    AI_OVERSHOOT(1.2)*accel; aiFloor = max(15, target*0.6); aiWpmCur maqsadga tau 450ms bilan silliq
    intiladi; aiChars dt bo'yicha oldinga suriladi. Foydalanuvchi tezlashsa AI undan ko'proq otiladi,
    sekinlashsa AI ham biroz tushadi, lekin doimo ustun (g'olib bo'lishga moyil, ammo yutib bo'ladi:
    user matnni AI dan oldin tugatsa yutadi). Faqat AI/Blind adaptiv; Ghost o'zgarmas PB jadvalida
    qoladi. Natija grafigi (buildAiWpm) endi adaptiv uchun jonli yozib olingan soniyalik aiSecWpm dan
    chiziladi (Ghost — eski schedule). finish() AI tugatish vaqti/WPM ini jonli simulyatsiyadan oladi.
    Server AiOpponentService: bazaviy maqsad avg*1.05+delta (zamin ham ustun).
    (2) TAB = QAYTADAN BOSHLASH (AI/Ghost/Blind): document keydown Tab → preventDefault + begin();
    poyga davomida, natija ekranida, sozlama ekranida ishlaydi. begin() qayta-kirishdan himoyalandi
    (starting flag), eski rafId + countdown taymeri (cdTimer) tozalanadi — ikki tick loop oldini oladi.
    sw.js cache v70. Build OK, 105 test, race.js node -c sintaksis OK.
  - [2026-06-18] XAVFSIZLIK 2-bosqich — xona kodi brute-force qulflash + server qattiqlashtirish:
    (1) BRUTE-FORCE QULFLASH (kod 4 xonali = 10 000 variant, enumeratsiyaga ochiq edi):
    yangi IBruteForceGuard (Application) + BruteForceGuard (Infrastructure, Redis) — bir amal +
    bir IP bo'yicha xato urinishlarni sanaydi: 15 daqiqada 10 xato → IP 1 SOATGA bloklanadi
    (hisoblagich/blok kalitlari Redis TTL bilan o'z-o'zidan o'chadi). ICacheService'ga atomik
    IncrementAsync(key, expiryIfFirst) qo'shildi (Redis INCR + birinchi marta KeyExpire).
    RoomsController.Get va TeamRacesController.Get: blok bo'lsa 429; topilmasa RegisterFailure;
    topilsa ResetAsync (haqiqiy mehmon jazolanmaydi). IP — ForwardedHeaders orqali haqiqiy mijoz IP.
    3 yangi unit test (105 jami). Jonli tasdiq: 10 ta noto'g'ri kod 404 → 11-dan 429+qulf xabari.
    (2) SignalR HUBLAR KO'RIB CHIQILDI — spoofing YO'Q: UserId Context.User (imzolangan JWT claim)
    dan olinadi, mijoz yuborgan qiymatdan emas; host amallari (u != live.HostId) server-tomonda
    tekshiriladi; anonim (UserId=null) natijasi DB'ga yozilmaydi. [Authorize] qo'shilmadi (anonim
    o'yinni buzadi, kerak emas).
    (3) Host-header himoyasi: AllowedHosts endi sozlanadigan (docker-compose.prod env ALLOWED_HOSTS,
    standart "*"; DNS ulangach domen bilan cheklash uchun .env.example izohi). nginx ssl.conf
    server_name allaqachon cheklaydi.
    (4) deploy/SECURITY.md — server qattiqlashtirish qo'llanmasi: UFW firewall (faqat 22/80/443,
    DB/Redis yopiq tasdiqlash), fail2ban (nginx 429 → IP ban), Cloudflare (volumetrik DDoS + WAF +
    real-IP), secrets/SSH/yangilanishlar. Build OK, 105 test.
  - [2026-06-18] XAVFSIZLIK qatlami — DDoS / brute-force / XSS himoyasi (kiber hujum):
    (1) RATE LIMITING (avval umuman yo'q edi — eng katta bo'shliq): nginx CHEKKA qatlami
    (default.conf + ssl.conf) — limit_req_zone general=30r/s (burst 60), auth=20r/m (burst 10,
    /api/auth/ uchun qattiqroq), limit_conn perip=40; Slowloris himoyasi (client_body_timeout/
    client_header_timeout 15s, send_timeout 30s, large_client_header_buffers 4 8k, client_max_body_size
    10m→2m); server_tokens off (nginx versiyasi yashirin). /hubs/ alohida location (WebSocket — req-rate
    cheklovsiz, faqat conn). ASP.NET ILOVA qatlami (defense-in-depth, nginx chetlab o'tilsa ham):
    AddRateLimiter — GlobalLimiter har IP 240/daqiqa + "auth" siyosati 20/daqiqa (AuthController'da
    [EnableRateLimiting("auth")]); 429 → JSON + Retry-After. IP partition ClientIp (ForwardedHeaders
    orqali haqiqiy IP). Tasdiqlandi: /api/auth/me 20 dan keyin 429+Retry-After:60.
    (2) CSP (Content-Security-Policy) — avval yo'q edi: har so'rovda yangi nonce (RandomNumberGenerator,
    HttpContext.Items["csp-nonce"]); script-src 'self' 'nonce-...' cdnjs.cloudflare.com (SignalR);
    style-src 'self' 'unsafe-inline' fonts.googleapis.com cdn.jsdelivr.net; font-src + gstatic/jsdelivr;
    img-src 'self' data: https:; object-src 'none'; frame-ancestors 'none'; base-uri/form-action 'self';
    connect-src/worker-src/manifest-src 'self'. 2 inline <script> (_Layout logout/SW + Index loader)
    nonce oldi (@ViewContext.HttpContext.Items["csp-nonce"]). In'ektsiya skript bajarilmaydi.
    (3) Qo'shimcha header: Permissions-Policy (geolocation/mic/camera/payment/usb=()), Cross-Origin-
    Opener-Policy: same-origin; header'lar UseStaticFiles'dan OLDIN (statik fayllar ham nosniff oladi).
    Kestrel AddServerHeader=false (Server header oshkor emas). Build OK, 102 test, headless Chrome:
    bosh sahifa + /Map'da CSP buzilish YO'Q, nonce header=HTML mos, Server header yo'q. nginx -t parsing OK.
    (1) Yangi tw-keyboard.js (window.TWKeyboard: mount/highlight/flash/clear/setVisible) —
    QWERTY virtual klaviatura (54 tugma), keyingi yoziladigan belgini YORITIB ko'rsatadi
    (katta harf/maxsus belgi bo'lsa Shift ham yonadi), bosilganda to'g'ri/xato vizual javob.
    normChar engine bilan mos (tire/apostrof/qo'shtirnoq normallashtiriladi). Ranglar tema
    o'zgaruvchilaridan (--tw-surface/--tw-gold/--tw-text) + color-mix translucent — tema/fon
    almashganda klaviatura ham qayta bo'yaladi. Home-row (f/j) tayanch chiziqchasi.
    (2) typing-engine.js integratsiya: init'da KB.mount, moveCaret→updateKeyboard (keyingi
    belgini yoritadi), handleKey→KB.flash, klaviaturani bosish typing fokusini olmaydi.
    FOKUS REJIM: yozish boshlanganda (startIfNeeded) body.tw-focus — navbar+footer yashirinadi,
    asosiy ekran (.tw-words) ~1.4× kattalashadi, config yashirinadi, klaviatura pastda fixed
    (blur fon). finish()/restart()→exitFocus, natija ekranida klaviatura yashirinadi.
    (3) /Settings "Mashq ko'rinishi" kartasiga "Ekran klaviaturasi" switch (showKeyboard) —
    o'chirilsa klaviatura ham, fokus rejim ham ishlamaydi. Backend: UserSettings+DTO
    ShowKeyboard (default true), migration AddShowKeyboardSetting (mavjud yozuvlar true),
    DB'ga qo'llandi. typing-settings.js DEFAULTS showKeyboard:true. site.css tw-keyboard/
    tw-key/tw-key-next/tw-focus bloklari; sw.js cache v61 (+tw-keyboard.js). Build OK, 102
    test, headless Chrome: 54 tugma render + boshlang'ich keyingi-tugma yoritildi, JS konsol toza.
  - [2026-06-18] SEO — Google'da yuqori chiqish uchun to'liq optimizatsiya:
    (1) _Layout.cshtml <head> qayta yozildi (IConfiguration inject): har sahifa uchun ViewData
    bilan boshqariladigan meta description/keywords/robots/canonical + Open Graph (og:type/title/
    description/url/image/site_name/locale uz_UZ+en_US) + Twitter Card (summary_large_image) +
    author/application-name + apple-touch-icon. Title endi to'liq sozlanadi (ViewData["FullTitle"]
    yoki "{Title} — TypingWar.uz"). Standart tavsif+kalit so'zlar o'zbekcha (typing test, terish
    tezligi, wpm, monkeytype o'zbek...). Bazaviy URL Site:BaseUrl konfiguratsiyadan (appsettings:
    https://typingwar.uz).
    (2) JSON-LD strukturali ma'lumotlar (@@context/@@graph): Organization + WebSite + WebApplication
    (GameApplication, bepul, uz/en). Sahifaga qo'shimcha "StructuredData" seksiyasi.
    (3) SeoController: dinamik /robots.txt (Allow / + /api,/hubs,/hangfire,/Admin,/Settings,/Profile,
    /Room,/Team,/CompleteProfile,/TournamentDemo Disallow + Sitemap havolasi) va /sitemap.xml
    (12 ommaviy sahifa, priority+changefreq+lastmod, System.Xml.Linq), 24soat ResponseCache.
    (4) Sahifalarga meta: Index (FullTitle+boy tavsif), Practice/Race/Leaderboard/Tournaments/
    Contest/Rooms/Teams/Map/Review/Login/Privacy — har biriga keyword-rich tavsif; /share/{username}
    og:type=profile + dinamik tavsif (indekslanadi). Shaxsiy/dinamik sahifalar noindex: Admin/
    CompleteProfile/Room/Team/TournamentDemo (noindex,nofollow), Settings/Profile/Tournament/
    Fingerprint/Register (noindex,follow). Build OK, 102 test, ishlaydigan app: robots.txt+sitemap.xml
    +home meta/JSON-LD+Practice canonical+share og:type+Admin 401 tasdiqlandi.
    QOLDI (deploy keyin, qo'lda): Google Search Console'ga typingwar.uz qo'shib sitemap yuborish.
  - [2026-06-18] /Profile — o'sish grafiklari + yillik faollik kalendari (GitHub uslubi):
    (1) BACKEND: GetProfile.cs (ProfileBuilder) RaceResults'ni kun bo'yicha guruhlab
    DailyActivityDto(Date, Races, AvgWpm, BestWpm, Seconds) ro'yxatini quradi; ProfileDto'ga
    Activity qo'shildi (own + ommaviy /share ikkalasida). PB bo'limlari (vaqt 15/30/60/120 +
    so'z 10/25/50/100, har biri alohida, eng kuchlida toj) avvalgidek.
    (2) FRONTEND (profile.js): "O'sish grafiklari" paneli — 4 tab (Kunlik 30 kun / Haftalik 16
    hafta / Oylik 12 oy / Yillik barcha yillar). Canvas (DPR-aware): o'rtacha WPM (oltin
    chiziq+nuqta), eng yuqori WPM (kulrang uzuq), poyga soni (orqa fon ustun), to'r+Y belgilar,
    X yorliqlar, hover tooltip. buildBuckets avg'ni poyga soniga vaznlaydi, best=max.
    (3) "Yillik faollik" — GitHub heat map: yil tugmalari (faollik+ro'yxat+joriy yil, standart eng
    oxirgi), 53×7 (dushanbadan), 5 darajali rang (0/1-2/3-5/6-9/10+), oy/kun yorliqlari, title
    tooltip, yil xulosasi (jami poyga/faol kun/eng uzun streak/eng yuqori WPM). 2027'da ham 2026
    faollik ko'rinadi. site.css tw-growth/tw-chart-*/tw-act-*; sw.js cache v47. Build OK, 102 test,
    headless Chrome (toza konsol, 4 tab+canvas+heat map l0-l4+2026/2027 tugma+xulosa) tasdiqlandi.
  - [2026-06-18] /Admin paneli to'liq qayta qurildi + SuperAdmin roli:
    (1) ROLLAR: yangi "SuperAdmin" roli + mavjud "Admin". Config Admin:SuperEmail
    (standart javohirsadullayev836@gmail.com) → bu email Admin+SuperAdmin oladi; Admin:Email →
    faqat Admin. Program.cs startupda 2 rol seed qilinadi + email bo'yicha tayinlanadi.
    AuthService.FindOrCreateGoogleUser kirishda ham IConfiguration orqali admin rollarini
    ta'minlaydi (birinchi loginda darhol ishlaydi, restart kutilmaydi). JWT'da ClaimTypes.Role.
    docker-compose.prod.yml: Admin__SuperEmail env (ADMIN_SUPER_EMAIL), deploy/.env.example yangilandi.
    (2) BACKEND: IAdminService (Infrastructure/Identity/AdminService — UserManager+AppDbContext):
    ListUsersAsync (qidiruv, poyga soni+eng yaxshi WPM bilan), DeleteUserAsync (SuperAdmin himoyalangan;
    bog'liq domen ma'lumotlari ExecuteDeleteAsync bilan tozalanadi: RaceResults/PersonalBests/
    UserSettings/Fingerprints/ContestEntries/RoomPlayers/TeamMembers/TournamentPlayers/Friendships),
    SetAdminRoleAsync (Admin rolini ber/ol; SuperAdmin himoyalangan), GetUsernamesAsync. CQRS:
    ListUsers/DeleteUser(o'zini o'chirib bo'lmaydi)/SetUserRole/AdminListTournaments/AdminDeleteTournament
    (host tekshiruvisiz). Endpointlar: GET /api/admin/users?search=, GET /tournaments (Admin);
    DELETE /users/{id}, POST /users/{id}/role (faqat SuperAdmin); DELETE /tournaments/{id} (Admin).
    (3) FRONTEND: /Admin zamonaviy dizayn (default fon, mavjud tokenlar) — hero+badge (SuperAdmin/Admin),
    6 statistika kartasi, 3 tab (Foydalanuvchilar/Turnirlar/Matn). Foydalanuvchilar jadvali: avatar+ism+
    email, hudud, ELO, poyga, eng yaxshi WPM, rol belgilar, sana; SuperAdmin uchun admin qil/ol + o'chirish
    tugmalari (confirm bilan). Turnirlar jadvali: nom/host/holat/o'yinchi/turi/sana + o'chirish. Matn qo'shish
    (mavjud). site.css tw-admin-stats/tabs/table/role/tstatus/mini-btn; sw.js cache v39. admin.js qayta
    yozildi. Build OK, 97 test, anon endpointlar 401 (himoya tasdiqlandi).
  - [2026-06-18] /Profile — shaxsiy rekordlar VAQT va SO'Z bo'limlari bo'yicha ALOHIDA
    (avval PB faqat TimeMode bo'yicha edi; so'z rejimidagi natijalar eng yaqin vaqt rejimiga
    "yopishtirilardi" — endi har bir bo'lim mustaqil rekord):
    (1) Yangi diskriminator ModeKey ("time:{soniya}" / "words:{son}" / "quote") — Domain/
    Constants/PracticeModes (TimeSeconds={15,30,60,120}, WordCounts={10,25,50,100}, DisplayOrder/
    IsTimed/IsValid/FromTimeMode). PersonalBest PK endi (UserId, ModeKey) [avval (UserId,TimeMode)];
    RaceResult'ga ham ModeKey qo'shildi. Migration AddPersonalBestModeKey — yangi PK qo'yilishidan
    OLDIN eski yozuvlar ModeKey='time:'||TimeMode bilan to'ldiriladi (bo'sh ModeKey to'qnashuvi
    oldini olish). DB'ga qo'llandi, eski PB lar to'g'ri time:10/15/30/60/120 ga aylandi.
    (2) RecordResultCommand+SubmitResultCommand ModeKey oladi (berilmasa FromTimeMode fallback);
    PB lookup ModeKey bo'yicha. Leaderboard faqat vaqt rejimlaridan (IsTimed) yangilanadi —
    so'z/iqtibos rekordlari endi vaqt leaderboard'ini "ifloslantirmaydi". Leaderboard/RegionStats
    so'rovlariga ModeKey.StartsWith("time:") filtri qo'shildi. RaceHub.FinishAiRace ModeKey beradi.
    GetPersonalBestQuery (Ghost) endi ModeKey oladi; /api/practice/personalbest?modeKey=time:30.
    (3) Frontend: typing-engine.js currentModeKey() (timed→time:N, iqtibos→quote, aks→words:N)
    submit body+offline navbatga qo'shadi. Practice.cshtml: 120s vaqt tugmasi qo'shildi (so'z 10/25/50/100);
    profile.js PB jadvali endi "Vaqt" (15/30/60/120) va
    "So'z" (10/25/50/100) guruhlari — har biri alohida qator, toj eng kuchli PB'da; modeKey yorliq
    helperi (time:30→"30s", words:50→"50 so'z"). site.css .tw-pb-group; sw.js cache v37.
    Build OK, 97 test, headless Chrome render (2 guruh, 8 qator, 3 to'lgan/5 bo'sh, toj, recent) OK.
  - [2026-06-17] /Tournaments — SHAXSIY (parolli) turnir + qulflangan ko'rinish + 1 soatlik
    avtomatik tozalash:
    (1) Yaratuvchi turnirni "Shaxsiy" qilib parol qo'yadi (4–64 belgi). Domain/Tournament:
    IsPrivate + PasswordHash (BCrypt, ochiq matn saqlanmaydi) + FinishedAt. Yangi
    IPasswordHashService (Application) + BCryptPasswordHashService (Infrastructure, DI).
    CreateTournamentCommand IsPrivate+Password oladi (private→parol majburiy, xeshlanadi).
    (2) XAVFSIZLIK — parol darvozasi SERVERDA majburlanadi (frontendni chetlab bo'lmaydi):
    RegisterTournamentCommand parolni Verify qiladi (host parolsiz), noto'g'ri→
    InvalidTournamentPasswordException→403. GetTournamentQuery: shaxsiy + ko'ruvchi ruxsatsiz
    (host emas, qatnashmagan)→IsLocked=true, players/matches/standings BO'SH qaytadi.
    TournamentHub.JoinTournament: ruxsatsizni guruhga QO'SHMAYDI ("Locked"), RoundSnapshot/
    live progress uzatilmaydi (SignalR ham himoyalangan). TournamentInfoDto+IsPrivate,
    TournamentDetailDto+IsLocked, ListTournaments IsPrivate qaytaradi.
    (3) Frontend: /Tournaments yaratishda Maxfiylik(Ochiq/Shaxsiy)+parol; ro'yxatda qulf
    belgisi; "Parol bilan kirish"→parol modali (input+OK+Bekor, Enter/Esc, 403→qayta so'rash).
    /Tournament IsLocked→qulf bo'limi (input+OK), to'g'ri parol→register→qayta yuklaydi+ulanadi;
    connectIfAllowed() qulfda hubga ulanmaydi. site.css tw-pw-modal/tw-locked/tw-tpw-wrap,
    sw.js cache v34.
    (4) AVTOMATIK TOZALASH: turnir tugaganda FinishedAt o'rnatiladi (RecordMatchOutcome+
    PrepareRound 2 joy). CleanupExpiredTournamentsCommand (Status=Finished && FinishedAt<=now-1soat
    →o'yinlar+ishtirokchilar bilan o'chiradi) + Hangfire RecurringJob "tournament-cleanup" har
    10 daqiqada. Migration AddTournamentPrivacyAndFinishedAt (eski worktree phantom migration
    20260617150837 ustunlari/yozuvi tozalanib master migration toza qo'llandi).
    Build OK, 97 test, JS sintaksis OK. Ishlaydigan app+bazadagi shaxsiy turnir bilan:
    GET list isPrivate=true; GET anonim isLocked=true+bracket BO'SH (server himoyasi tasdiqlandi);
    create/register 401; sahifalar 200. Tozalash predikati SQL bilan aniq 1 qatorga mos tasdiqlandi.
  - [2026-06-17] FAQAT GOOGLE AUTH + /Profile 2.0 + /share/{username} + birinchi rekord toji:
    (1) AUTH endi faqat Google OAuth — email/parol BUTUNLAY olib tashlandi. RegisterCommand/
    LoginCommand/AuthService parol metodlari o'chirildi. IIdentityService qayta yozildi:
    FindOrCreateGoogleUserAsync (Google sub yoki email bo'yicha topadi/parolsiz yaratadi,
    rollarni qaytaradi), CompleteProfileAsync (username unique + hudud validatsiya),
    IsUsernameAvailableAsync. ApplicationUser'ga GoogleId + ProfileCompleted qo'shildi
    (migration AddGoogleAuthAndProfileCompletion; mavjud, hududi bor userlar ProfileCompleted=true).
    AuthController: GET /api/auth/google (Challenge; sozlanmagan bo'lsa /Login?error=...),
    GET /api/auth/google/callback (External cookie'dan o'qiydi→topadi/yaratadi→JWT cookie[rollar bilan]
    →ProfileCompleted false bo'lsa /CompleteProfile), POST /api/auth/complete-profile,
    GET /api/auth/username-available. JWT endi rollarni ham o'z ichiga oladi (admin nav ishlaydi).
    (2) /Login — Google bilan davom etish kartasi (tw-gauth/tw-google-btn dizayni); /Register →
    /Login ga redirect; nav'da yagona "Kirish" (Google). Yangi /CompleteProfile sahifasi:
    username (jonli unique tekshiruv, @ prefiks, regex) + hudud select (tw-cp-* dizayn,
    complete-profile.js). Google sozlanmagan bo'lsa /Login'da do'stona xabar.
    (3) /Profile butunlay qayta dizayn (tw-profile2): banner+gradient, rangli initial avatar,
    ELO/hudud/qo'shilgan sana, 6 STATISTIKA kartasi (eng yuqori WPM, o'rtacha WPM/aniqlik,
    jami poyga, jami vaqt, rekordlar soni), 5 rejim PB jadvali (eng kuchli PB'da TOJ),
    so'nggi 12 natija. "Profilni ulashish" tugmasi → havola nusxalanadi (toast).
    GetProfileQuery kengaytirildi (ProfileStatsDto), yangi GetPublicProfileQuery + ProfileBuilder.
    (4) /share/{username} — anonim ko'riladigan ommaviy profil (bir xil tw-profile2 render,
    profile.js data-own=false, "Sen ham sinab ko'r" CTA). GET /api/profile/{username}
    (AllowAnonymous, NormalizedUserName bo'yicha case-insensitive). Username Identity'da unique.
    (5) BIRINCHI REKORD TOJI: typing-engine.js checkRecord endi birinchi natijani (avvalgi
    rekord yo'q) ham rekord deb biladi — yangi user 1 wpm yozsa ham toj chiqadi; sekin oshsa
    yana rekord. Server PB (rejim bo'yicha) tasdiqlasa submit() ham tojni ko'rsatadi.
    site.css tw-gauth/tw-cp/tw-profile2/tw-stat/tw-pb/tw-recent/tw-toast bloklari; sw.js cache v31;
    dead auth.js o'chirildi. Build OK, 97 test, headless Chrome /share render (avatar/6 stat/
    5 PB+toj/CTA) + /api/profile own&public + complete-profile rename/validatsiya tasdiqlandi.
    ⚠️ Ishlashi uchun appsettings Authentication:Google ClientId/ClientSecret kerak
    (Google Console redirect URI: https://typingwar.uz/signin-google + dev uchun localhost).
  - [2026-06-17] /Map butunlay qayta loyihalashtirildi — faqat O'zbekiston xaritasi
    (heat map + jonli reyting), yozish maydonisiz:
    (1) /Map endi faqat xarita: hero + kuchli SVG O'zbekiston xaritasi (14 hudud,
    haqiqiy geografiyaga yaqin path shakllar, gradient/glow/grid pattern), jonli
    yorug'lik chizig'i (twSweepMove), lider hudud pulslanadi (twLeaderPulse), hover
    glow, jonli yangilanishda flash. Input (yozish) butunlay olib tashlandi.
    (2) Xaritada har hududda 30s ENG TEZ WPM; rang issiqlik shkalasi (hsl ko'k→qizil).
    Hudud/yorliq bosilganda detal kartasi: eng tez WPM + ishtirokchilar soni +
    o'rtacha WPM. Pastida 14 hudud reyting jadvali (rangli bar, o'rin, o'rtacha, kishi).
    (3) Ro'yxatdan o'tishda HUDUD MAJBURIY: RegisterCommandValidator NotEmpty +
    Register.cshtml select required (placeholder disabled).
    (4) Backend: statistika endi Users(RegionCode)+PersonalBests(30s) dan hisoblanadi
    (IRegionStatsReader→RegionStatsReader, Infrastructure). RegionStatDto+BestWpm,
    RegionMapDto.MaxBestWpm. GetRegionStatsQuery qayta yozildi + GetRegionStatQuery(code).
    SubmitRegionResult o'chirildi, UzMapHub soddalashtirildi (faqat JoinMap). Jonli:
    30s yangi PB o'rnatilganda PracticeController IHubContext<UzMapHub> orqali
    "RegionUpdated" uzatadi. site.css yangi tw-map/region/detail/rank bloklari, sw v30.
    Build OK, 97 test, headless Chrome: konsol toza, 14 hudud/yorliq/reyting render,
    hudud bosilganda detal (eng tez/ishtirokchi/o'rtacha) to'g'ri, bo'sh hudud holati,
    /api/regions yangi shakl (bestWpm/avgWpm/playerCount) tasdiqlandi.
  - [2026-06-17] /Tournament — gepard kubogi qayta quruldi + matn turi tuzatildi:
    (1) MATN TURI BUG: turnir yaratishda "So'z" (10 ta) tanlansa ham doim Iqtibos matni chiqardi.
    Sabab: TournamentsController.Create Settings'ni `object?` (JsonElement) sifatida bog'lab,
    JS camelCase kalitlarini (language/textMode/wordCount) saqlardi; BuildTextRequest esa
    `RoomRaceSettings`'ga case-SENSITIVE deserialize qilib, PascalCase kutardi → barchasi
    standartga (Sentences/Iqtibos) tushib qolardi. Tuzatildi: Create endi typed `RoomRaceSettings?`
    bilan bog'laydi (Rooms kabi → PascalCase saqlanadi) + BuildTextRequest case-insensitive
    (eski camelCase yozuvlar uchun). Endi qaysi rejim tanlansa o'sha matn chiqadi.
    (2) 3D GEPARD KUBOGI QAYTA QURILDI: avval gepard SAKRASH pozasida edi, boshi kamera kadridan
    yuqorida qolib KO'RINMASDI. Endi g'urur bilan O'TIRGAN, kameraga to'g'ridan-to'g'ri QARAGAN
    gepard: aniq bosh (dumaloq quloqlar+ichi, oldinga qaragan ko'zlar+chaqnoq, tumshuq+burun+og'iz,
    GEPARD BELGISI ko'z yoshi chiziqlari), tik old oyoqlar kosa labida, bukilgan orqa oyoqlar,
    uzun yon-yuqoriga jingalak dum, va tanada qora XOLLAR (gepard naqshi). Bosh tirik harakatlanadi
    (atrofga nazar+nafas). Kamera qayta sozlandi (fov 36, pos 0/2.35/9.6, lookAt 0/2.05/0) — butun
    kubok poydevordan boshigacha kadrga sig'adi. celebrate()/konfetti/uchqun/nur saqlandi.
    sw.js cache v29. Build OK, 97 test, headless Chrome (angle/swiftshader): canvas+WebGL+TWTrophy
    xatosiz, chempion celebrate yo'li xatosiz tasdiqlandi.
  - [2026-06-17] /Tournament — host o'chirish + avtomatik bracket + PLAYOFF MARKAZIDA 3D OLTIN
    GEPARD KUBOGI (three.js):
    (1) Host turnirni o'chiradi: DeleteTournamentCommand (host-only, istalgan bosqichda — o'yinlar+
    ishtirokchilar bilan), DELETE /api/tournaments/{id} (live state tozalanadi + tomoshabinlarga
    "TournamentDeleted" → /Tournaments ga qaytadi), /Tournament sarlavhasida "Turnirni o'chirish"
    (tw-rbtn--danger, faqat host). (2) Bracket HAQIQIY ishtirokchilarga avtomatik moslanadi:
    TournamentBracket.EffectiveCapacity (3→4, 5→8, 9→16; host belgilagan sig'im faqat ro'yxat
    CHEGARASI), SeedOrder (standart playoff seeding — kuchli seedlar qarama-qarshi yarmida, byelar
    o'ng/CHAP teng taqsimlanadi), Build standart seeding'ga o'tdi. StartTournament start vaqtida
    Capacity = EffectiveCapacity(registered). Misol: 4 belgilab 3 kelsa → seed1 bye, seed2 vs seed3,
    ikkalasi finalga; 32 belgilab 5 kelsa → 8lik bracket, byelar 2 yarimga bo'linadi; 2 kishi → faqat
    final (byesiz). 8 yangi/yangilangan unit test (jami 97). (3) PLAYOFF markazida 3D oltin gepard
    kubogi (tournament-trophy.js, ES modul, /lib/three): chalice (lathe kosa + 2 dasta + pedestal +
    chempion plaketkasi) ustida sakrab turgan oltin gepard (bosh/quloq/ko'z yoshi chizig'i/4 oyoq/
    uzun dum); doimo aylanadi, oltin nur taratadi (2 point light + emissive puls + aylanuvchi spot +
    orbitadagi uchqunlar). Turnir tugagach CHEMPION KUBOKNI OLADI: yorqin portlash + 90 konfetti +
    chempion ismi (celebrate()/"tw-trophy-champion" eventi, tournament.js onFinished+banner'dan).
    WebGL bo'lmasa CSS 🏆 fallback. site.css tw-trophy-*, tw-rbtn--danger; sw.js cache v28
    (+tournament-trophy.js). Build OK, 97 test, /Tournament 200, DELETE 401(unauth), 3D modul
    headless Chrome'da WebGL canvas (three.js r160) yaratishi + xatosiz yuklanishi tasdiqlandi.
  - [2026-06-17] /Tournaments — qatnashish + host drop + hoziroq boshlash + kuchli playoff dizayn:
    (1) MUHIM TUZATISH: API enumlarni JsonStringEnumConverter bilan STRING ("Registration"/
    "InProgress"/"Finished") qaytaradi, lekin tournaments.js/tournament.js status'ni RAQAM bilan
    (===0) solishtirardi — shu sabab /Tournament'da ro'yxat bo'limi (#tw-reg) doim d-none qolib,
    HECH KIM QATNASHA OLMAYDI edi. statusKey() helper (string→raqam) qo'shildi, render()'da
    info.status normallashtiriladi; barcha taqqoslashlar tuzaldi. (2) /Tournaments ro'yxatiga
    to'g'ridan-to'g'ri "Qatnashish" tugmasi (Registration), "Jonli kuzatish" (InProgress),
    "Natijalar" (Finished) + sig'im bari; join → register → /Tournament. (3) Host "drop":
    DropTournamentPlayerCommand (host-only, Registration-only, qayta seed) + /api/tournaments/
    {id}/drop, seed ro'yxatida x tugmasi. (4) Hoziroq boshlash: host start tugmasi StartAt'dan
    qat'i nazar ishlaydi (label belgilangan vaqtdan oldin "Hoziroq boshlash"). (5) Kuchli playoff
    bracket dizayni: round ustunlari (header pill, final urg'usi), avatar (initial+rang)li match
    kartalari, VS, ulagich chiziqlar, LIVE pulse, g'olib glow/toj, gradient progress barlar,
    live progress JOYIDA yangilanadi (to'liq qayta chizilmaydi → silliq). Chempion banner
    animatsiyali. site.css tw-bk-*/tw-titem-btn/tw-seed-ava/champIn. sw.js cache v27. Build OK,
    82 test, /Tournaments+/Tournament 200, drop 401(unauth), reg bo'limi headless'da ko'rinishi
    tasdiqlandi.
  - [2026-06-17] /Tournaments butunlay qayta loyihalashtirildi — LIVE playoff turnir
    (head-to-head poyga, host boshqaruvi, tomoshabin havolasi):
    (1) Backend modeli: Tournament.HostId qo'shildi; TournamentMatch'ga ball maydonlari
    (Player1/2Wpm, Player1/2Accuracy); TournamentPlayer'ga EliminatedRound/BestWpm/BestAccuracy.
    Migration AddTournamentHostAndStats (DB yangilandi). CreateTournament endi host + Settings
    (poyga matni JSON) saqlaydi. GetTournament kengaytirildi: seed'li o'yinchilar, ball'li
    match'lar, yakuniy Standings (chempion 1-o'rin → kechroq tushganlar → BestWpm), isHost/myUserId.
    (2) Yangi CQRS: RecordMatchOutcome (ball yozadi, g'olibni aniqlaydi/host majburlaydi,
    yutqazganni EliminatedRound bilan belgilaydi, bracketni o'tkazadi, final→chempion),
    PrepareRound (bye'larni avtomatik o'tkazib, keyingi raceable roundni topadi yoki turnir
    tugaganini aniqlaydi), SetSeedOrder (host bracket tartibini belgilaydi). Sof
    Domain.Services/MatchOutcome (aniqlik darvozasi 50% → tez yozgan g'olib, aldash himoyasi) +
    7 yangi unit test (jami 82). ReportMatchResult o'chirildi.
    (3) TournamentHub to'liq qayta yozildi (TournamentLiveState singleton, in-memory):
    JoinTournament (tomoshabin+resume), StartTournament (host), StartRound (host: PrepareRound
    +matn+countdown), ReportProgress, FinishMatch (ikkalasi tugagach DecideMatch), ForceWinner
    (host no-show/uzilish uchun), Touch (register/seed broadcast), RoundComplete/TournamentFinished,
    5 daqiqalik raund taymeri (avtomatik progress bo'yicha hal). Host tekshiruvi hub'da
    Context.User orqali (mediator current-user hub'da null bo'lgani uchun register/seed REST'da).
    (4) Frontend: /Tournaments (Rooms uslubidagi hero + config'li yaratish + live ro'yxat),
    /Tournament — to'liq live sahifa: ro'yxat bosqichi (seed reorder strelkalari, Qatnashish/
    Boshlash), host boshqaruv paneli, /Practice typing engine (karet/scroll/ovoz/ko'r rejim/
    auto-repeat himoyasi), mening+raqib mushuk yo'lakchasi, live bracket (LIVE badge+progress
    bar+host force-winner), zamonaviy "Yutqazdingiz" oynasi (statistika bilan), "keyingi raundga
    o'tdingiz" toast, yakuniy Standings (medal+WPM bar+aniqlik), "Havolani nusxalash" tomoshabin
    havolasi. site.css turnir bloki, sw.js cache v26. Build OK, 82 test, REST (create/register/
    seed/host-guard) + to'liq LIVE oqim (StartTournament→StartRound→FinishMatch→bracket o'tish→
    bye-final→chempion+standings) .NET SignalR klient bilan uchma-uch tasdiqlandi.
  - [2026-06-17] /Contest qayta loyihalashtirildi — /Practice typing engine + natija linegraph:
    (1) Contest.cshtml butunlay yangilandi — hero (badge+sarlavha+sana+streak), 2 ustun
    (col-lg-8 o'yin + col-lg-4 sticky leaderboard top 20). O'yin maydoni /Practice bilan
    bir xil: live WPM/Aniqlik/Soniya paneli, mushuk yo'lakchasi, .tw-words typing maydoni,
    Qaytadan tugmasi va to'liq natija ekrani (hero WPM/aniqlik + canvas grafik + tooltip +
    legend + meta: raw/belgilar/barqarorlik/vaqt/o'rin). (2) contest.js to'liq qayta yozildi —
    typing-engine.js darajasidagi engine (normChar, karet uslublari, qator surilishi, joriy
    so'z, ovoz TWSound, ko'r rejim, xatoda to'xtash, auto-repeat himoyasi, aniqlik darvozasi
    50%), lekin matn KUNLIK MUSOBAQA matnidan (config yo'q — barcha bir xil matn yozadi).
    (3) Yozib bo'lgach LINEGRAPH: buildGraphData (soniyalik raw/net WPM+xato+aniqlik),
    drawChart (oltin WPM, kulrang raw, qizil xato nuqtalari, to'r, hover), onChartHover
    tooltip — Practice bilan bir xil. (4) Natijadan keyin /api/contests/submit, o'rin+streak+
    badge+g'olib xabari natija ekranida, leaderboard+streak refreshStatus bilan yangilanadi.
    site.css: #tw-contest-game.tw-show-result + .tw-contest-hero/.tw-board-card. sw.js cache v25.
    Build OK, 75 test o'tadi, /Contest 200 + barcha element + API matn tasdiqlandi.
  - [2026-06-17] /Teams butunlay /Rooms kabi qayta loyihalashtirildi (jamoaviy poyga):
    (1) /Teams sahifasi /Rooms dizayniga keltirildi — hero, "Musobaqa yaratish"
    kartasida Practice config (til/rejim/so'z soni/iqtibos uzunligi), "Jamoaga
    qo'shilish" kartasida kod + jamoa (A/B) tanlash (.tw-side-pick/.tw-side-btn),
    va jamoaviy qoidalar bo'limi. teams.js cfg holatini TWSettings'dan boshlaydi va
    POST /api/teamraces body'da yuboradi. (2) Matn endi /Practice dan — host tanlagan
    sozlamalar JSON Redis qiymatiga saqlanadi ("{id}|{hostId}|{settings}"),
    GetTeamRace Split('|',3) bilan o'qiydi, TeamRaceHub.BuildTextRequest (Rooms bilan
    bir xil) matn so'rovini quradi (avval hardcoded Sentences/Uzbek/25 edi).
    (3) Team.cshtml + team.js to'liq qayta yozildi — room.js darajasidagi typing
    engine (karet uslublari, qator surilishi, joriy so'z, ovoz, ko'r rejim, xatoda
    to'xtash, auto-repeat himoyasi, normChar), umumiy soat (countdown tugagach hamma
    uchun bir lahzada, bekor turish jazolanadi), live WPM/Aniqlik/Soniya paneli.
    (4) Natija: HAR JAMOA UCHUN ALOHIDA WPM grafigi (tw-chart-a / tw-chart-b) — har
    a'zo alohida rangda (barqaror ColorIndex, atomar tayinlash), hover tooltip har
    soniyada, rangli legend, jamoa bo'yicha natija kartalari (wpm/raw/aniqlik),
    verdikt (g'olib jamoa) + jamoa balli (WPM yig'indisi). (5) TeamRaceHub LobbyHub
    arxitekturasiga keltirildi: qayta-ulanish grace (RoomMemberReconnectGraceSeconds),
    host grace + chiqsa yopilish (TeamRaceClosed, Redis kod o'chadi, DB Finished),
    5 daqiqalik poyga taymeri, RawWpm + WpmSeries, FinishRace(wpm,raw,acc,series),
    Place (FinishOrder). TeamRaceLive/TeamPlayerLive kengaytirildi (Settings/Round/
    CTS/ColorLock/ColorIndex/RawWpm/WpmSeries/Place). TeamMembers persist dublikatdan
    himoyalandi. site.css: .tw-tr-charts/.tw-tr-chartbox/.tw-tr-team-*/.tw-team-verdict/
    .tw-side-btn. sw.js cache v24. Build OK, 75 test o'tadi, /Teams+/Team render +
    teamrace negotiate 200, GET 404 / POST unauth 401 tasdiqlandi.
  - [2026-06-17] /Room natija grafigi (barcha o'yinchilar, Practice line graph
    uslubida): oxirgi o'yinchi yozib bo'lgach (RaceFinished — barcha Finished
    bo'lgandagina chaqiriladi) natija oynasida soniyalik WPM chiziq grafigi
    chiqadi, har o'yinchi alohida rangda (CHART_COLORS palitra). Backend:
    RoomPlayerLive.WpmSeries (double[]), LobbyHub.FinishRace endi wpmSeries
    parametrini oladi (300s gacha cheklangan), View()+RaceFinished'ga qo'shildi,
    StartRace seriyani tozalaydi. Frontend (room.js): keyEvents tarixi
    (onKey'da {t,correct}), buildWpmSeries (Practice mantiqi), drawRoomChart
    (ko'p chiziq, to'r, Y/X belgilar, hover ko'rsatkich+nuqtalar),
    onRoomChartHover tooltip (har soniyada barcha o'yinchilar WPM si),
    renderChartLegend (rangli izoh), natija kartalariga rangli nuqta. Host'ga
    "Qaytadan boshlash" tugmasi (StartRace → hamma uchun yangi countdown),
    boshqalarga "Host kuting…" matni. Room.cshtml: tw-rr-chart canvas+tip+
    legend + tw-rr-actions. site.css: .tw-rr-chart/.tw-rr-legend/.tw-rr-dot/
    .tw-rr-actions. sw.js cache v18. Build OK, 75 test o'tadi.
  - [2026-06-17] Xona poyga sozlamalari + Practice typing + natija oynasi + 5daq taymer:
    (1) /Rooms "Xona yaratish" kartasiga Practice'dagi katta config div nusxalandi
    (til/rejim/so'z soni/iqtibos uzunligi — timed yo'q). Host tanlaydi, rooms.js
    cfg holatini TWSettings'dan boshlaydi va POST /api/rooms body'da yuboradi.
    RoomRaceSettings (Language/TextMode/WordCount/QuoteLength) DB Room.Settings'ga
    JSON saqlanadi; RoomDto.Settings; RoomsController.Create([FromBody]) serializatsiya.
    (2) Boshlangach typing maydoni Practice bilan bir xil: room.js to'liq qayta
    yozildi — render(wordsInner+caret), moveCaret (karet uslublari), updateScroll
    (qator surilishi), updateCurrentWord, normChar, blind/stopOnError, auto-repeat
    guard, TWSound, live WPM/Aniqlik/Soniya stats bar (Room.cshtml + sozlama
    ko'rinishi). LobbyHub.StartRace endi live.Settings'dan BuildTextRequest qiladi
    (avval hardcoded Sentences/Uzbek/25 edi). JoinRoom live.Settings=room.Settings.
    (3) Natija oynasi: barcha o'yinchilar bitta oynada karta ko'rinishida (o'rin
    medali + ism + WPM/raw/aniqlik). FinishRace(code,wpm,rawWpm,acc) — RawWpm
    qo'shildi (RoomPlayerLive+View). Room.cshtml #tw-room-cards, .tw-rr-* CSS.
    (4) 5 daqiqalik taymer: StartRace'da ScheduleRaceTimeout (fire-and-forget
    Task + CancellationTokenSource live.RaceTimeoutCts). Hamma tugatmasa →
    yangi DI scope'da Redis kod o'chadi + DB Status=Expired + "RoomClosed"
    ("Poyga 5 daqiqada tugamadi…") + state.Remove. Hamma tugatsa/host chiqsa
    taymer Cancel. GameConstants.RoomRaceTimeoutMinutes=5. room.js RoomClosed
    overlay → 6s'da /Rooms. sw.js cache v17. Build OK, 75 test o'tadi.
  - [2026-06-17] /Rooms qayta dizayn (zamonaviy) + host chiqsa kod o'chadi:
    Rooms.cshtml butunlay yangilandi — hero (badge+sarlavha), 2 ta zamonaviy
    karta (Xona yaratish / Kodga qo'shilish, Bootstrap Icons: plus-circle,
    rocket-takeoff, box-arrow-in-right, hash, arrow-right-circle), kod kiritish
    inputi stilize, va "Xona yaratish bo'yicha qoidalar" bo'limi (6 qoida,
    iconli grid). site.css'ga .tw-rooms-hero/.tw-rcard/.tw-rbtn/.tw-join-input/
    .tw-rules/.tw-room-closed (token-driven) qo'shildi; eski .tw-room-card
    o'chirildi. Host xonani tark etsa kod butunlay o'chadi: LobbyHub.
    RemoveConnection host'ni aniqlaydi → CloseRoomAsync (Redis room:{code} key
    o'chiriladi, DB Room.Status=Expired, "RoomClosed" yuboriladi, RoomLiveState.
    Remove). GetRoom Redis+DB'da topa olmaydi/Expired → null, qo'shilish to'xtaydi.
    room.js: "RoomClosed" → showRoomClosed overlay + 6s'da /Rooms ga qaytaradi.
    sw.js cache v16. Build OK, 75 test o'tadi.
  - [2026-06-16] Iqtibos uzunlik filtri: Iqtibos rejimida o'ng tomondagi
    "Tur/So'z/Vaqt" guruhlari yashiriladi, o'rniga "Uzunlik": barchasi/qisqa/
    o'rta/uzun/juda uzun (all/short/medium/long/thick). Chegaralar belgi soni
    bo'yicha — QuoteBank.ShortMax=130/MediumMax=280/LongMax=550 (>550=thick).
    Backend: PracticeTextRequest+GetPracticeTextQuery+Controller'ga quoteLength,
    TextProvider.ApplyQuoteLengthFilter (EF Content.Length). Frontend: settings
    DEFAULTS.quoteLength="all", Practice.cshtml quote guruhi, typing-engine.js
    isQuoteMode()/timedActive() (iqtibosda timed o'chiq, to'liq iqtibos yoziladi).
    QuoteBank kengaytirildi: qisqa/o'rta/uzun/juda uzun (600+) o'zbek+ingliz
    paragraflar — har bucket bo'sh qolmasin. DataSeeder additive seed qiladi.
    Build OK, 70 test, 8 bucket (2 til × 4) endpoint orqali tasdiqlandi.
  - [2026-06-16] Iqtibos rejimi: Practice'dagi "jumla" → "Iqtiboslar".
    RaceText'ga Source maydoni (migration AddRaceTextSource). QuoteBank.cs —
    ~60 manbali iqtibos (o'zbek klassiklari/maqollar + ingliz kitob/film/
    mashhurlar), bir marta DB'ga seed (resurs tejamkor, runtime API yo'q).
    DataSeeder additive/idempotent + eski manbasiz "gap"larni deaktivatsiya.
    PracticeTextDto'ga Source qo'shildi, natija ekranida "Manba: ..." ko'rsatiladi
    (typing-engine.js + .tw-r-source CSS). Build OK, 70 test, endpoint sinaldi.
Tuzatilgan xatolar:
  - [2026-06-17] /Room poyga VAQTGA qarab hisoblanadi (umumiy soat): avval
    har o'yinchining soati BIRINCHI tugma bosilganda boshlanardi (startIfNeeded
    → startTime null), shuning uchun kech boshlagan (masalan 1 daqiqa keyin)
    lekin tez yozgan o'yinchi bekor turgan vaqti hisobga olinmay yutib ketardi.
    Tuzatildi: room.js'da startIfNeeded olib tashlandi; soat (startTime +
    liveTimer) endi beginRace'da — countdown tugagach HAMMA uchun bir umumiy
    lahzada boshlanadi. Natijada elapsed/WPM/live taymer/wpmNow/keyEvents.t
    barchasi poyga boshidan o'lchanadi; bekor turish WPM'ni pasaytiradi va
    g'olib real vaqtda birinchi tugatgan (server FinishOrder) bo'ladi. Grafik
    ham vaqt bo'yicha tekislanadi (har soniya = poyga boshidan bir xil real
    soniya). Headless brauzerda tasdiqlandi: 3s yozmay turilganda taymer 3
    ko'rsatdi (eski kodda 0), C natija WPM=175 (umumiy soat) — faqat-typing
    bo'lsa 1667 bo'lardi. sw.js cache v19.
  - [2026-06-17] Aldash himoyasi (ko'r rejim / xatodan-to'xtash-o'chiq):
    foydalanuvchi xatoni ko'rmay yoki karetni to'xtatmay, (a) bitta tugmani bosib
    turib yoki (b) turli xil tasodifiy belgilarni tez bosib matn oxiriga "yetib"
    yutib ketardi. 3 qatlamli himoya: (1) auto-repeat e'tiborsiz — KeyboardEvent.
    repeat bo'lsa bitta bosish = bitta belgi (typing-engine.js + race.js);
    (2) stopOnError sozlamasi to'g'ri ulandi — yoqilsa xatoda karet to'xtaydi,
    ko'r rejimda doim yuradi; (3) aniqlik darvozasi 50%: past aniqlikdagi natija
    saqlanmaydi/poyga yutilmaydi — frontend (Practice + Race) + server. Server:
    GameConstants.MinValidAccuracy=50, TypingCalculator.IsPlausibleAccuracy,
    RecordResult handler rad etadi (RaceHub.FinishAiRace catch qiladi). Poyga
    g'olibi (race.js won) endi aniqlikka bog'liq — raqibdan tez "tugatgan" bo'lsa
    ham past aniqlikda g'alaba yo'q. 5 yangi test (jami 75). sw.js cache v15.
  - [2026-06-16] Sozlamalar: background, showLiveAcc, showLiveTimer,
    showStatsPanel, showCheetah UI'da bor edi-yu, UserSettings entity/DTO'da
    yo'q edi — kirgan foydalanuvchida serverga saqlanmasdi. 5 maydon entity +
    DTO + validatsiyaga qo'shildi, migration AddBackgroundAndPanelSettings
    (standartlar: nextjs/true), DB yangilandi. PUT→GET round-trip tasdiqlandi.
Hal qilinmagan muammolar:
  - PostgreSQL porti 5434:5432 (5433 ni meningvaqtim loyihasi band qilgan)
  - Redis DI ulanishi eager (Connect) — keyin lazy qilish
  - 1vs1 (ikki inson) matchmaking yo'q (RaceHub keyin kengaytiriladi)
  - Host chiqsa qayta tayinlash yo'q; RoomPlayers DB persist faqat host
  - SignalR client CDN dan (PWA bosqichida local ga)
  - Google OAuth UI tugmasi yo'q; SoundOnClick ovozi ulanmagan; Theme=Custom=Dark
  - Real-time oqimlar brauzerda qo'lda sinalishi kerak (negotiate+bo'laklar OK)
CI/CD (GitHub Actions):
  - [2026-06-18] CI/CD sozlandi (.github/workflows/): (1) ci.yml — har push/PR(master)da
    dotnet restore+build(Release)+test (97 test), NuGet kesh. (2) deploy.yml — CI master'da
    muvaffaqiyatli tugagach (workflow_run, conclusion==success) yoki qo'lda (workflow_dispatch)
    Hetzner serverga appleboy/ssh-action orqali ulanadi: cd /opt/typingwar && git fetch +
    reset --hard origin/master && docker compose -f docker-compose.prod.yml up -d --build +
    image prune. concurrency guard (bir vaqtda 1 deploy). KERAK: repo secrets DEPLOY_HOST,
    DEPLOY_USER, DEPLOY_PORT, DEPLOY_SSH_KEY (qo'llanma: deploy/CICD.md). Lokal CI tasdiqlandi
    (build+97 test OK).
DEPLOY (jonli):
  - [2026-06-18] PRODUCTION'ga deploy qilindi — Hetzner cx23 (89.167.74.156), Docker Compose.
    Fayllar: Dockerfile (multi-stage .NET 8), docker-compose.prod.yml (postgres+redis+app+nginx,
    secretlar .env dan), nginx/conf.d/default.conf (HTTP-first + SignalR WS proxy), nginx/ssl.conf
    (HTTPS shabloni), deploy/ (.env.example, init-ssl.sh Let's Encrypt, DEPLOY.md qo'llanma),
    certbot/ volume. Server: Ubuntu 24.04, deploy key bilan /opt/typingwar ga klon, .env
    (avtomatik generatsiya PW/JWT), `docker compose -f docker-compose.prod.yml up -d --build`.
    Migration startupda avtomatik. HOLAT: http://89.167.74.156 JONLI ishlayapti.
    Tuzatish: Program.cs Hangfire RecurringJob/BackgroundJob statik API toza konteyner startida
    JobStorage.Current yo'qligidan yiqilardi -> DI (IRecurringJobManager/IBackgroundJobClient) ga
    o'tkazildi; HTTPS redirect sozlanadigan (Hosting:UseHttpsRedirection, prod=false, nginx redirect).
    QOLDI: (1) DNS typingwar.uz -> 89.167.74.156, (2) bash deploy/init-ssl.sh (SSL), (3) Google OAuth
    (.env GOOGLE_CLIENT_ID/SECRET + redirect URI https://typingwar.uz/signin-google).
Oxirgi git commit: Deploy: ADMIN_EMAIL va Let's Encrypt emailini to'g'ri emailga o'zgartirish
```

> ⚠️ Har bosqich tugagach FAQAT shu "JORIY HOLAT" qismini yangilang.
> Tugallangan bosqichlarni belgilang, keyingi vazifani yozing, muammolarni qayd eting.

---

## 16. Ish jarayoni (har sessiyada)

1. CLAUDE.md va oxirgi `loglar/faza-N-hisobot.txt` ni o'qi
2. Joriy bosqich vazifalarini tartibda bajar
3. Har vazifadan keyin `dotnet build`
4. Bosqich tugagach: hisobot yoz + CLAUDE.md "JORIY HOLAT" yangila + git commit
5. Keyingi sessiyada `/clear` qilingach, faqat CLAUDE.md + hisobot yetarli kontekst beradi

> Hech qachon bir nechta bosqichni aralashtirma. Bitta sessiya = bitta bosqich.
