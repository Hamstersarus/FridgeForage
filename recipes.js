const BASE = 'https://www.themealdb.com/api/json/v1/1';

async function idsFor(param, value) {
  const response = await fetch(`${BASE}/filter.php?${param}=${encodeURIComponent(value)}`);
  const data = await response.json();
  return new Set((data.meals || []).map((m) => m.idMeal));
}

export async function findRecipes(ingredientNames, filters = {}) {
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

  let results = Object.values(counts)
    .sort((a, b) => b.matches - a.matches)
    .map((entry) => ({ ...entry.meal, matches: entry.matches }));

  if (filters.category) {
    const ids = await idsFor('c', filters.category);
    results = results.filter((r) => ids.has(r.idMeal));
  }
  if (filters.area) {
    const ids = await idsFor('a', filters.area);
    results = results.filter((r) => ids.has(r.idMeal));
  }
  if (filters.keyword && filters.keyword.trim() !== '') {
    const word = filters.keyword.trim().toLowerCase();
    results = results.filter((r) => r.strMeal.toLowerCase().includes(word));
  }
  return results;
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
    return { title: meal.strMeal, image: meal.strMealThumb, instructions: meal.strInstructions, ingredients };
}