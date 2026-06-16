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
Bosqich: 4 (Do'stlar musobaqasi) — TUGALLANDI ✅
Keyingi vazifa: Bosqich 5 — AI + Ghost
Tugallangan:
  - Bosqich 1 (Foundation): solution, 6 loyiha, Docker, 14 entity, EF Core,
    Identity, JWT HttpOnly cookie, Google OAuth (backend), Redis, migration
  - Bosqich 2 (Typing Engine): UserSettings (15 sozlama), TypingCalculator,
    4 rejim, WordBanks (uz/en/ru), DataSeeder, /Practice + /Settings
  - Bosqich 3 (Auth + Leaderboard): register/login/logout/me (JWT cookie),
    lockout (5/15daq), /Login + /Register; Redis leaderboard (top 50 +
    user rank), /Leaderboard (5 tab)
  - Bosqich 4 (Do'stlar musobaqasi): RoomCodeGenerator (8 belgi), Create/
    GetRoom (Redis kod 30daq TTL), RoomLiveState (in-memory), LobbyHub
    (/hubs/lobby: join/start/countdown/progress/finish), /Rooms + /Room
    (SignalR client, live progress, 3-2-1), 11 unit test, negotiate OK
Hal qilinmagan muammolar:
  - PostgreSQL porti 5434:5432 (5433 ni meningvaqtim loyihasi band qilgan)
  - Redis DI ulanishi eager (Connect) — keyin lazy qilish
  - RaceHub hali yo'q (Bosqich 5 — AI/Ghost/Blind Duel)
  - Host chiqsa qayta tayinlash yo'q; RoomPlayers DB persist faqat host
  - SignalR client CDN dan (PWA bosqichida local ga)
  - Google OAuth UI tugmasi yo'q; SoundOnClick ovozi ulanmagan; Theme=Custom=Dark
  - Real-time oqim brauzerda qo'lda sinalishi kerak (curl negotiate bilan OK)
Oxirgi git commit: Bosqich 4 — Do'stlar musobaqasi
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
