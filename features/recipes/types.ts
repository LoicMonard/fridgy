export interface RecipeIngredient {
  tag: string;
  quantiteTotal: number;
  unite: string;
  estOptionnel: boolean;
}

export interface RecipeStep {
  ordre: number;
  instruction: string;
  durationMinutes?: number;
  ingredients: Array<{ tag: string; quantite: number; unite: string }>;
}

export interface Recipe {
  id: string;
  titre: string;
  langue: string;
  portionsBase: number;
  tempsPrepMin?: number;
  tempsCuissonMin?: number;
  instructionsJson: { portions: number; etapes: RecipeStep[] };
  preferences: string[];
  source: 'seed' | 'llm_generated';
  score?: number;
}
