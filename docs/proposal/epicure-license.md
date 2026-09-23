結論から言うと、**Epicure のデータ（epicure_core / epicure_cooc / epicure_chem）はすべて CC BY 4.0 ライセンス（Creative Commons Attribution 4.0 International）で公開されています。**  
これは Hugging Face の公式リポジトリの LICENSE ファイルに明記されています。  [Hugging Face](https://huggingface.co/Kaikaku/epicure-cooc/blob/main/LICENSE)  [Hugging Face](https://huggingface.co/Kaikaku/epicure-core/tree/main)

以下に詳細をまとめます。

---

# ✅ **Epicure データのライセンス形態**

## **ライセンス：CC BY 4.0（Creative Commons Attribution 4.0 International）**
Hugging Face の Epicure リポジトリ（epicure-core / epicure-cooc / epicure-chem）には、  
**LICENSE ファイルに CC BY 4.0 と明記**されています。  [Hugging Face](https://huggingface.co/Kaikaku/epicure-cooc/blob/main/LICENSE)

### **CC BY 4.0 の特徴**
あなたは以下のことができます：

### ✔ **商用利用 OK**  
### ✔ **改変・再配布 OK**  
### ✔ **研究利用・製品利用 OK**  
### ✔ **AIモデルへの組み込み OK**

必要なのは **「適切なクレジット表記」だけ**です。

---

# 📌 **Epicure の著作権表記（引用例）**

Epicure の LICENSE には以下の著作権表記が含まれています：  [Hugging Face](https://huggingface.co/Kaikaku/epicure-cooc/blob/main/LICENSE)

```
Creative Commons Attribution 4.0 International (CC BY 4.0)

Copyright (c) 2026 Jakub Radzikowski and Josef Chen (KAIKAKU.AI)
```

### **引用例（あなたのプロジェクトで使う場合）**

```
Epicure ingredient embeddings © 2026 Jakub Radzikowski & Josef Chen (KAIKAKU.AI)
Licensed under CC BY 4.0.
Source: https://huggingface.co/Kaikaku/epicure-core
```

---

# 📌 **Epicure CSV / safetensors の取得元（一次ソース）**

### **1. Hugging Face（公式配布）**
- `Kaikaku/epicure-core`  
- `Kaikaku/epicure-cooc`  
- `Kaikaku/epicure-chem`  
（すべて CC BY 4.0）  [Hugging Face](https://huggingface.co/Kaikaku/epicure-cooc/blob/main/LICENSE)  [Hugging Face](https://huggingface.co/Kaikaku/epicure-core/tree/main)

### **2. arXiv 論文の Ancillary Files**
- `epicure_core.csv`  
- `epicure_cooc.csv`  
- `epicure_chem.csv`  
（論文付属データとして公開）

---

# 🔍 **ライセンスのポイント（あなたのPoCに関係する部分）**

### ✔ 商用利用可能  
→ PoC → MVP → 本番サービスまで問題なく利用できます。

### ✔ データの加工・再配布可能  
→ PostgreSQL に保存しても OK  
→ FastAPI で API として提供しても OK  
→ Qwen や Jev の入力として使っても OK

### ✔ 必要なのは「クレジット表記」だけ  
→ README や About ページに記載すれば十分。

---

# 🔥 **あなたのプロジェクトでのライセンス遵守方法（最適解）**

以下の 2 行を README に入れるだけで完全に準拠できます：

```
Epicure ingredient embeddings © 2026 Jakub Radzikowski & Josef Chen (KAIKAKU.AI)
Licensed under CC BY 4.0. https://creativecommons.org/licenses/by/4.0/
```

これで **法的に完全に安全**です。

---
