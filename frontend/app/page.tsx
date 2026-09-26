// トップページ - レシピ選択メニュー
import './globals.css';
import { RecipeSelectionMenu } from '../components/RecipeSelectionMenu';
import type { SearchRecipeResult } from '../lib/types';

export default function HomePage() {
  const handleResults = (results: SearchRecipeResult[]) => {
    console.log('検索結果:', results);
  };

  return (
    <main className="home-page">
      <RecipeSelectionMenu onResults={handleResults} />
    </main>
  );
}
