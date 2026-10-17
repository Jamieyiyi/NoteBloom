# 在 Windows 上正式跑起 NoteBloom（funtoo.cc）

目標：PostgreSQL、NoteBloom、cloudflared 三個都變成開機自動啟動，透過 https://funtoo.cc 從外面連進來。
不需要 Docker、Tomcat、Caddy、NSSM，也不用在路由器開 port，HTTPS 由 Cloudflare 處理。

## 架構

```
瀏覽器 → https://funtoo.cc → Cloudflare（Access 驗證 email，選用）
                                → cloudflared（Windows 服務）
                                    → NoteBloom jar（內嵌 Tomcat :8080，同時提供前端畫面與 /api）
                                        → PostgreSQL（Windows 服務 :5432，database notebloom / schema notebloom）
```

前端 build 結果會被包進 jar，所以前後端是同一個來源，不用管 CORS。

## 1. 安裝軟體

| 軟體 | 注意 |
|---|---|
| JDK 25（Zulu 或 Temurin） | 安裝時勾選加入 PATH / 設定 JAVA_HOME |
| Node.js LTS | 預設選項即可（build 前端用） |
| PostgreSQL | 記下 `postgres` 超級使用者密碼；port 保持 5432；Stack Builder 直接 Cancel |

開新的 PowerShell 確認：`java -version`（要是 25）、`node -v`。

## 2. 建立資料庫與 schema

打開 pgAdmin → `Servers` → `PostgreSQL` → 對它按右鍵 → **Query Tool**，**一行一行分開執行**（密碼自己換）：

```sql
CREATE USER notebloom WITH PASSWORD '換成一組長的密碼';
```
```sql
CREATE DATABASE notebloom OWNER notebloom;
```

接著在左側 `Databases` 按右鍵 → Refresh → 對 **notebloom** 這個資料庫按右鍵 → **Query Tool**（注意是在 notebloom 資料庫底下開），執行：

```sql
CREATE SCHEMA notebloom AUTHORIZATION notebloom;
```

程式用 `currentSchema=notebloom` 連線，資料表會由 Liquibase 在第一次啟動時自動建在這個 schema 裡。schema 本身不會自動建立，所以這一步不能省。

## 3. Build

```powershell
cd <專案資料夾>\backend        # 例如 C:\Users\fangy\IdeaProjects\NoteBloom\backend
.\gradlew.bat bootJar
```

會自動執行 `npm ci`、`npm run build`，再把前端一起打包進 `backend\build\libs\notebloom-backend-0.0.1-SNAPSHOT.jar`。

## 4. 安裝成開機自動啟動

用「**以系統管理員身分執行**」開 PowerShell：

```powershell
cd <專案資料夾>
powershell -ExecutionPolicy Bypass -File deploy\windows\install.ps1
```

- 第一次執行會建立 `C:\notebloom\application.properties` 後停下來。用 `notepad C:\notebloom\application.properties` 打開，把 `spring.datasource.password=` 改成第 2 步的密碼，並把 `notebloom.bootstrap.*` 三行取消註解、填上管理者帳號（見下方「啟用管理者帳號」），存檔後**再執行一次**同一行指令。
- 第二次執行會把 jar 複製到 `C:\notebloom\notebloom.jar`，並建立名為 **NoteBloom** 的「工作排程器」工作：開機啟動（不用登入）、異常結束每分鐘重試。

約 15 秒後打開 http://localhost:8080 確認。

- 管理：工作排程器 → 工作排程器程式庫 → NoteBloom（啟動 / 結束 / 停用）
- Log：`C:\notebloom\logs\notebloom.log`（打不開時看 `Get-Content C:\notebloom\logs\notebloom.log -Tail 30`）
- 更新版本：`git pull` → 重做第 3、4 步

### 啟用管理者帳號

NoteBloom 只有管理者能建立帳號（沒有自行註冊）。第一次升級到有帳號功能的版本時，Liquibase 會建立一個還沒有密碼的管理者，並把**既有的筆記和分類全部歸給它**。

1. 在 `C:\notebloom\application.properties` 加上（或取消註解）：
   ```properties
   notebloom.bootstrap.admin-username=你的登入帳號
   notebloom.bootstrap.admin-display-name=顯示名稱
   notebloom.bootstrap.admin-password=至少 8 個字元的密碼
   ```
2. 重新啟動 NoteBloom（工作排程器 → NoteBloom → 結束 → 執行），Log 會出現 `Administrator account '...' activated`。
3. 打開網站用這組帳密登入，確認看得到原本的筆記。
4. **把這三行從設定檔刪掉**再重啟一次。密碼已存進資料庫，之後在網站左下角「修改密碼」更改即可。

其他人的帳號：登入後點左下角「帳號管理」→ 新增帳號，把產生的初始密碼交給對方，對方登入後可自行修改。每個帳號只看得到自己的筆記與分類。

## 5. Cloudflare Tunnel

前提：`funtoo.cc` 的名稱伺服器已改到 Cloudflare，狀態為 Active。

1. Zero Trust → 網路功能 → Tunnels → **建立通道** → Cloudflared → 名稱 `notebloom`。
2. 環境選 **Windows 64-bit**，依畫面下載安裝 cloudflared，用系統管理員身分執行畫面上的 `cloudflared.exe service install <token>`（註冊成 Windows 服務），等狀態變成已連線。
3. 公用主機名稱：子網域留空、網域 `funtoo.cc`、路徑留空、服務類型 **HTTP**、URL **localhost:8080**。
4. 若出現「DNS 記錄已存在」：Cloudflare → funtoo.cc → DNS → 記錄，刪掉從 GoDaddy 搬過來的 `@` A 記錄與 `www` CNAME，再存一次。

## 6. Cloudflare Access（選用）

NoteBloom 已經有自己的帳號密碼登入，Access 不再是必要的。保留它等於多一道門：每個人要先通過 Access，再登入 NoteBloom。
只有自己和少數人使用、想多一層保護時可以保留；要開放給更多人使用時，可到 Zero Trust → Access 控制 → 應用程式，刪除 `funtoo.cc` 這個應用程式。

設定方式：Zero Trust → Access 控制 → 應用程式 → 新增 → 自我託管。

- 公開主機名稱：網域 `funtoo.cc`（子網域、路徑留空）
- Access 原則：動作「允許」，包含 →「電子郵件」→ 自己的 email
- 認證：保持「接受所有可用的識別提供者」（含 One-time PIN）；「其他設定」裡的「允許無用戶端存取」**不要勾**，否則會報 `use_clientless_isolation_app_launcher_url` 錯誤

## 7. 讓電腦不睡眠

設定 → 系統 → 電源 → 接上電源時進入睡眠：**永不**。

## 8. LINE 登入（選用）

帳號一樣只有管理者能建立；LINE 只是多一種登入方式。每個人先用帳號密碼登入，到左下角「**綁定 LINE**」，之後就能在登入頁按「**使用 LINE 登入**」。沒綁定過的 LINE 會被擋下來。

### 建立 LINE Login channel

1. 用自己的 LINE 帳號登入 [LINE Developers Console](https://developers.line.biz/console/)。
2. **Create a new provider**（名稱例如 `NoteBloom`）→ **Create a LINE Login channel**：
   - Region：台灣；App types：勾 **Web app**；其他必填欄位照實填寫。
3. **Basic settings** 分頁：記下 **Channel ID** 和 **Channel secret**。
4. **LINE Login** 分頁 → **Callback URL**，每行一個：
   ```
   https://funtoo.cc/api/auth/line/callback
   http://localhost:8080/api/auth/line/callback
   ```
5. channel 狀態是 **Developing** 時只有 channel 的管理者／測試者能登入；要給其他人用，到頁面上方把狀態改成 **Published**。

### 設定 NoteBloom

在 `C:\notebloom\application.properties` 加上（直接從 LINE Developers 複製，只會有英數字）：

```properties
notebloom.line.channel-id=你的 Channel ID
notebloom.line.channel-secret=你的 Channel secret
```

重新啟動 NoteBloom（工作排程器 → NoteBloom → 結束 → 執行）後，登入頁就會出現綠色的「使用 LINE 登入」。

- 請用 Callback URL 裡登記過的網址開網站：從 `https://funtoo.cc` 開始的登入要回到 `https://funtoo.cc`，從 `localhost` 開始就回到 `localhost`，混用會顯示「LINE 登入已逾時」。
- NoteBloom 只向 LINE 要求 `profile` 權限，用來取得 LINE 使用者 ID；不會拿到 email 或傳訊息。

## 備份

```powershell
# 18 換成實際安裝的 PostgreSQL 版本
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U notebloom -h localhost -n notebloom -f backup.sql notebloom
# 還原
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U notebloom -h localhost -f backup.sql notebloom
```

## 開發模式

照舊用 `.\gradlew.bat bootRun` + `npm run dev`（http://localhost:5173）。
預設連 `localhost:5433`（`docker compose up -d` 起的開發用 PostgreSQL）；要改連本機安裝的 PostgreSQL：

```powershell
$env:DB_URL = 'jdbc:postgresql://localhost:5432/notebloom?currentSchema=notebloom'
$env:DB_PASSWORD = '你的密碼'
.\gradlew.bat bootRun
```
