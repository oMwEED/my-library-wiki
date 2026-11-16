# Library Wiki — 函式庫語法與參數百科

一個可以上傳至 GitHub Pages 的繁體中文函式庫 Wiki 範例。

## 核心概念

- **使用者**：在網站搜尋函式名稱，閱讀語法、參數、回傳值與範例。
- **開發者**：在 Codex 對話中要求「新增 `numpy.reshape()`」。Codex 按 `AGENTS.md` 查閱官方文件，寫入 JSON、更新索引與驗證。
- **網站**：只是讀取 GitHub 裡的 JSON 資料；不會在瀏覽器內即時呼叫 AI，也**不需要任何 API Key 或伺服器**。

```
官方 API 文件
    ↓ Codex 查閱與整理
新增 data/xxx.json + 更新 data/index.json
    ↓ node scripts/validate.mjs
Git commit + push
    ↓ GitHub Pages 發布
Wiki 自動顯示新函式
```

## 本機瀏覽

因為 JavaScript 使用 `fetch`，請用本機 HTTP 伺服器，**不要雙擊** `index.html`：

```sh
# 在本專案資料夾執行
python -m http.server 8000
```

在瀏覽器開啟 `http://localhost:8000/`。若電腦無 Python，可以改用 VS Code Live Server 或其他靜態伺服器。

## 讓 Codex 新增函式（重點展示）

1. 在 Codex 開啟這個資料夾。
2. 貼上以下指令：

> 請先閱讀 AGENTS.md，再根據 NumPy 官方 API 文件，新增 `numpy.reshape()` 的繁體中文 Wiki 頁面。請建立符合模板的 JSON、更新 data/index.json，確認參數、預設值、回傳值和範例有官方依據，並執行 `node scripts/validate.mjs`。最後列出修改檔案、資料來源、版本與驗證情形。不要修改網站 HTML 排版。

3. Codex 須能存取網路或已提供官方文件；若無法查證，應回報缺少來源，而非編造參數。
4. 進網站搜尋 `reshape`，確認新增項目可開啟。

新增函式時只需新增函式 JSON 並更新 `data/index.json`。把文件的 `category` 與 `keywords` 同步寫入索引，關鍵字涵蓋參數名稱及常見用途。若是首次收錄某個函式庫，可在索引的 `libraries` 加入名稱與簡介，函式庫卡片與收錄數量會依索引自動產生。

`examples[0]` 是基本範例。用 `example_id` 對應具名範例，用 `related_ids` 引用已收錄的函式。精簡簽章填在 `syntax_short`，完整簽章填在 `syntax_full`，並保留舊版欄位 `syntax`。只有舊欄位的文件仍可呈現。

## 資料驗證

```sh
node scripts/validate.mjs
node --test scripts/validate.test.mjs
```

驗證程式需要 Node.js 20.11+，無需安裝 npm 套件。它會檢查索引、路徑、來源網址格式、新版語法欄位及範例與相關函式的對應。API 行為與輸出仍須核對官方文件並執行範例。

## 部署 GitHub Pages

1. 到 GitHub 建立新儲存庫（例如 `library-wiki`）。
2. 在本專案資料夾執行（將 `YOUR_USERNAME` 換成你的 GitHub 帳號）：

```sh
git init
git add .
git commit -m "Initial Library Wiki with AGENTS.md"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/library-wiki.git
git push -u origin main
```

3. 進入儲存庫 `Settings → Pages`。
4. 在 **Build and deployment** 選 **Deploy from a branch**，選 `main` 和 `/(root)`，按 Save。
5. 完成後網址通常是 `https://YOUR_USERNAME.github.io/library-wiki/`。

> 需要先驗證來源與測試網站；GitHub Pages 發布後，再新增一篇函式讓作業展示完整。

## 主要檔案

- `AGENTS.md`：AI 必須遵守的網站與內容規則。
- `data/index.json`：首頁搜尋與分類所需的索引。
- `data/python/.../*.json`：完整的函式內容。
- `templates/function.template.json`：新增 JSON 的格式參考。
- `scripts/validate.mjs`：JSON 結構驗證。

## 現有示範文件

已收錄 NumPy `mean()`、Pandas `read_csv()`、Matplotlib `pyplot.plot()` 三篇示範。2026-11-16 查閱官方文件，並以 NumPy 2.5.0、Pandas 3.1.1、Matplotlib 3.11.2 執行九組範例。NumPy 與 Pandas 的文字輸出符合文件，Matplotlib 以非互動後端產生圖形並核對座標與樣式。
