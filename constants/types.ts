export type DietaryPreference = 
  | 'none'
  | 'vegetarian'
  | 'vegan'
  | 'keto'
  | 'paleo'
  | 'gluten-free'
  | 'dairy-free'
  | 'low-carb'
  | 'low-fat';

export type HealthCondition = 
  | 'diabetes'
  | 'hypertension'
  | 'heart-disease'
  | 'kidney-disease';

export type Allergen = 
  | 'peanuts'
  | 'tree-nuts'
  | 'milk'
  | 'eggs'
  | 'fish'
  | 'shellfish'
  | 'soy'
  | 'wheat'
  | 'sesame';

export type Gender = 'male' | 'female' | 'other';

export type WeightGoal = 'lose' | 'maintain' | 'gain';

export interface UserProfile {
  name: string;
  dietaryPreferences: DietaryPreference[];
  healthConditions: HealthCondition[];
  allergens: Allergen[];
  dailyCalorieGoal: number;
  weeklyBudget: number;
  weight?: number;
  targetWeight?: number;
  height?: number;
  gender?: Gender;
  weightGoal?: WeightGoal;
  favoriteFoods: string[];
  onboardingCompleted: boolean;
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  saturatedFat: number;
}

export interface Product {
  code: string;
  name: string;
  brand: string;
  image?: string;
  ingredients: string[];
  nutrition: NutritionInfo;
  healthScore: number;
  warnings: string[];
  benefits: string[];
  estimatedPrice?: number;
}

export interface BudgetEntry {
  id: string;
  productCode: string;
  productName: string;
  price: number;
  date: string;
  quantity?: number;
  servingSize?: string;
  nutrition?: NutritionInfo;
}

export interface GroceryItem {
  id: string;
  name: string;
  brand?: string;
  totalQuantity: number;
  remainingQuantity: number;
  servingSize: string;
  servingsPerContainer: number;
  nutrition: NutritionInfo;
  price: number;
  dateAdded: string;
}

export interface MealIngredient {
  groceryItemId: string;
  name: string;
  servings: number;
  nutrition: NutritionInfo;
}

export interface Meal {
  id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  ingredients: MealIngredient[];
  instructions: string[];
  totalNutrition: NutritionInfo;
  date: string;
  isConsumed: boolean;
}

export interface DailyMealPlan {
  date: string;
  meals: Meal[];
  totalNutrition: NutritionInfo;
  calorieGoal: number;
  remainingCalories: number;
}

export type IngredientSeverity = 'excellent' | 'good' | 'moderate' | 'concerning' | 'avoid';

export interface BadIngredient {
  name: string;
  severity: IngredientSeverity;
  reason: string;
  foundIn: string[];
  healthImpact: string;
  alternatives: string[];
}

export interface HealthScore {
  overall: number;
  categories: {
    sugar: { score: number; status: 'excellent' | 'good' | 'fair' | 'poor' | 'bad'; message: string };
    fat: { score: number; status: 'excellent' | 'good' | 'fair' | 'poor' | 'bad'; message: string };
    saturatedFat: { score: number; status: 'excellent' | 'good' | 'fair' | 'poor' | 'bad'; message: string };
    sodium: { score: number; status: 'excellent' | 'good' | 'fair' | 'poor' | 'bad'; message: string };
    fiber: { score: number; status: 'excellent' | 'good' | 'fair' | 'poor' | 'bad'; message: string };
    processedFoods: { score: number; status: 'excellent' | 'good' | 'fair' | 'poor' | 'bad'; message: string };
  };
  recommendations: string[];
  badIngredients: BadIngredient[];
  date: string;
}

export interface WeightEntry {
  date: string;
  weight: number;
  notes?: string;
}

export interface HealthTrend {
  weekStart: string;
  weekEnd: string;
  averageHealthScore: number;
  averageWeight: number;
  caloriesConsumed: number;
  mealsCompleted: number;
}
