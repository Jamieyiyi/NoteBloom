# 在 Windows 上正式跑起 NoteBloom（不含 domain）

目標：不再用 `gradlew bootRun` / `npm run dev` 開著終端機視窗跑，而是讓後端和前端都變成 Windows 服務，開機自動啟動、當掉自動重啟。domain/HTTPS 之後再處理，這份先讓 `http://localhost/` 能存取完整功能。

## 架構

```
瀏覽器 → http://localhost/ → Caddy (port 80)
                                ├─ /api/*  → reverse_proxy → 後端 Spring Boot (port 8080)
                                └─ 其他    → 前端靜態檔案 (frontend/dist)
```

Caddy 同時扮演「前端網頁伺服器」和「反向代理」，後端和前端因此變成同一個來源，不用管 CORS。

## 1. Build 正式版

```bash
cd C:\GitDownload\Jamie\NoteBloom\backend
.\gradlew.bat bootJar
```
會產生 `backend\build\libs\notebloom-backend-0.0.1-SNAPSHOT.jar`（實際檔名以 build 完印出來的為準）。

```bash
cd C:\GitDownload\Jamie\NoteBloom\frontend
npm run build
```
會產生 `frontend\dist\` 靜態檔案。`deploy\Caddyfile` 已經指向這個路徑，之後每次改完前端程式碼要重新上線都要重跑這行。

## 2. 裝 NSSM 和 Caddy

```bash
winget install -e --id NSSM.NSSM
winget install -e --id CaddyServer.Caddy
```
裝完開新的 PowerShell 視窗，確認：
```bash
nssm version
caddy version
```

## 3. 把後端註冊成 Windows 服務

```bash
nssm install NoteBloomBackend "C:\Program Files\Zulu\zulu-25\bin\java.exe" "-jar C:\GitDownload\Jamie\NoteBloom\backend\build\libs\notebloom-backend-0.0.1-SNAPSHOT.jar"
```
（如果你的 Zulu 25 裝在別的路徑，把 `java.exe` 那段換成實際路徑；`where java` 可以查目前用的是哪一個）

指令跑完會跳出 NSSM 的設定視窗，或直接用命令列後續調整：
```bash
nssm set NoteBloomBackend AppDirectory C:\GitDownload\Jamie\NoteBloom\backend
nssm set NoteBloomBackend Start SERVICE_AUTO_START
nssm start NoteBloomBackend
```
確認服務有起來：`Get-Service NoteBloomBackend`，或瀏覽器打開 `http://localhost:8080/api/notes` 看到 `[]`。

## 4. 把 Caddy 註冊成 Windows 服務

```bash
nssm install NoteBloomWeb "C:\Program Files\Caddy\caddy.exe" "run --config C:\GitDownload\Jamie\NoteBloom\deploy\Caddyfile"
```
（Caddy 實際安裝路徑用 `where caddy` 確認，winget 裝的路徑可能不同）

```bash
nssm set NoteBloomWeb Start SERVICE_AUTO_START
nssm start NoteBloomWeb
```

## 5. 驗證

瀏覽器打開 `http://localhost/`：
- 應該直接看到 NoteBloom 的介面（不是 5173 那個 dev port 了）
- 新增筆記、編輯、重新整理確認有存檔
- 匯出 Markdown / HTML 功能照樣測試一次

兩個服務都在跑之後，`gradlew bootRun` 和 `npm run dev` 就不需要了——但如果之後要繼續開發改程式碔，還是照舊用 dev 模式（`bootRun` + `npm run dev`，走 5173 那個 port），改完想上線再回來重複步驟 1 重新 build、重啟服務：
```bash
nssm restart NoteBloomBackend
nssm restart NoteBloomWeb
```

## 之後要接 domain + HTTPS 時

只要改 `deploy\Caddyfile`，把 `:80` 換成你的 domain（例如 `notebloom.yourdomain.com` 或搭配 path `/notebloom/`），Caddy 預設會自動跟 Let's Encrypt 申請憑證，其他 reverse_proxy 設定不用動。這部分等你想處理的時候我們再一起弄。
