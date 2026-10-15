# 用 Docker Compose 部署 NoteBloom

適合 Linux VPS 或已經在用 Docker 的機器。Windows 直接安裝請看 [windows-deployment.md](windows-deployment.md)。

```
瀏覽器 → Cloudflare → cloudflared → frontend (nginx :80) ─┬─ /     → React 靜態檔
                                                          └─ /api/ → backend (:8080) → postgres
```

所有服務都設定 `restart: unless-stopped`，資料存在 volume `notebloom-postgres-data`。
`notebloom` schema 會在 volume 第一次初始化時由 `deploy/postgres/init-schema.sql` 建立。

## 步驟

1. 依 [windows-deployment.md](windows-deployment.md) 第 5 步建立 Tunnel，但環境選 **Docker**，只複製 `--token` 後面那串；公用主機名稱的服務填 `HTTP` / `frontend:80`。
2. 設定並啟動：
   ```bash
   cp .env.example .env
   # 編輯 .env：DOMAIN、DB_PASSWORD、CLOUDFLARE_TUNNEL_TOKEN
   docker compose -f docker-compose.prod.yml up -d --build
   ```
3. 依 [windows-deployment.md](windows-deployment.md) 第 6 步設定 Cloudflare Access。

## 常用指令

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
git pull && docker compose -f docker-compose.prod.yml up -d --build
```

## 備份

```bash
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U notebloom -n notebloom notebloom > backup.sql
docker compose -f docker-compose.prod.yml exec -T postgres psql -U notebloom notebloom < backup.sql
```
