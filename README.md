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
├── .env.local
├── .gitignore
├── data/menu.json
├── views/app.ejs
└── public/styles.css
```


## 5. Quick start

The instructions in this article assume the use of the Ubuntu Terminal. Install Node.js 18 or higher, open the terminal, and navigate to the project folder:

```bash
cd ~/comp3810sef_group5
node --version
npm install
npm start
```

Open `http://localhost:8099` in your browser and log in using Facebook authentication to access the Restaurant Management System.

Run the complete login, web CRUD and REST API test:

```bash
npm test
```

The successful result is:

```text
Smoke test passed: login, web CRUD, REST CRUD and filtering.
```

Before using Facebook or MongoDB mode, follow section 6 to create the local environment file. The demo command does not need Facebook or MongoDB credentials.

## 6. Environment configuration and private submission

`server.js` loads environment variables from `.env.local` through `dotenv`; the application reads the values from `process.env`. For this course submission, `.env.local` is intentionally included so the project can be run without manually creating another configuration file. `.env.example` is not used in this workflow.

> **Security warning:** `.env.local` contains the Facebook App Secret, MongoDB credentials and session secret. Submit it only through a private repository or private course package. Never commit it to a public repository, post screenshots containing it, or share it outside the project group. If it is exposed, rotate the Facebook and MongoDB credentials immediately.

| Item | Purpose | Included in private submission? |
| --- | --- | --- |
| `server.js` | Reads variables from `process.env` | Yes |
| `.env.local` | Runtime configuration and real credentials | Yes, private only |
| `.env.example` | Legacy template, no longer used for setup | No |
| Deployment environment settings | Separate configuration for a deployed service | Configure on the hosting platform |

```dotenv
DATA_MODE=mongo
AUTH_MODE=facebook
FACEBOOK_APP_ID=<value>
FACEBOOK_APP_SECRET=<value>
FACEBOOK_CALLBACK_URL=http://localhost:8099/auth/facebook/callback
SESSION_SECRET=<value>
MONGO_HOST=<value>
MONGO_USER=<value>
MONGO_PASSWORD=<value>
MONGO_DB=cha_chaan_teng
MONGO_OPTIONS=retryWrites=true&w=majority
```

The values above are placeholders for documentation only. Do not copy the README placeholders over the working `.env.local`. The application also accepts a complete connection string through `MONGODB_URI` instead of the separate `MONGO_*` fields. Environment variables are **not encryption**; anyone with access to the file or repository history may read the credentials.

`.gitignore` excludes other environment files but explicitly allows `.env.local` so that a normal `git add .` includes it:

```gitignore
.env
.env.*
!.env.local
```.

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
| RESTful CRUD API | `/api/menu` 下的 GET、POST、PUT、DELETE |


## 4. 專案檔案

```text
comp3810sef_group5/
├── server.js
├── package.json
├── README.md
├── .env.local
├── .gitignore
├── data/menu.json
├── views/app.ejs
└── public/styles.css
```


## 5. 快速開始

本文操作以 Ubuntu Terminal 為準。安裝 Node.js 18 或以上，開啟終端機並進入專案資料夾：

```bash
cd ~/comp3810sef_group5
node --version
npm install
npm start
```

瀏覽器打開 `http://localhost:8099`，選擇Facebook驗證方式登入,即可看到餐廳管理系統

執行完整登入、網頁 CRUD 及 REST API 測試：

```bash
npm test
```

成功時會顯示：

```text
Smoke test passed: login, web CRUD, REST CRUD and filtering.
```

使用 Facebook 或 MongoDB 模式前，請按第 6 節建立本機環境檔案。本機示範指令不需要 Facebook 或 MongoDB 憑證。

## 6. 環境設定與私人提交

`server.js` 會透過 `dotenv` 讀取 `.env.local`，再從 `process.env` 取得設定。本課程提交包會刻意包含 `.env.local`，讓專案毋須另外建立設定檔便可執行。`.env.example` 不再用於此流程。

> **安全警告：** `.env.local` 內有 Facebook App Secret、MongoDB 憑證及 session secret。只可透過私人 repo 或私人課程提交包提交；切勿上傳至公開 GitHub、貼出包含內容的截圖，或分享給組外人士。如曾泄漏，應立即輪替 Facebook 及 MongoDB 憑證。

| 項目 | 用途 | 私人提交包是否包含？ |
| --- | --- | --- |
| `server.js` | 從 `process.env` 讀取設定 | 是 |
| `.env.local` | 執行設定及真正憑證 | 是，只限私人 |
| `.env.example` | 舊有範本，已不再用於設定 | 否 |
| 部署平台環境設定 | 已部署服務的獨立設定 | 在平台上另行設定 |

```dotenv
DATA_MODE=mongo
AUTH_MODE=facebook
FACEBOOK_APP_ID=<value>
FACEBOOK_APP_SECRET=<value>
FACEBOOK_CALLBACK_URL=http://localhost:8099/auth/facebook/callback
SESSION_SECRET=<value>
MONGO_HOST=<value>
MONGO_USER=<value>
MONGO_PASSWORD=<value>
MONGO_DB=cha_chaan_teng
MONGO_OPTIONS=retryWrites=true&w=majority
```

以上只是文件用佔位值，不可用它們覆蓋現有的 `.env.local`。MongoDB 亦接受完整 `MONGODB_URI`，代替分開的 `MONGO_*` 欄位。環境變數**並非加密**；任何能讀取檔案或 Git 歷史的人都可以看到憑證。

`.gitignore` 會排除其他環境檔案，但明確允許 `.env.local`，所以正常執行 `git add .` 也會將它加入：

```gitignore
.env
.env.*
!.env.local
```

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
