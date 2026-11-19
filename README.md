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


## 5. Facebook login


The private submission already includes the required settings in `.env.local`:

- `AUTH_MODE=facebook`
- Valid Facebook App ID and App Secret
- OAuth callback URL: `http://localhost:8099/auth/facebook/callback`

Start the application and select the Facebook login button. The current implementation confirms identity but does not yet apply a manager allowlist.

The Facebook App Secret must never appear in source code, screenshots or README content. It exists only inside the privately submitted `.env.local`.

## 6. Quick start and testing

All commands in this guide use an Ubuntu terminal. The quick start covers application startup, Facebook login, the website, web CRUD and the REST API.

| Test area | How it is checked |
| --- | --- |
| Login and website | Facebook login in the browser |
| Web CRUD | Create, search, edit and delete items using the website |
| REST API | `curl` requests to `/api/menu` |
| Automated test | `npm test` checks web CRUD and REST CRUD together |

### Step 1: Install and start

Install Node.js 18 or later, then run:

```bash
cd ~/comp3810sef_group5
node --version
npm install
npm start
```

The private submission already includes `.env.local`. The application should report MongoDB mode and then listen on `http://localhost:8099`. Keep this terminal running.

### Step 2: Log in and view the website

1. Open `http://localhost:8099`.
2. Select the Facebook login button.
3. Complete the Facebook login flow.
4. Confirm that the menu dashboard appears and the three categories are visible.

The website is protected by the Facebook session. Opening a protected page without logging in redirects to `/login`.

### Step 3: Test website CRUD

Use the website interface; these actions do not use `/api/menu`.

1. Select **新增菜式**.
2. Create a test item named `測試西多士` with category `bread` and price `30`.
3. Search for `測試西多士` and confirm that the item appears.
4. Open the item, select **編輯**, change the price to `32`, and save.
5. Open the item again, select **刪除菜式**, and confirm the deletion.

This verifies create, read, update and delete through the website.

### Step 4: Test the REST API

Open a second Ubuntu terminal while `npm start` is still running. The REST API uses JSON requests to `/api/menu`; it does not use the website forms.

Read the current records:

```bash
curl http://localhost:8099/api/menu
```

Create a temporary record:

```bash
curl -X POST http://localhost:8099/api/menu \
  -H "Content-Type: application/json" \
  -d '{"nameZh":"API測試咖啡","nameEn":"API Test Coffee","category":"drink","price":22}'
```

The response contains `data.id`. Copy that ID into the next command, then test read, update and delete:

```bash
ITEM_ID="paste-the-returned-id-here"

curl http://localhost:8099/api/menu/$ITEM_ID

curl -X PUT http://localhost:8099/api/menu/$ITEM_ID \
  -H "Content-Type: application/json" \
  -d '{"price":24,"available":true}'

curl -X DELETE http://localhost:8099/api/menu/$ITEM_ID
```

Successful create, read, update and delete operations return HTTP `201`, `200`, `200` and `200` respectively. A missing item returns `404`.

### Step 5: Run the automated test

The automated test checks the website CRUD routes and REST API together without changing MongoDB data:

```bash
npm test
```

The successful result is:

```text
Smoke test passed: login, web CRUD, REST CRUD and filtering.
```


## 7. Environment configuration and private submission

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
```

From the project directory, verify that Git does not ignore the file:

```bash
git check-ignore -v .env.local
```

No output means `.env.local` can be staged normally. `git check-ignore` exiting with status 1 also means it is not ignored. Stage it together with the private submission:

```bash
git add .env.local
git status
```

Only commit and push after confirming that the remote repository is private. For a public deployment, use the hosting platform's secret settings and a separately prepared environment instead. `SESSION_SECRET` is mandatory when `NODE_ENV=production`.

## 8. Web operations

The complete manual test is in section 6, step 3. Website forms use `/menu` and require a Facebook session; they do not use `/api/menu`.

| Browser operation | Route used by the web interface | Login required? |
| --- | --- | --- |
| Dashboard and search | `GET /` | Yes |
| Create form and submit | `GET /menu/new`, `POST /menu` | Yes |
| View an item | `GET /menu/:id` | Yes |
| Edit an item | `GET /menu/:id/edit`, `POST /menu/:id/edit` | Yes |
| Delete an item | `GET /menu/:id/delete`, `POST /menu/:id/delete` | Yes |

## 9. REST API

The executable `curl` test is in section 6, step 4. This is a JSON API for tools such as `curl`, not the website form interface. It is intentionally public for the course requirement, so it should not be exposed publicly without additional protection.

| Operation | Method | Path |
| --- | --- | --- |
| Read all/filter | GET | `/api/menu` |
| Read one | GET | `/api/menu/:id` |
| Create | POST | `/api/menu` |
| Update | PUT | `/api/menu/:id` |
| Delete | DELETE | `/api/menu/:id` |

Required create fields are `nameZh`, `nameEn`, `category` and `price`. Valid categories are `dish`, `drink` and `bread`. Filters can be added as query parameters, for example `/api/menu?category=drink` or `/api/menu?q=奶茶`.

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

## 10. Current MongoDB state

The MongoDB connection values are configured in `.env.local`, and `DATA_MODE` is set to `mongo`. The imported data has been verified against the database:

| Check | Verified result |
| --- | --- |
| Database | `cha_chaan_teng` |
| Collection | `menuitems` |

The seed command is idempotent:

```bash
npm run seed:menu -- --confirm
```
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

## 5. Facebook 登入


私人提交包已包含 `.env.local`，所需的 Facebook 設定包括：

- `AUTH_MODE=facebook`
- 有效的 Facebook App ID 及 App Secret
- OAuth callback URL：`http://localhost:8099/auth/facebook/callback`

啟動應用程式後按 Facebook 登入按鈕即可。現階段會驗證登入身份，但未加入管理員白名單。

App Secret 不可出現在程式碼、截圖或 README 中；它只存在於私人提交的 `.env.local`。

## 6. 快速開始與測試

本文所有指令均以 Ubuntu Terminal 為準。快速開始會依次測試啟動應用程式、Facebook 登入、網站、網頁 CRUD 及 REST API。

| 測試範圍 | 測試方式 |
| --- | --- |
| 登入及網站 | 在瀏覽器完成 Facebook 登入 |
| 網頁 CRUD | 在網站新增、搜尋、修改及刪除菜式 |
| REST API | 使用 `curl` 向 `/api/menu` 發出請求 |
| 自動測試 | `npm test` 同時檢查網頁 CRUD 及 REST CRUD |

### 第 1 步：安裝及啟動

安裝 Node.js 18 或以上，然後執行：

```bash
cd ~/comp3810sef_group5
node --version
npm install
npm start
```

私人提交包已包含 `.env.local`。啟動後應顯示 MongoDB 模式，並在 `http://localhost:8099` 提供網站。保持此 Terminal 運行。

### 第 2 步：登入並查看網站

1. 開啟 `http://localhost:8099`。
2. 按 Facebook 登入按鈕。
3. 完成 Facebook 登入流程。
4. 確認看到菜單總覽及三個分類。

網站受 Facebook session 保護；未登入時開啟受保護頁面會跳至 `/login`。

### 第 3 步：測試網頁 CRUD

直接在網站介面操作；這部分**不使用** `/api/menu`。

1. 按「新增菜式」。
2. 新增 `測試西多士`，分類選 `麵包`，價格填 `30`。
3. 搜尋 `測試西多士`，確認能顯示新增的菜式。
4. 開啟該菜式，按「編輯」，把價格改為 `32` 並儲存。
5. 再次開啟該菜式，按「刪除菜式」並確認刪除。

以上步驟已測試網頁的新增、讀取、修改及刪除。

### 第 4 步：測試 REST API

保持 `npm start` 運行，另開一個 Ubuntu Terminal。REST API 使用 JSON 向 `/api/menu` 發出請求，不使用網站表單。

先讀取現有資料：

```bash
curl http://localhost:8099/api/menu
```

新增一項臨時資料：

```bash
curl -X POST http://localhost:8099/api/menu \
  -H "Content-Type: application/json" \
  -d '{"nameZh":"API測試咖啡","nameEn":"API Test Coffee","category":"drink","price":22}'
```

回應內有 `data.id`。把該 ID 複製到下一段，再測試讀取、修改及刪除：

```bash
ITEM_ID="貼上新取得的id"

curl http://localhost:8099/api/menu/$ITEM_ID

curl -X PUT http://localhost:8099/api/menu/$ITEM_ID \
  -H "Content-Type: application/json" \
  -d '{"price":24,"available":true}'

curl -X DELETE http://localhost:8099/api/menu/$ITEM_ID
```

新增、讀取、修改及刪除成功時分別會回傳 HTTP `201`、`200`、`200` 及 `200`；找不到資料則回傳 `404`。

### 第 5 步：執行自動測試

以下指令會同時檢查網頁 CRUD 路由及 REST API，而且不會改動 MongoDB 資料：

```bash
npm test
```

成功時會顯示：

```text
Smoke test passed: login, web CRUD, REST CRUD and filtering.
```


## 7. 環境設定與私人提交

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

可在專案資料夾執行以下指令，確認 Git 沒有忽略此檔案：

```bash
git check-ignore -v .env.local
```

沒有輸出即表示 `.env.local` 可以正常加入 Git；`git check-ignore` 以狀態碼 1 結束亦代表它沒有被忽略。在私人提交中可正常執行：

```bash
git add .env.local
git status
```

確認遠端 repo 為私人後才可 commit 及 push。公開部署應改用在代管平台的 Secret 設定，並另行準備環境。當 `NODE_ENV=production` 時必須提供 `SESSION_SECRET`。

## 8. 網頁操作

完整操作步驟已放在第 6 節第 3 步。網頁表單使用 `/menu` 並需要 Facebook session，**不是**使用 `/api/menu`。

| 瀏覽器操作 | 網頁使用的路由 | 需要登入？ |
| --- | --- | --- |
| 總覽及搜尋 | `GET /` | 是 |
| 新增表單及提交 | `GET /menu/new`、`POST /menu` | 是 |
| 查看菜式 | `GET /menu/:id` | 是 |
| 修改菜式 | `GET /menu/:id/edit`、`POST /menu/:id/edit` | 是 |
| 刪除菜式 | `GET /menu/:id/delete`、`POST /menu/:id/delete` | 是 |

## 9. REST API

可執行的 `curl` 測試已放在第 6 節第 4 步。REST API 是供 `curl` 等工具使用的 JSON 介面，不是網站表單介面。按課程要求，此 API 不設登入，因此不應在毫無額外保護下公開部署。

| 功能 | Method | Path |
| --- | --- | --- |
| 讀取／篩選 | GET | `/api/menu` |
| 讀取一項 | GET | `/api/menu/:id` |
| 新增 | POST | `/api/menu` |
| 修改 | PUT | `/api/menu/:id` |
| 刪除 | DELETE | `/api/menu/:id` |

新增必填欄位是 `nameZh`、`nameEn`、`category` 及 `price`。分類只可以是 `dish`、`drink` 或 `bread`。亦可加入查詢參數，例如 `/api/menu?category=drink` 或 `/api/menu?q=奶茶`。


## 10. 目前 MongoDB 狀態

MongoDB 連線設定已放在 `.env.local`，`DATA_MODE` 已設為 `mongo`。現有資料已直接向資料庫核對：

| 核對項目 | 實際結果 |
| --- | --- |
| 資料庫 | `cha_chaan_teng` |
| Collection | `menuitems` |

匯入指令具備冪等性：
```bash
npm run seed:menu -- --confirm
```



