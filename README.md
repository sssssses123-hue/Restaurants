# Cha Chaan Teng Menu Desk

## 1. Project information

A server-side Hong Kong cha chaan teng menu manager. Authenticated users can search, filter, create, read, update and delete menu items in three categories: **Dishes**, **Drinks** and **Bread**. The same data is exposed through a RESTful JSON API.


Facebook OAuth confirms a user's identity, but the application does not yet check whether that account is an approved manager, so any Facebook account that completes login can access the protected web pages. Manager allowlisting or role-based access control should be added before production use.

The REST API is intentionally public  and includes write and delete operations. It should not be exposed as a public production service without additional access control.

## 2. Group information

| Member | Student ID | Workload |
| --- | --- | --- |
| HAN Kongdongxu | 13786160 |              |
|   Chen Junyu   | 13779825 |              |
| Chan Tsz Ching | 13887258 |              |
| Keung Hoi Ching | 13882355 |             |
| So Chi Hin     |   13176891     |                |
| Cheung Chak Wai |  13884490     |                |
Group: 5

## 3. Required technologies and functions

| Requirement | Implementation |
| --- | --- |
| Express.js server-side application | `server.js` |
| MongoDB driver or Mongoose | Mongoose schema, repository and seed command |
| EJS or custom UI | One EJS template plus responsive CSS |
| Login/logout | Facebook OAuth through Passport |
| Session-protected CRUD web pages | Facebook OAuth login and create, read, update and delete routes |
| RESTful CRUD API | `GET`, `POST`, `PUT`, `DELETE` under `/api/menu` |


## 4. Project files

```text
comp3810sef_group5/
├── server.js
├── package.json
├── README.md
├── .env.example
├── .gitignore
├── data/menu.json
├── views/app.ejs
└── public/styles.css
```

`.env.local` is a private local configuration file and must not be submitted. The project therefore contains nine files including the local secret file, below the requested maximum of ten.

## 5. Quick start

Install Node.js 18 or later, then open PowerShell or Terminal in `comp3810sef_group5`:

```bash
npm install
npm run dev:demo
```

Open `http://localhost:8099` and select **Enter local test mode**. This temporary mode uses in-memory preview data and does not replace the Facebook-authenticated final mode.

Run the complete login, web CRUD and REST API test:

```bash
npm test
```

The successful result is:

```text
Smoke test passed: login, web CRUD, REST CRUD and filtering.
```

Before using Facebook or MongoDB mode, follow section 6 to create the local environment file. The demo command does not need Facebook or MongoDB credentials.

## 6. Environment and secret handling

`server.js` loads environment variables from `.env.local` through `dotenv`; the application reads the values from `process.env`. Real Facebook and MongoDB credentials must not be hard-coded in `server.js`, EJS templates, client-side files or the README.

The files have separate responsibilities:

| File or location | Purpose | Commit to Git? |
| --- | --- | --- |
| `server.js` | Reads variables from `process.env` and uses them | Yes |
| `.env.local` | Real values used on this computer | No |
| `.env.example` | Variable names and safe placeholders for teammates | Yes |
| Deployment environment settings | Real values used by the deployed service | No |

This separation keeps credentials out of source history, allows different credentials for development and production, and makes rotation possible without changing application code. It also prevents a real secret from being exposed when the repository or a screenshot is shared.

To create the local file, copy `.env.example` to `.env.local`, then replace every placeholder there. Never copy real values back into `.env.example`. The relevant variable names are:

```dotenv
FACEBOOK_APP_ID=<facebook-app-id>
FACEBOOK_APP_SECRET=<facebook-app-secret>
MONGODB_URI=<complete-mongodb-connection-uri>
SESSION_SECRET=<long-random-text-never-share-it>
```

The MongoDB connection can alternatively be supplied with `MONGO_HOST`, `MONGO_USER`, `MONGO_PASSWORD`, `MONGO_DB` and `MONGO_OPTIONS`. Environment variables only prevent values from being placed in source files; they are **not encryption**. A secret is still accessible to the server process and may be exposed through logs, error messages or rendered HTML. Never print secret values, and never send the Facebook App Secret or MongoDB credentials to the browser.

For a real deployment, configure these values in the hosting platform's secret or environment-variable settings rather than uploading `.env.local`. Use separate credentials for development and production, grant the database user only the permissions it needs, and rotate a credential immediately if it is exposed. Removing a committed secret from the latest file is not enough; rotate it and assess whether Git history must also be cleaned.

`.gitignore` excludes `.env` and `.env.*` while allowing the safe `.env.example` template:

```gitignore
.env
.env.*
!.env.example
```

`SESSION_SECRET` is mandatory when `NODE_ENV=production`; generate a long random value rather than using the development fallback.

## 7. Facebook login

1. Create a Facebook app and add Facebook Login.
2. Add `http://localhost:8099/auth/facebook/callback` as a valid OAuth redirect URI.
3. Fill the Facebook App ID and App Secret in `.env.local`.
4. Keep `AUTH_MODE=facebook`.
5. Start the normal server with `npm run dev`.

The Facebook App Secret must never appear in source code, screenshots, README content or submitted files.

## 8. Web operations

- **Create:** select “新增菜式”, complete the form and save.
- **Read:** search by Chinese name, English name, description or tag; filter by category and availability.
- **Update:** open an item and select “編輯”; save the changes.
- **Delete:** open an item, select “刪除菜式”, review the confirmation page and confirm.
- **Logout:** use the logout button in the page header.

All CRUD pages redirect to the login page when no authenticated session exists.

## 9. REST API

REST authentication is intentionally omitted because the course specification requires the API to be usable without authentication.

Because `POST`, `PUT` and `DELETE` are also public, this API is suitable for the course demonstration but not for unrestricted public deployment.

| Operation | Method | Path |
| --- | --- | --- |
| Read all/filter | GET | `/api/menu` |
| Read one | GET | `/api/menu/:id` |
| Create | POST | `/api/menu` |
| Update | PUT | `/api/menu/:id` |
| Delete | DELETE | `/api/menu/:id` |

Useful filters:

```text
/api/menu?category=drink
/api/menu?available=true
/api/menu?q=奶茶
```

Create example using `curl.exe` on Windows:

```powershell
curl.exe -X POST http://localhost:8099/api/menu `
  -H "Content-Type: application/json" `
  -d "{\"nameZh\":\"熱咖啡\",\"nameEn\":\"Hot Coffee\",\"category\":\"drink\",\"price\":22}"
```

Required fields are `nameZh`, `nameEn`, `category` and `price`. Valid categories are `dish`, `drink` and `bread`.

## 10. MongoDB import after approval

The MongoDB credentials are read from the environment variables documented in section 6. The cluster host has not been supplied, and the data mode remains `preview`.

After supplying and approving the cluster host:

```dotenv
MONGO_HOST=your-cluster-host-without-prefix
MONGO_DB=cha_chaan_teng
DATA_MODE=mongo
```

Then run the idempotent import:

```bash
npm run seed:menu -- --confirm
npm run dev
```

The seed command uses `slug` uniqueness and `$setOnInsert`, so it adds missing preview items without overwriting existing menu records.

## 11. Current limitations

- Facebook login authenticates an account but does not implement a manager allowlist or roles.
- MongoDB integration is implemented, but no cluster host has been approved and seeded yet.
- The REST API has no authentication by design for the course requirement.
- Group member names, student IDs and workload have not yet been added.
- In-memory changes made in demo or preview mode are lost when the server stops.

---

# 茶記菜單簿

## 1. 專案資料

這是一個香港茶餐廳菜單匯總管理系統。已登入的使用者可以搜尋、篩選、新增、查看、修改及刪除菜品、飲品和麵包；同一份資料亦會提供 RESTful JSON API。


Facebook OAuth 只確認使用者身份，尚未檢查帳戶是否為核准管理員；任何完成 Facebook 登入的帳戶目前都可以進入受保護網頁。正式使用前應加入管理員白名單或角色權限控制（RBAC）。

REST API 刻意不設登入，但包含新增、修改及刪除操作。若未加入其他存取控制，不應直接作為公開的正式服務。

## 2. 小組資料

| 組員 | Student ID | 分工 |
| --- | --- | --- |
| HAN Kongdongxu | 13786160 |       |
| Chen Junyu | 13779825 |        |
| Chan Tsz Ching | 13887258 |          |
| Keung Hoi Ching | 13882355 |         |
| So Chi Hin    |  13176891   |        |
| Cheung Chak Wai |  13884490     |        |

Group number: 5

## 3. 必要技術與功能

| 要求 | 實作 |
| --- | --- |
| Express.js server-side application | `server.js` |
| MongoDB driver 或 Mongoose | Mongoose schema、repository 及 seed 指令 |
| EJS 或自訂 UI | 單一 EJS 模板及響應式 CSS |
| Login／Logout | Passport Facebook OAuth |
| Session 保護 CRUD 網頁 | Facebook OAuth 登入及新增、查看、修改、刪除路由 |
| RESTful CRUD API | `/api/menu` 下的 GET、POST、PUT、DELETE 1|


## 4. 專案檔案

```text
comp3810sef_group5/
├── server.js
├── package.json
├── README.md
├── .env.example
├── .gitignore
├── data/menu.json
├── views/app.ejs
└── public/styles.css
```

`.env.local` 是本機秘密設定，不列入提交。連同本機秘密檔計算，專案共有 9 個檔案，符合 10 個以內的要求。

## 5. 快速開始

安裝 Node.js 18 或以上，然後在 `comp3810sef_group5` 開啟 PowerShell 或 Terminal：

```bash
npm install
npm run dev:demo
```

瀏覽器打開 `http://localhost:8099`，按「進入本機測試模式」。此模式使用記憶體資料，不會取代正式 Facebook 模式。

執行完整登入、網頁 CRUD 及 REST API 測試：

```bash
npm test
```

成功時會顯示：

```text
Smoke test passed: login, web CRUD, REST CRUD and filtering.
```

使用 Facebook 或 MongoDB 模式前，請按第 6 節建立本機環境檔案。本機示範指令不需要 Facebook 或 MongoDB 憑證。

## 6. 環境變數與秘密處理

`server.js` 會透過 `dotenv` 讀取 `.env.local`，再從 `process.env` 取得設定。真正的 Facebook 及 MongoDB 憑證不可直接寫死在 `server.js`、EJS 模板、前端檔案或 README 中。

各檔案及設定的分工如下：

| 檔案或位置 | 用途 | 提交至 Git？ |
| --- | --- | --- |
| `server.js` | 從 `process.env` 讀取及使用變數 | 是 |
| `.env.local` | 這部電腦實際使用的真正值 | 否 |
| `.env.example` | 供組員參考的變數名稱及安全佔位值 | 是 |
| 部署平台的環境設定 | 正式服務實際使用的真正值 | 否 |

這種分離可避免憑證進入原始碼歷史、允許開發和正式環境使用不同憑證、輪替憑證時毋須修改程式碼，亦減少分享 repo 或截圖時泄漏秘密的風險。

建立本機設定時，把 `.env.example` 複製為 `.env.local`，然後只在 `.env.local` 填入真正值。切勿把真正值抄回 `.env.example`。主要變數名稱如下：

```dotenv
FACEBOOK_APP_ID=<facebook-app-id>
FACEBOOK_APP_SECRET=<facebook-app-secret>
MONGODB_URI=<complete-mongodb-connection-uri>
SESSION_SECRET=<long-random-text-never-share-it>
```

MongoDB 亦可用 `MONGO_HOST`、`MONGO_USER`、`MONGO_PASSWORD`、`MONGO_DB` 及 `MONGO_OPTIONS` 分開設定。環境變數只是避免把值寫進原始碼，**並非加密**。秘密仍可被伺服器程序讀取，亦可能經日誌、錯誤訊息或渲染後的 HTML 泄漏。不可輸出秘密值，亦不可把 Facebook App Secret 或 MongoDB 憑證傳送到瀏覽器。

正式部署時，應在代管平台的 Secret／Environment Variables 設定中填入這些值，而不是上傳 `.env.local`。開發及正式環境應使用不同憑證；資料庫使用者只應獲得必要權限。若憑證曾泄漏，應立即輪替，而不只是從最新檔案移除；並評估是否需要清理 Git 歷史。

`.gitignore` 會排除 `.env` 和 `.env.*`，但保留安全的 `.env.example` 模板：

```gitignore
.env
.env.*
!.env.example
```

當 `NODE_ENV=production` 時必須提供 `SESSION_SECRET`；請產生長隨機值，不應使用開發用後備值。

## 7. Facebook 登入

1. 建立 Facebook App 並加入 Facebook Login。
2. 把 `http://localhost:8099/auth/facebook/callback` 加入有效 OAuth redirect URI。
3. 在 `.env.local` 填入 Facebook App ID 及 App Secret。
4. 保持 `AUTH_MODE=facebook`。
5. 使用 `npm run dev` 啟動正式模式。

App Secret 不可出現在程式碼、截圖、README 或提交檔案中。

## 8. 網頁操作

- **Create：** 按「新增菜式」，填表後儲存。
- **Read：** 以中文名、英文名、簡介或標籤搜尋，亦可按分類及供應狀態篩選。
- **Update：** 開啟菜式詳情，按「編輯」後儲存。
- **Delete：** 開啟詳情，按「刪除菜式」，在確認頁再確定。
- **Logout：** 使用頁頭的登出按鈕。

未登入時，所有 CRUD 網頁會自動跳回登入頁。

## 9. REST API

課程要求 REST API 不需要登入，因此 API 不設 session 驗證。

由於 `POST`、`PUT` 和 `DELETE` 同樣公開，此 API 適合課程示範，但不適合在毫無額外保護下公開部署。

| 功能 | Method | Path |
| --- | --- | --- |
| 讀取／篩選 | GET | `/api/menu` |
| 讀取一項 | GET | `/api/menu/:id` |
| 新增 | POST | `/api/menu` |
| 修改 | PUT | `/api/menu/:id` |
| 刪除 | DELETE | `/api/menu/:id` |

可用篩選：

```text
/api/menu?category=drink
/api/menu?available=true
/api/menu?q=奶茶
```

Windows PowerShell 新增例子：

```powershell
curl.exe -X POST http://localhost:8099/api/menu `
  -H "Content-Type: application/json" `
  -d "{\"nameZh\":\"熱咖啡\",\"nameEn\":\"Hot Coffee\",\"category\":\"drink\",\"price\":22}"
```

必填欄位是 `nameZh`、`nameEn`、`category` 及 `price`。分類只可以是 `dish`、`drink` 或 `bread`。

## 10. 確認後匯入 MongoDB

資料庫憑證由第 6 節所述的環境變數提供。目前尚未提供 cluster host，`DATA_MODE` 仍是 `preview`，所以不會寫入正式資料。

收到並確認 cluster host 後：

```dotenv
MONGO_HOST=你的cluster網址
MONGO_DB=cha_chaan_teng
DATA_MODE=mongo
```

執行只新增、不覆寫現有項目的匯入：

```bash
npm run seed:menu -- --confirm
npm run dev
```

匯入按 `slug` 去重並使用 `$setOnInsert`，不會重複新增，亦不會覆寫資料庫內已有的菜式。

## 11. 目前限制

- Facebook 登入只驗證帳戶，尚未加入管理員白名單或角色權限。
- MongoDB 整合已經實作，但尚未取得及核准 cluster host，亦未正式匯入資料。
- 按課程要求，REST API 目前不設登入。
- 小組組員姓名、Student ID 及分工尚未填寫。
- 本機示範或 `preview` 模式所作的修改只保存在記憶體，伺服器停止後便會消失。
