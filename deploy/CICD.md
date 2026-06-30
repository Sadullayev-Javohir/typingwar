# TypingWar.uz — CI/CD (GitHub Actions)

Ikki workflow `.github/workflows/` da:

| Workflow | Qachon | Nima qiladi |
|----------|--------|-------------|
| `ci.yml` (**CI**) | har push/PR (master) | `dotnet restore + build (Release) + test` (97 test) |
| `deploy.yml` (**Deploy**) | CI master'da muvaffaqiyatli tugagach (yoki qo'lda) | Hetzner serverga SSH → `git pull` + `docker compose up -d --build` |

Deploy faqat **CI yashil** bo'lsa ishlaydi (`workflow_run` + `conclusion == success`).
Migration'lar app startida avtomatik qo'llanadi; ma'lumotlar Docker volume'da saqlanadi.

---

## Kerakli GitHub Secrets (bir marta)

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Qiymat | Misol |
|--------|--------|-------|
| `DEPLOY_HOST` | server IP | `89.167.74.156` |
| `DEPLOY_USER` | SSH foydalanuvchi | `root` |
| `DEPLOY_PORT` | SSH port | `22` |
| `DEPLOY_SSH_KEY` | **maxfiy** SSH kalit (to'liq matn) | `-----BEGIN OPENSSH PRIVATE KEY----- ...` |

### Deploy uchun SSH kalit yaratish

Mahalliy kompyuterda (yoki serverda):

```bash
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/typingwar_deploy -N ""
```

1. **Ochiq** kalitni (`typingwar_deploy.pub`) serverga qo'shing:
   ```bash
   ssh-copy-id -i ~/.ssh/typingwar_deploy.pub root@89.167.74.156
   # yoki qo'lda: serverda ~/.ssh/authorized_keys ga .pub mazmunini qo'shing
   ```
2. **Maxfiy** kalit mazmunini (`cat ~/.ssh/typingwar_deploy`) `DEPLOY_SSH_KEY` secret'iga to'liq joylang
   (`BEGIN`/`END` qatorlari bilan).

Test:
```bash
ssh -i ~/.ssh/typingwar_deploy root@89.167.74.156 "cd /opt/typingwar && git status"
```

---

## Qo'lda deploy

Repo → **Actions → Deploy → Run workflow** (CI'ni kutmasdan).

## Eslatma

- Server `/opt/typingwar` da klon bo'lgan va `.env` to'ldirilgan bo'lishi shart (qarang `deploy/DEPLOY.md`).
- `git reset --hard origin/master` — serverdagi qo'lda o'zgartirishlarni o'chiradi; barcha o'zgarish git orqali qilinsin.
