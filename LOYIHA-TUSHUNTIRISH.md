# TypingWar.uz — Loyihani to'liq tushunish uchun qo'llanma

> Bu hujjat sen (loyiha egasi) dasturlashni bilmasang ham, **HR yoki texnik suhbatda** loyiha haqida
> ishonchli va aniq gapira olishing uchun yozilgan. Har bir bo'lim: **nima qilingan**, **nima uchun**,
> va **qanday ishlaydi** — oddiy tilda tushuntiriladi. Oxirida tez-tez so'raladigan savol-javoblar bor.

---

## 1. Loyiha nima o'zi — bir jumlada

**TypingWar.uz** — o'zbek tilidagi **typing tezligini o'lchash va musobaqa** platformasi.
Xalqaro `monkeytype.com` saytiga o'xshaydi, lekin qo'shimcha: **do'stlar bilan real vaqtda poyga**,
**AI raqib**, **5x5 jamoaviy musobaqa**, **turnir (bracket)**, **kunlik musobaqa**, **O'zbekiston
xaritasi bo'yicha statistika** kabi noyob funksiyalar bor.

- **Auditoriya:** o'zbek talabalari, dasturchilar, frilanserlar, typing ishqibozlari
- **Maqsad:** foydalanuvchi klaviaturada qanchalik tez va aniq yozishini o'lchaydi (WPM — Words Per
  Minute, ya'ni daqiqada nechta so'z), boshqalar bilan solishtirish imkonini beradi
- **Hozirgi holat:** loyihaning barcha 10 rejalashtirilgan bosqichi tugallangan va **jonli serverda
  ishlab turibdi** (Hetzner bulut serveri, IP orqali). Domen ulanishi (DNS) va SSL sertifikat
  o'rnatish bosqichlari qoldi.

---

## 2. Ishlab chiqish usuli — bu haqda qanday gapirish kerak

Loyiha **AI (Claude Code)** yordamida yozilgan — bu HR uchun **kamchilik emas, kuchli tomon**,
chunki:
- Zamonaviy dasturchilar ham AI vositalaridan (Copilot, Cursor, Claude Code) foydalanadi — bu **sanoat
  standarti**ga aylangan
- Muhim narsa — AI yozgan kodni **tushunish, boshqarish, talab qo'yish va sifatni nazorat qilish**
  qobiliyati. Sen har bosqichda **aniq texnik talablar** (CLAUDE.md fayl orqali: arxitektura, xavfsizlik
  qoidalari, jadval tuzilishi, formulalar) qo'yib, natijani nazorat qilgansan
- Loyihada **Clean Architecture**, **CQRS**, **avtomatik testlar (105 dona)**, **CI/CD**, **xavfsizlik
  qatlamlari** kabi professional standartlar qo'llanilgan — bu tasodifiy emas, aniq rejalashtirilgan

**Agar HR so'rasa:** *"Loyihani AI bilan yaratdim, lekin har bir bosqichni o'zim rejalashtirdim,
arxitektura va xavfsizlik talablarini o'zim belgiladim, natijani test qildim va boshqardim. Bu menga
zamonaviy AI-yordamida dasturlash (AI-assisted engineering) tajribasini berdi — bugungi sanoatda bu
tobora muhim ko'nikma."*

---

## 3. Texnologiyalar to'plami — nima uchun har biri tanlangan

### 3.1 Backend (server tomoni — "orqa oshxona")

| Texnologiya | Nima qiladi | Nima uchun tanlangan |
|---|---|---|
| **ASP.NET Core 8.0** | Microsoft'ning web-server frameworki (C# tilida) | Tez, xavfsiz, katta kompaniyalar (bank, davlat tizimlari) ishlatadi. Uzoq muddatli qo'llab-quvvatlanadi (LTS — Long Term Support) |
| **C# 12** | Dasturlash tili | ASP.NET Core bilan birga ishlaydi, kuchli tип tekshiruvi (xatolarni oldindan aniqlaydi) |
| **Clean Architecture + CQRS** | Kodni qatlamlarga bo'lish usuli | Kod tartibli, test qilinadigan, kelajakda o'zgartirish oson bo'ladi (pastda batafsil, 4-bo'lim) |
| **MediatR** | CQRS'ni amalga oshiruvchi kutubxona | Har bir amal (masalan "natijani saqlash") alohida, kichik, test qilinadigan blokka ajratiladi |
| **Entity Framework Core** | Ma'lumotlar bazasi bilan ishlash vositasi (ORM) | Xom SQL yozish o'rniga C# kodida ma'lumotlar bazasini boshqarish — xato ehtimoli kamayadi, SQL-in'ektsiya hujumidan himoyalaydi |
| **SignalR** | Real vaqtda (jonli) aloqa texnologiyasi | Do'stlar xonasi, poyga, turnirda **ekranni yangilamasdan** jonli ma'lumot almashish uchun (pastda 6-bo'lim) |
| **Hangfire** | Fon vazifalari rejalashtiruvchisi | Har kuni soat 20:00 da "Kunlik musobaqa"ni avtomatik boshlash kabi ishlar uchun |
| **FluentValidation** | Kiritilgan ma'lumotni tekshirish | Foydalanuvchi noto'g'ri/zararli ma'lumot yuborsa, serverga yetib bormasdan rad etiladi |
| **Mapster** | Ma'lumotlarni bir formatdan ikkinchisiga aylantirish | AutoMapper degan mashhur alternativa bor, lekin unda xavfsizlik zaifligi topilgan edi — shuning uchun Mapster tanlangan |
| **Serilog** | Loglash (voqealarni yozib borish) tizimi | Xato yoki hujum bo'lsa, keyinchalik "nima bo'lgani"ni tekshirish uchun |
| **Redis** | Tezkor xotira-baza (cache) | Reyting jadvali, xona kodlari kabi tez-tez o'qiladigan narsalarni asosiy bazadan 1000x tezroq qaytarish uchun |

### 3.2 Frontend (foydalanuvchi ko'radigan qism — "vitrina")

| Texnologiya | Nima qiladi | Nima uchun |
|---|---|---|
| **Razor Pages** | Server tomonda HTML tayyorlaydigan texnologiya | SEO (Google qidiruvida yuqori chiqish) uchun qulay, tez yuklanadi |
| **Bootstrap 5.3** | Tayyor dizayn qoliplari | Telefon/kompyuterda chiroyli va moslashuvchan ko'rinish uchun har doim qayta yozib o'tirmaslik |
| **Vanilla JavaScript** | "Sof" JavaScript, hech qanday frameworksiz | Typing dvigateli (typing engine) — foydalanuvchi bosgan har bir tugmani millisekund aniqligida o'lchash uchun eng tez va yengil yo'l |
| **SignalR JS Client** | Brauzerda jonli aloqani qabul qiluvchi qism | Server bilan "telefon liniyasi"ni ochib turadi |
| **Chart.js** | Grafik chizish kutubxonasi | Profildagi "o'sish grafigi", natija ekranidagi WPM chizig'i uchun |
| **Alpine.js** | Yengil interaktivlik | Katta React/Vue kabi og'ir framework kerak bo'lmagan joylarda tugma bosilganda UI o'zgarishi uchun |

### 3.3 Infratuzilma (server, joylashtirish)

| Texnologiya | Nima qiladi | Nima uchun |
|---|---|---|
| **PostgreSQL 16** | Asosiy ma'lumotlar bazasi | Barqaror, bepul, katta hajmdagi ma'lumot bilan ishonchli ishlaydi |
| **Redis 7** | Cache-baza (yuqorida) | Tezlik uchun |
| **Docker + Docker Compose** | Dasturni "konteyner"larga qadoqlash | Har qanday serverda bir xil ishlashini kafolatlaydi ("mening kompyuterimda ishlagandi" muammosi bo'lmaydi) |
| **Nginx** | Server oldidagi "qorovul" (reverse proxy) | Internet trafigini xavfsiz boshqaradi, SSL (https) ni ta'minlaydi, hujumlarni cheklaydi |
| **Let's Encrypt** | Bepul SSL sertifikat | Sayt manzili `https://` bilan boshlanishi, ma'lumot shifrlanishi uchun |
| **GitHub Actions** | Avtomatik build/test/deploy (CI/CD) | Kod har push qilinganda avtomatik tekshiriladi va serverga joylanadi — qo'lda ish kamayadi, xato kamroq |
| **Hetzner** (bulut server) | Dastur ishlaydigan jismoniy/virtual kompyuter | Arzon va ishonchli Yevropa bulut xizmati (CLAUDE.md'da dastlab DigitalOcean rejalashtirilgan edi, lekin amalda Hetzner ishlatilgan) |

### 3.4 Autentifikatsiya (kirish tizimi)

| Texnologiya | Nima qiladi | Nima uchun |
|---|---|---|
| **JWT (JSON Web Token)** | Foydalanuvchi "kim ekanini" tasdiqlovchi raqamli token | Har so'rovda parolni qayta yubormasdan, foydalanuvchini tanib olish uchun |
| **HttpOnly Cookie** | Tokenni brauzerda saqlash usuli | JavaScript orqali token o'g'irlanishining (XSS hujumi) oldini oladi |
| **Google OAuth 2.0** | "Google bilan kirish" tizimi | Foydalanuvchi alohida parol o'ylab topmasdan, mavjud Google akkaunti bilan kiradi — qulay va xavfsizroq |
| **BCrypt** | Parolni shifrlash algoritmi | (Eslatma: loyihada keyinchalik faqat Google orqali kirishga o'tilgan, lekin turnir paroli kabi joylarda BCrypt hali ham ishlatiladi) |

---

## 4. Arxitektura — kod qanday tashkil qilingan

Loyiha **4 qatlamli "Clean Architecture"** usulida qurilgan. Buni **restoran** bilan solishtirish mumkin:

```
TypingWar.Domain          →  "Retsept kitobi" — eng asosiy qoidalar (nima WPM, nima Room va h.k.)
       ↑ (hech kimga bog'liq emas, eng mustaqil qatlam)
TypingWar.Application     →  "Oshpaz" — biznes mantiq (masalan "natijani qanday hisoblash va saqlash")
       ↑ (faqat Domain'ga bog'liq)
TypingWar.Infrastructure  →  "Omborxona va ta'minotchilar" — ma'lumotlar bazasi, Redis, email, Google
       ↑ (Domain + Application'ga bog'liq)
TypingWar.Web             →  "Ofitsiant va vitrina" — mijoz ko'radigan sahifalar, tugmalar
       (hammasiga bog'liq — eng tashqi qatlam)
```

**Nima uchun bunday bo'lingan?**
- Har bir qism **mustaqil test qilinadi** (masalan WPM formulasini ma'lumotlar bazasisiz tekshirish mumkin)
- Agar ertaga PostgreSQL o'rniga boshqa baza kerak bo'lsa, faqat **Infrastructure** qatlami o'zgaradi,
  qolgan hammasi tegilmaydi
- Yangi dasturchi loyihaga qo'shilsa, qaysi kod qayerda joylashishini oson tushunadi

**CQRS (Command Query Responsibility Segregation)** — bu "har bir amal alohida" degani:
- **Command** — biror narsani **o'zgartiradigan** amal (masalan: "Natijani saqlash", "Xona yaratish")
- **Query** — faqat **o'qiydigan** amal (masalan: "Reyting jadvalini olish")
- Har biri **alohida, kichik fayl** — MediatR kutubxonasi ularni to'g'ri joyga "yo'naltiradi" (pochta
  bo'limi kabi)

---

## 5. Ma'lumotlar bazasi — nimalar saqlanadi

Loyihada **15 ta asosiy jadval (entity)** bor. Har biri — bitta "narsa turi"ni ifodalaydi:

| Jadval | Nima uchun | Oddiy tilda |
|---|---|---|
| `Users` (Identity orqali) | Foydalanuvchilar | Ism, email, ELO reyting (kuch darajasi), hudud, avatar |
| `RaceTexts` | Yozish uchun matnlar | So'zlar, jumlalar, iqtiboslar banki |
| `RaceResult` | Har bir yozish natijasi | WPM, aniqlik, qachon o'ynalgan |
| `PersonalBest` | Shaxsiy rekordlar | Har rejim (10s/30s/60s va h.k.) bo'yicha eng yaxshi natija |
| `Room` / `RoomPlayer` | Do'stlar xonasi | 8 xonali kod bilan xona, unda o'ynovchilar |
| `Tournament` / `TournamentMatch` / `TournamentPlayer` | Turnir tizimi | Bracket (o'yin daraxti), o'yinlar, ishtirokchilar |
| `TeamRace` / `TeamMember` | 5x5 jamoaviy musobaqa | Ikki jamoa, a'zolar, umumiy ball |
| `TypingFingerprint` | Yozish "pasporti" | Foydalanuvchining sekin harflari, odatlari (AI tahlili) |
| `DailyContest` / `DailyContestEntry` | Kunlik musobaqa | Har kuni yangi matn, streak (ketma-ket kunlar) |
| `RegionStats` | O'zbekiston xaritasi statistikasi | Har hudud bo'yicha o'rtacha tezlik |
| `Friendship` | Do'stlik tizimi | Kim kimga so'rov yuborgan/qabul qilgan |
| `UserSettings` | Foydalanuvchi sozlamalari | Tema, shrift, ovoz va h.k. (15 ta sozlama) |

**Enum'lar** (belgilangan qiymatlar ro'yxati) — masalan `RaceStatus` (Kutish/Sanoq/Davom
etmoqda/Tugagan), `TimeMode` (10/15/30/60/120 soniya), `Difficulty` (Oson/Normal/Qiyin/Ekspert).

---

## 6. Real vaqt tizimi (SignalR) — "jonli" nima degani

Oddiy sayt: foydalanuvchi tugma bosadi → sahifa qayta yuklanadi → javob keladi (sekin, "o'lik").

**SignalR** esa brauzer va server orasida **doimiy ochiq liniya** (WebSocket) yaratadi — xuddi telefon
qo'ng'irog'i kabi, ikkala tomon ham bir-biriga istalgan payt xabar yubora oladi, sahifa qayta
yuklanmaydi. Loyihada **5 ta shunday "liniya" (Hub)** bor:

| Hub | Vazifasi |
|---|---|
| `RaceHub` | 1vs1, Ghost (o'z rekordiga qarshi), AI raqib bilan poyga |
| `LobbyHub` | Do'stlar xonasi — kirish, kutish, "3-2-1" sanoq, poyga boshlanishi |
| `TeamRaceHub` | 5x5 jamoaviy musobaqa — real vaqtda ikkala jamoa tezligi |
| `TournamentHub` | Turnir — jonli natijalar, bracket yangilanishi, tomoshabinlar |
| `UzMapHub` | O'zbekiston xaritasi — hududlar statistikasi jonli yangilanishi |

**Misol:** Sen do'sting bilan xona ochib poyga qilsang, ikkalangiz ham yozayotganda bir-boringizning
tezligingizni **millisekund kechikish bilan jonli** ko'rasiz — bu SignalR orqali ishlaydi.

---

## 7. Asosiy xususiyatlar — foydalanuvchi nimalarni qila oladi

1. **Yakka mashq (Practice)** — so'z/jumla/iqtibos/kod rejimida yozish, WPM/aniqlik o'lchash
2. **Reyting jadvali (Leaderboard)** — 5 vaqt rejimi bo'yicha top 50, Redis orqali 0.1ms da qaytadi
3. **Do'stlar xonasi (Rooms)** — 8 xonali kod bilan xona ochib do'stlar bilan poyga
4. **AI raqib** — sun'iy raqib, sening so'nggi natijalaringga moslashib, sal tezroq yozadi (chinakam
   sun'iy intellekt emas — statistik formula asosida, lekin "aqlli moslashuvchi" his qildiradi)
5. **Ghost rejimi** — o'zingning eng yaxshi natijangga qarshi poyga
6. **Sabotaj** — 3+ o'yinchi bo'lsa, bir-biringizga "hiyla" yuborish (ekranni qoraytirish, harflarni
   aralashtirish, tebranish, oyna aks, sekinlashtirish)
7. **5x5 Jamoaviy musobaqa (Teams)** — 5 kishilik ikki jamoa, WPM lar qo'shilib, jamoa g'olib chiqadi
8. **Turnir (Tournaments)** — 16/32 kishilik bracket, jonli tomoshabin rejimi, shaxsiy (parolli) turnir
   imkoniyati
9. **Kunlik musobaqa (Daily Contest)** — har kuni soat 20:00 da yangi matn, ketma-ket qatnashish
   (streak) va nishonlar (badge)
10. **Typing Fingerprint** — qaysi harflarni sekin yozishingni tahlil qilib, "yozish pasporti" +
    klaviatura issiqlik xaritasini ko'rsatadi
11. **O'zbekiston xaritasi** — 14 hudud bo'yicha kim qayerdan tezroq yozayotganini ko'rsatadigan
    interaktiv SVG xarita
12. **Profil** — statistikalar, o'sish grafiklari (kunlik/haftalik/oylik/yillik), GitHub uslubidagi
    yillik faollik kalendari
13. **Ommaviy profil ulashish (/share/username)** — o'z natijalaringni boshqalarga havola orqali
    ko'rsatish
14. **Admin panel** — foydalanuvchilarni boshqarish, turnirlarni o'chirish, matn qo'shish (faqat
    Admin/SuperAdmin roli uchun)
15. **Offline rejim (PWA)** — internet bo'lmasa ham mashq qilish, internet qaytganda natija avtomatik
    yuboriladi

---

## 8. Xavfsizlik — nima qilingan va nima uchun

| Chora | Nima uchun kerak |
|---|---|
| **Rate limiting** (login: 15 daqiqada 5 urinish, umumiy so'rov cheklovi) | Bir kishi serverga million so'rov yuborib "cho'ktirmasligi" (DDoS) yoki parolni tахmin qilib topolmasligi uchun |
| **Xona kodi brute-force qulfi** (10 xato → IP 1 soatga bloklanadi) | 8 xonali kodni "hammasini urinib ko'rish" orqali topib olishning oldini olish |
| **WPM validatsiya** (>250 WPM rad etiladi) | Kimdir dasturiy bot bilan "aldab" yozganini oldini olish (inson jismonan 250 WPM dan tez yoza olmaydi) |
| **Aniqlik darvozasi** (50% dan past aniqlik hisobga olinmaydi) | Tasodifiy tugma bosib "tezlik"ni soxta oshirishning oldini olish |
| **XSS himoyasi** (Razor avtomatik escaping + CSP header) | Foydalanuvchi kiritgan matn orqali zararli JavaScript kodi ishga tushmasligi uchun |
| **CSRF himoyasi** (Antiforgery token) | Boshqa sayt nomidan sizning nomingizdan amal bajarilishining oldini olish |
| **SQL Injection himoyasi** (EF Core parametrli so'rovlar) | Ma'lumotlar bazasiga zararli SQL kod yuborib, ma'lumotni o'g'irlash/o'chirishning oldini olish |
| **JWT HttpOnly Cookie** | Login tokeni JavaScript orqali o'qib bo'lmaydigan joyda saqlanadi — o'g'irlash qiyinlashadi |
| **CSP (Content-Security-Policy)** | Brauzerga "faqat shu manbalardan skript ishga tushirish mumkin" deb ruxsat beradi |
| **Nginx darajasidagi rate limit + Slowloris himoyasi** | Server "eshigi"da hujumlarni filtrlab, asosiy dasturga yetib bormasligini ta'minlaydi |

---

## 9. Loyihaning hozirgi holati

- **10 bosqichning barchasi tugallangan** (Foundation → Typing Engine → Leaderboard → Do'stlar xonasi
  → AI/Ghost → Jamoaviy → Sabotaj → Kunlik/Turnir → Xarita/Fingerprint → Qo'shimcha)
- **105 ta avtomatik unit test** yozilgan va barchasi o'tadi (`dotnet test`)
- **CI/CD** sozlangan — GitHub Actions har push'da avtomatik build+test qiladi, muvaffaqiyatli bo'lsa
  serverga avtomatik joylaydi (deploy)
- **Jonli serverda ishlab turibdi** — Hetzner bulut serverida (`http://89.167.74.156`), Docker orqali
- **Qolgan ishlar:** domen (`typingwar.uz`) serverga ulanishi (DNS), SSL sertifikat o'rnatish, Google
  login uchun haqiqiy kalitlarni qo'shish

---

## 10. Halol tahlil — ma'lum kamchiliklar va e'tibor talab qiladigan joylar

Bu bo'lim — agar HR yoki texnik intervyuchi "loyihaning zaif tomonlari nima" deb so'rasa, halol va
tayyor javob berishing uchun:

1. **Integratsion testlar deyarli yo'q** — loyihada 105 ta **unit test** (kichik, alohida funksiyalarni
   tekshiruvchi) bor, lekin `IntegrationTests` loyihasi bo'sh (faqat skelet fayl). Ya'ni "butun tizim
   birgalikda to'g'ri ishlaydimi" (masalan, haqiqiy bazaga ulanib, real so'rov yuborib tekshirish)
   avtomatik tekshirilmagan — qo'lda (brauzer orqali) tekshirilgan.
2. **Hangfire "In-Memory" rejimda** — fon vazifalari (kunlik musobaqa scheduleri) ma'lumotlari serverning
   operativ xotirasida saqlanadi. Server qayta ishga tushsa (restart), rejalashtirilgan vazifalar holati
   yo'qoladi. Agar kelajakda serverni ko'paytirish (bir nechta nusxada ishlatish) kerak bo'lsa, buni
   PostgreSQL yoki Redis'ga asoslangan Hangfire storage'ga o'tkazish kerak bo'ladi.
3. **1 vs 1 (ikki real inson) tasodifiy raqib topish (matchmaking) yo'q** — hozircha faqat do'stlar xona
   kodi orqali yoki AI/Ghost bilan o'ynash mumkin. "Tasodifiy raqib top" tugmasi keyingi bosqichda
   qo'shilishi mumkin.
4. **Xona egasi (host) chiqib ketsa — qayta tayinlash yo'q**, xona shunchaki yopiladi. Kelajakda "host
   huquqini boshqa o'yinchiga o'tkazish" qo'shilishi mumkin.
5. **SignalR JS kutubxonasi hozircha tashqi CDN'dan yuklanadi** (o'zining serverida emas) — internet
   uzilsa yoki CDN ishlamay qolsa, real vaqt funksiyalari ishlamay qolishi mumkin. PWA bosqichida buni
   loyihaning o'z serveriga ko'chirish rejalashtirilgan edi.
6. **Google OAuth kalitlarini sozlash kerak** — `appsettings.json`da `ClientId`/`ClientSecret` bo'sh —
   production serverda bu maxfiy kalitlar muhit o'zgaruvchilari (environment variables) orqali
   qo'yilishi shart. Hozircha bu bosqich amalga oshirilmagan (deploy checklist'da qoldi).
7. **JWT maxfiy kaliti (`Jwt:Key`)** — `appsettings.json`dagi qiymat ochiq matnda `"CHANGE_ME_IN_PRODUCTION..."`
   — bu **faqat mahalliy dasturlash (development) uchun**. Jonli serverda bu albatta boshqa, tasodifiy
   va maxfiy qiymat bilan almashtirilgan bo'lishi kerak (muhim: agar bu qiymat asl holida production'da
   qolib ketsa, xavfsizlik zaifligi bo'ladi — buni tekshirib turish kerak).
   deploy/.env fayli orqali bu avtomatik generatsiya qilinishi CLAUDE.md'da qayd etilgan.
8. **Ovoz effekti (SoundOnClick) sozlamasi UI'da bor, lekin to'liq ulanmagan** deb qayd etilgan (eski
   yozuvlarda) — bu kichik, tugallanmagan detal.
9. **Bir nechta rivojlantirish jurnalida "brauzer orqali qo'lda tekshirilishi kerak" (⚠️) degan
   eslatmalar ko'p uchraydi** — chunki AI dasturlash muhitida Docker/PostgreSQL har doim ishga
   tushirilavermagan, shu sabab ba'zi funksiyalar avtomatik test bilan emas, faqat vizual/qo'lda
   tekshirilgan. Bu ishlab chiqarishga chiqarishdan oldin **yana bir bor real brauzerda, real
   ma'lumotlar bazasi bilan sinovdan o'tkazish tavsiya etiladi** degani.

> Bu ro'yxat loyihaning "yomon" ekanini emas — **haqiqiy, tirik loyihalarda har doim bo'ladigan, keyingi
> bosqichda hal qilinadigan tabiiy holatlar** ekanini bildiradi. Intervyuda buni shunday tushuntirish —
> ishonchni oshiradi ("men loyihamning kuchli va zaif tomonlarini bilaman" degan taassurot yaxshi).

---

## 11. Tez-tez so'raladigan savollar (FAQ) — tayyor javoblar

**S: Loyihani nima uchun ASP.NET Core'da qurdingiz, nega masalan Node.js yoki Django emas?**
J: ASP.NET Core — yuqori unumdorlik (performance), kuchli tип xavfsizligi va real vaqt funksiyalari
(SignalR) uchun tayyor, ishonchli infratuzilma beradi. Bank va yirik kompaniyalar tanlaydigan,
uzoq muddat qo'llab-quvvatlanadigan (LTS) texnologiya.

**S: Clean Architecture nima va nima uchun ishlatilgan?**
J: Kodni 4 mustaqil qatlamga bo'lish usuli (Domain/Application/Infrastructure/Web). Har qatlam faqat
o'zidan "ichkarida"gi qatlamga bog'liq bo'ladi. Bu kodni test qilishni osonlashtiradi, o'zgartirish
kiritganda boshqa qismlarni buzib qo'ymaslikka yordam beradi.

**S: Real vaqt (real-time) funksiyalar qanday ishlaydi?**
J: SignalR texnologiyasi orqali — brauzer va server orasida doimiy ochiq aloqa liniyasi (WebSocket)
ochiladi, shu orqali ikkala tomon istalgan payt ma'lumot yuboradi, sahifa qayta yuklanmaydi.

**S: Nega Redis ham, PostgreSQL ham ishlatilgan — ikkalasi kerakmi?**
J: PostgreSQL — doimiy, ishonchli saqlash uchun (foydalanuvchilar, natijalar tarixi). Redis — tez-tez
o'qiladigan, vaqtinchalik ma'lumotlar uchun (reyting jadvali, xona kodlari) — millisekundlarda javob
beradi, asosiy bazaga ortiqcha yuk tushirmaydi.

**S: Xavfsizlik uchun nima qilingan?**
J: Rate limiting (DDoS/brute-force himoya), SQL-injection himoyasi (EF Core), XSS himoyasi (CSP
header), CSRF himoyasi, parollar/tokenlar shifrlangan holda saqlanadi (HttpOnly cookie), WPM/aniqlik
validatsiyasi orqali "aldash"ning oldi olinadi.

**S: Testlar bormi?**
J: Ha, 105 ta avtomatik unit test — asosiy hisob-kitob mantiqini (WPM formulasi, turnir bracket
tuzilishi, xavfsizlik qulfi va h.k.) tekshiradi. Bundan tashqari CI/CD orqali har push'da avtomatik
ishga tushadi.

**S: Loyiha qayerda joylashtirilgan (deploy)?**
J: Docker konteynerlar orqali Hetzner bulut serverida ishlaydi; GitHub Actions orqali avtomatik deploy
qilinadi.

**S: Eng qiyin qism nima edi?**
J: Real vaqt sinxronizatsiyasi — masalan bir nechta o'yinchining poygasini bir vaqtda, adolatli
(umumiy soat asosida, har kim boshqa vaqt tugmani bossa ham) hisoblash, yoki turnir bracket'ini
haqiqiy ishtirokchilar soniga avtomatik moslashtirish kabi masalalar ancha murakkab mantiq talab qildi.

**S: AI raqib chindan sun'iy intellektmi?**
J: Yo'q, bu "haqiqiy AI" (masalan ChatGPT kabi) emas — bu **adaptiv algoritm**: foydalanuvchining
so'nggi natijalariga qarab formulaviy tarzda hisoblanadigan raqib tezligi. Lekin foydalanuvchiga
"aqlli moslashuvchi raqib" tajribasini beradi.

---

## 12. Kichik lug'at — texnik atamalar oddiy tilda

| Atama | Oddiy tushuntirish |
|---|---|
| **Backend** | Server tomonidagi kod — foydalanuvchi ko'rmaydigan, "orqa oshxona" |
| **Frontend** | Foydalanuvchi ko'radigan qism — sahifalar, tugmalar |
| **API** | Frontend va backend gaplashadigan "til"/yo'l |
| **Database (ma'lumotlar bazasi)** | Ma'lumotlar saqlanadigan joy (masalan foydalanuvchilar ro'yxati) |
| **ORM** | Ma'lumotlar bazasi bilan dasturlash tilida (SQL yozmasdan) ishlash vositasi |
| **Cache** | Tez-tez kerak bo'ladigan ma'lumotni tezkor xotirada saqlash (tezlik uchun) |
| **Token / JWT** | Foydalanuvchi "kim ekani"ni tasdiqlovchi raqamli guvohnoma |
| **Cookie** | Brauzerda saqlanadigan kichik ma'lumot bo'lagi (masalan login holatini eslab qolish) |
| **WebSocket** | Brauzer-server orasidagi doimiy ochiq aloqa liniyasi (real vaqt uchun) |
| **Migration** | Ma'lumotlar bazasi tuzilishidagi o'zgarishni bosqichma-bosqich qo'llash usuli |
| **CI/CD** | Kodni avtomatik tekshirish (test) va serverga joylash (deploy) jarayoni |
| **Docker** | Dasturni "konteyner"ga qadoqlab, istalgan serverda bir xil ishlatish texnologiyasi |
| **Repository/CQRS/Handler** | Kodni kichik, alohida vazifali bloklarga bo'lish usullari |
| **XSS / CSRF / SQL Injection** | Veb-saytlarga qarshi eng keng tarqalgan uchta hujum turi (yuqorida himoyalar tushuntirilgan) |

---

## 13. Xulosa — HR bilan suhbatda qanday taqdim etish kerak

Qisqa versiya (30 soniyalik javob):

> *"TypingWar.uz — o'zbek tilidagi typing tezligi platformasi. ASP.NET Core (C#), PostgreSQL, Redis va
> SignalR (real vaqt) texnologiyalari asosida, Clean Architecture va CQRS naqshi bilan qurilgan. 15+
> funksiya (do'stlar bilan poyga, AI raqib, turnir, jamoaviy musobaqa, O'zbekiston xaritasi statistikasi)
> ishlab chiqilgan, 105 avtomatik test bilan qamrab olingan, Docker orqali bulut serverda joylashtirilgan
> va CI/CD bilan avtomatlashtirilgan. Loyihani AI-yordamida (Claude Code) qurdim, lekin arxitektura,
> xavfsizlik talablari va sifat nazoratini o'zim boshqardim — bu menga zamonaviy AI-assisted software
> engineering tajribasini berdi."*
