const BASE = 'https://www.themealdb.com/api/json/v1/1';

export async function findRecipes(ingredientNames) {
  const counts = {};   // idMeal -> { meal, matches }

  for (const name of ingredientNames) {
    const query = name.trim().toLowerCase().replace(/ /g, '_');
    const response = await fetch(`${BASE}/filter.php?i=${query}`);
    const data = await response.json();
    if (!data.meals) continue;

    for (const meal of data.meals) {
      if (!counts[meal.idMeal]) {
        counts[meal.idMeal] = { meal, matches: 0 };
      }
      counts[meal.idMeal].matches += 1;
    }
  }

  return Object.values(counts)
    .sort((a, b) => b.matches - a.matches)
    .map((entry) => ({ ...entry.meal, matches: entry.matches }));
}

export async function getRecipe(id) {
  const response = await fetch(`${BASE}/lookup.php?i=${id}`);
  const data = await response.json();
  if(!data.meals) {
    return null;
  }

  const meal = data.meals[0];
  const ingredients = [];
  for (let i = 1; i<=20; i++) {
    const name = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (name && name.trim() !== '') {
      ingredients.push({ name: name.trim(), measure:(measure || '').trim() });
    }
  }
  return { title: meal.strMeal, instructions: meal.strInstructions, ingredients };
}