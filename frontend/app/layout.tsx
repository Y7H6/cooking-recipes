// ルートレイアウト（Next.js App Router）
// 注: create-next-app 実行前の最小雛形。init 後に global.css 等の追加を検討する。
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Epicure × Jev × Qwen 味覚AI PoC",
  description:
    "味覚を数値で扱い、レシピ生成と味の評価・最適化を行う AI エンジンの PoC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
