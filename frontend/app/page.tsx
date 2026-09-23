// トップページ（最小雛形）
// 3 機能（レシピ検索 / レシピ評価 / レシピ生成）へのリンクプレースホルダ。
// 各機能の実装（UC-01〜）に伴い実際のページへ置き換える。

const FEATURES = [
  {
    title: "レシピ検索",
    description: "ジャンル・キーワードで既存レシピを検索（UC-01）",
    href: "/recipes",
  },
  {
    title: "レシピ評価",
    description: "材料＋作り方から味スコアを算出（UC-03）",
    href: "/evaluate",
  },
  {
    title: "レシピ生成",
    description: "Qwen によるレシピ案の生成（UC-05）",
    href: "/generate",
  },
];

export default function HomePage() {
  return (
    <main>
      <h1>Epicure × Jev × Qwen 味覚AI PoC</h1>
      <p>
        味覚を数値で扱い、「レシピ生成」と「味の評価・最適化」を行う AI
        エンジンの PoC です。
      </p>
      <ul>
        {FEATURES.map((feature) => (
          <li key={feature.href}>
            <a href={feature.href}>{feature.title}</a>
            <span> — {feature.description}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
