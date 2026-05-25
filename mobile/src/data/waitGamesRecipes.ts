// Iraqi recipes used by the "Recipe of the Day" wait-game.
// Ingredients + steps stay in English (descriptive food vocab) — only
// names + region are localized via i18n keys.

export type RecipeNameKey =
  | 'games.recipe.quzi.name'
  | 'games.recipe.masgouf.name'
  | 'games.recipe.dolma.name'
  | 'games.recipe.kubba.name'
  | 'games.recipe.lentil.name'

export type RecipeRegionKey =
  | 'games.recipe.quzi.region'
  | 'games.recipe.masgouf.region'
  | 'games.recipe.dolma.region'
  | 'games.recipe.kubba.region'
  | 'games.recipe.lentil.region'

export interface WaitGameRecipe {
  id: string
  nameKey: RecipeNameKey
  regionKey: RecipeRegionKey
  prepMinutes: number
  image: string
  ingredients: string[]
  steps: string[]
}

export const RECIPES: WaitGameRecipe[] = [
  {
    id: 'quzi',
    nameKey: 'games.recipe.quzi.name',
    regionKey: 'games.recipe.quzi.region',
    prepMinutes: 120,
    image: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800',
    ingredients: [
      '1 whole lamb shoulder',
      '2 cups basmati rice',
      'Almonds, raisins, pine nuts',
      'Baharat spice mix',
      'Saffron threads',
    ],
    steps: [
      'Slow-cook the lamb with onion + baharat until tender.',
      'Cook basmati rice in the lamb stock.',
      'Toast almonds, pine nuts and raisins in ghee.',
      'Plate rice, lay lamb on top, scatter toasted nuts.',
    ],
  },
  {
    id: 'masgouf',
    nameKey: 'games.recipe.masgouf.name',
    regionKey: 'games.recipe.masgouf.region',
    prepMinutes: 90,
    image: 'https://images.unsplash.com/photo-1535140728325-a4d3707eee94?w=800',
    ingredients: [
      '1 large carp, butterflied',
      'Olive oil + tamarind paste',
      'Salt, turmeric, paprika',
      'Sliced tomatoes + onions',
    ],
    steps: [
      'Marinate the butterflied carp with oil, salt, turmeric.',
      'Grill skin-side down over wood embers until smoky.',
      'Finish over the coals with tomato + onion slices.',
      'Serve with flatbread and lemon wedges.',
    ],
  },
  {
    id: 'dolma',
    nameKey: 'games.recipe.dolma.name',
    regionKey: 'games.recipe.dolma.region',
    prepMinutes: 75,
    image: 'https://images.unsplash.com/photo-1543339531-d6c9c6ad19a3?w=800',
    ingredients: [
      'Vine leaves, cabbage leaves',
      'Eggplants, peppers, zucchini',
      'Rice + minced lamb stuffing',
      'Pomegranate molasses, lemon',
    ],
    steps: [
      'Mix rice, lamb mince, herbs, tomato paste.',
      'Stuff vegetables and roll vine + cabbage leaves.',
      'Layer in a pot, cover with lemon + pomegranate broth.',
      'Simmer gently for 45 minutes, then invert to serve.',
    ],
  },
  {
    id: 'kubba',
    nameKey: 'games.recipe.kubba.name',
    regionKey: 'games.recipe.kubba.region',
    prepMinutes: 60,
    image: 'https://images.unsplash.com/photo-1626804475297-41608ea09aeb?w=800',
    ingredients: [
      'Bulgur + minced lamb shell',
      'Onion + lamb mince filling',
      'Tomato-tamarind broth',
      'Chickpeas, swiss chard',
    ],
    steps: [
      'Knead bulgur and lamb into a smooth shell dough.',
      'Stuff with sautéed onion + spiced mince.',
      'Simmer kubba balls in tangy tamarind broth.',
      'Serve hot with the broth ladled over.',
    ],
  },
  {
    id: 'lentil',
    nameKey: 'games.recipe.lentil.name',
    regionKey: 'games.recipe.lentil.region',
    prepMinutes: 30,
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=800',
    ingredients: [
      '1 cup red lentils',
      '1 onion, diced',
      'Cumin, turmeric, salt',
      'Lemon wedges to finish',
    ],
    steps: [
      'Sauté onion in olive oil until soft.',
      'Add lentils, water, cumin and turmeric.',
      'Simmer 20 minutes until lentils fall apart.',
      'Blend smooth, finish with a squeeze of lemon.',
    ],
  },
]
