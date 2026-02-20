export interface User {
  id: string;
  email: string;
  isPremium: boolean;
  preferences: DietaryPreferences;
  createdAt: string;
}

export interface DietaryPreferences {
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
}

export interface Foyer {
  id: string;
  nom: string;
  createdBy: string;
  createdAt: string;
}
