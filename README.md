# Library Wiki — 函式庫語法與參數百科

繁體中文函式庫 Wiki，整理常用 API 的語法、參數、回傳值與可執行範例。每篇文件標示適用版本與官方來源。

**[開啟線上 Library Wiki](https://omweed.github.io/my-library-wiki/)**

## 如何查詢

- 從首頁依 **程式語言 → 函式庫 → 功能分類** 瀏覽，或直接搜尋函式名稱、用途與參數，例如 `std::gcd`、`read_csv` 或 `axis`。
- 在函式頁展開參數，可查看詳細說明與對應範例。程式碼可複製，並附上預期輸出。

## 核心概念

- **開發者**：在 Codex 對話中要求「新增 `numpy.reshape()`」。Codex 按 `AGENTS.md` 查閱官方文件，寫入 JSON、更新索引與驗證。
- **網站**以 HTML、CSS、JavaScript 和 JSON 組成，由 GitHub Pages 提供靜態檔案。AI 查證與整理在開發環境中進行。

```
官方 API 文件
    ↓ Codex 查閱與整理
新增 data/xxx.json + 更新 data/index.json
    ↓ node scripts/validate.mjs
提交並推送到 main
    ↓ GitHub Pages 發布
Wiki 自動顯示新函式
```

## 本機瀏覽

首次下載專案時，可在終端機執行以下指令。已有專案時，進入專案資料夾後執行最後一行即可。

```sh
git clone https://github.com/oMwEED/my-library-wiki.git
cd my-library-wiki
python -m http.server 8000
```

在瀏覽器開啟 [本機網站](http://localhost:8000/)。網站透過 HTTP 載入 JSON，也可用 VS Code Live Server 啟動。要停止 Python 伺服器，在終端機按 `Ctrl+C`。

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

[此儲存庫](https://github.com/oMwEED/my-library-wiki) 的 GitHub Pages 已設為 **Deploy from a branch**，發布來源為 `main` 分支的 `/(root)`。本機驗證通過後，將修改提交並推送到 `main`，即可觸發新版發布。發布狀態可在 [GitHub Actions](https://github.com/oMwEED/my-library-wiki/actions) 查看。

## 主要檔案

- `AGENTS.md`：AI 必須遵守的網站與內容規則。
- `data/index.json`：首頁搜尋與分類所需的索引。
- `data/<language>/<library>/*.json`：各語言與函式庫的完整函式內容。
- `templates/function.template.json`：新增 JSON 的格式參考。
- `scripts/validate.mjs`：JSON 結構驗證。

## 目前收錄

| 語言 | 函式庫 | 函式 |
|---|---|---|
| Python | NumPy | `numpy.mean()` |
| Python | Pandas | `pandas.read_csv()` |
| Python | Matplotlib | `matplotlib.pyplot.plot()` |
| C | C 標準函式庫 | `puts()`、`fputs()` |
| C++ | C++ 標準函式庫 | `std::gcd()`、`std::lcm()` |
| Java | Java 標準函式庫 | `Collections.reverse()`、`Collections.swap()` |

Python 範例以 NumPy 2.5.0、Pandas 3.1.1 和 Matplotlib 3.11.2 驗證。C 與 C++ 範例使用 GCC 14.2.0，以 C23 和 C++23 模式編譯並執行。Java 函式文件依 Java SE 27 API 整理，範例以 JDK 21.0.4 執行。
