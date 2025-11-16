import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { generateText } from '@rork-ai/toolkit-sdk';
import type { 
  GroceryItem, 
  DailyMealPlan, 
  HealthScore, 
  UserProfile,
  WeightEntry,
  HealthTrend 
} from '../constants/types';

export const [MealPlanProvider, useMealPlan] = createContextHook(() => {
  const [groceryInventory, setGroceryInventory] = useState<GroceryItem[]>([]);
  const [mealPlans, setMealPlans] = useState<DailyMealPlan[]>([]);
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);

  const inventoryQuery = useQuery({
    queryKey: ['groceryInventory'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('groceryInventory');
      return stored ? JSON.parse(stored) : [];
    },
    staleTime: Infinity,
  });

  const mealPlansQuery = useQuery({
    queryKey: ['mealPlans'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('mealPlans');
      return stored ? JSON.parse(stored) : [];
    },
    staleTime: Infinity,
  });

  const healthScoreQuery = useQuery({
    queryKey: ['healthScore'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('healthScore');
      return stored ? JSON.parse(stored) : null;
    },
    staleTime: Infinity,
  });

  const weightHistoryQuery = useQuery({
    queryKey: ['weightHistory'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('weightHistory');
      return stored ? JSON.parse(stored) : [];
    },
    staleTime: Infinity,
  });

  const saveInventoryMutation = useMutation({
    mutationFn: async (inventory: GroceryItem[]) => {
      await AsyncStorage.setItem('groceryInventory', JSON.stringify(inventory));
      return inventory;
    },
    onSuccess: (data) => {
      setGroceryInventory(data);
    },
  });

  const saveMealPlansMutation = useMutation({
    mutationFn: async (plans: DailyMealPlan[]) => {
      await AsyncStorage.setItem('mealPlans', JSON.stringify(plans));
      return plans;
    },
    onSuccess: (data) => {
      setMealPlans(data);
    },
  });

  const saveHealthScoreMutation = useMutation({
    mutationFn: async (score: HealthScore) => {
      await AsyncStorage.setItem('healthScore', JSON.stringify(score));
      return score;
    },
    onSuccess: (data) => {
      setHealthScore(data);
    },
  });

  const saveWeightHistoryMutation = useMutation({
    mutationFn: async (history: WeightEntry[]) => {
      await AsyncStorage.setItem('weightHistory', JSON.stringify(history));
      return history;
    },
    onSuccess: (data) => {
      setWeightHistory(data);
    },
  });

  useEffect(() => {
    if (inventoryQuery.data) {
      setGroceryInventory(inventoryQuery.data);
    }
  }, [inventoryQuery.data]);

  useEffect(() => {
    if (mealPlansQuery.data) {
      setMealPlans(mealPlansQuery.data);
    }
  }, [mealPlansQuery.data]);

  useEffect(() => {
    if (healthScoreQuery.data) {
      setHealthScore(healthScoreQuery.data);
    }
  }, [healthScoreQuery.data]);

  useEffect(() => {
    if (weightHistoryQuery.data) {
      setWeightHistory(weightHistoryQuery.data);
    }
  }, [weightHistoryQuery.data]);

  const { mutate: mutateInventory } = saveInventoryMutation;
  
  const addToInventory = useCallback((item: Omit<GroceryItem, 'id' | 'dateAdded' | 'remainingQuantity'>) => {
    const newItem: GroceryItem = {
      ...item,
      id: Date.now().toString(),
      dateAdded: new Date().toISOString(),
      remainingQuantity: item.totalQuantity,
    };
    const updated = [...groceryInventory, newItem];
    mutateInventory(updated);
  }, [groceryInventory, mutateInventory]);

  const consumeFromInventory = useCallback((itemId: string, servings: number) => {
    const updated = groceryInventory.map((item) => {
      if (item.id === itemId) {
        const newRemaining = Math.max(0, item.remainingQuantity - servings);
        return { ...item, remainingQuantity: newRemaining };
      }
      return item;
    }).filter(item => item.remainingQuantity > 0);
    
    mutateInventory(updated);
  }, [groceryInventory, mutateInventory]);

  const generateMealsMutation = useMutation({
    mutationFn: async ({ 
      profile, 
      daysToGenerate = 7 
    }: { 
      profile: UserProfile; 
      daysToGenerate?: number;
    }) => {
      console.log('Starting meal generation...');
      
      const inventoryList = groceryInventory
        .filter(item => item.remainingQuantity > 0)
        .map(item => ({
          name: item.name,
          brand: item.brand || '',
          remaining: item.remainingQuantity,
          servingSize: item.servingSize,
          nutrition: item.nutrition,
        }));

      if (inventoryList.length === 0) {
        throw new Error('No groceries in inventory. Please add items to your budget first.');
      }

      const dietRestrictions = profile.dietaryPreferences.join(', ') || 'none';
      const healthConditions = profile.healthConditions.join(', ') || 'none';
      
      const today = new Date();
      const dates = Array.from({ length: daysToGenerate }, (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        return date.toISOString().split('T')[0];
      });
      
      const datesString = dates.map((d, i) => `Day ${i + 1}: ${d}`).join(', ');
      
      const prompt = `You are a meal planning expert. Create a COMPLETE ${daysToGenerate}-day meal plan using ONLY these available groceries:

${JSON.stringify(inventoryList, null, 2)}

User Profile:
- Dietary restrictions: ${dietRestrictions}
- Health conditions: ${healthConditions}
- Daily calorie goal: ${profile.dailyCalorieGoal} calories
- Weight: ${profile.weight || 'not specified'} lbs
- Height: ${profile.height || 'not specified'} inches
- Gender: ${profile.gender || 'not specified'}
- Goal: ${profile.weightGoal || 'maintain'} weight

CRITICAL REQUIREMENTS:
1. Create 3 meals per day (breakfast, lunch, dinner) for ALL ${daysToGenerate} days - THIS IS MANDATORY
2. Add snacks ONLY if needed to meet calorie goals
3. Use realistic serving sizes (e.g., "3 eggs", "1 cup of milk", "2 slices of bread")
4. Calculate nutrition PER SERVING from the provided nutrition data
5. Track inventory - don't use more servings than available
6. Honor ALL dietary restrictions strictly
7. Account for health conditions (e.g., low sugar for diabetes)
8. Try to meet daily calorie goal (±150 calories is acceptable)
9. Provide simple, realistic cooking instructions (1-3 steps)
10. Spread ingredients across ALL ${daysToGenerate} days - use simple combinations if running low
11. If ingredients are limited, create simpler meals (e.g., "Toast with spread", "Rice bowl")
12. YOU MUST GENERATE EXACTLY ${daysToGenerate} COMPLETE DAYS - NO EXCEPTIONS

DATES YOU MUST USE (in order):
${datesString}

Return ONLY valid JSON array with EXACTLY ${daysToGenerate} daily plans (no markdown, no explanations):
[{
  "date": "${dates[0]}",
  "meals": [{
    "name": "Scrambled Eggs",
    "type": "breakfast",
    "ingredients": [{
      "name": "Eggs",
      "servings": 2,
      "nutrition": { "calories": 140, "protein": 12, "carbs": 2, "fat": 10, "fiber": 0, "sugar": 0, "sodium": 140, "saturatedFat": 3 }
    }],
    "instructions": ["Beat eggs", "Cook in pan"],
    "totalNutrition": { "calories": 140, "protein": 12, "carbs": 2, "fat": 10, "fiber": 0, "sugar": 0, "sodium": 140, "saturatedFat": 3 }
  },
  {
    "name": "Simple Lunch",
    "type": "lunch",
    "ingredients": [],
    "instructions": ["Prepare meal"],
    "totalNutrition": { "calories": 400, "protein": 20, "carbs": 50, "fat": 10, "fiber": 5, "sugar": 5, "sodium": 300, "saturatedFat": 2 }
  },
  {
    "name": "Simple Dinner",
    "type": "dinner",
    "ingredients": [],
    "instructions": ["Prepare meal"],
    "totalNutrition": { "calories": 500, "protein": 30, "carbs": 60, "fat": 15, "fiber": 8, "sugar": 8, "sodium": 400, "saturatedFat": 4 }
  }],
  "totalNutrition": { "calories": 1040, "protein": 62, "carbs": 112, "fat": 35, "fiber": 13, "sugar": 13, "sodium": 840, "saturatedFat": 9 },
  "calorieGoal": ${profile.dailyCalorieGoal},
  "remainingCalories": ${profile.dailyCalorieGoal - 1040}
}]

Must include entries for ALL these dates: ${dates.join(', ')}
Each entry MUST have 3 meals minimum.
Return ONLY JSON array starting with [ and ending with ], nothing else.`;

      console.log('Generating meals with AI...');
      const response = await generateText({ 
        messages: [{ role: 'user', content: prompt }] 
      });

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error('Failed to parse meal plan response:', response);
        throw new Error('Failed to generate meal plan. Please try again.');
      }

      let plans = JSON.parse(jsonMatch[0]) as DailyMealPlan[];
      
      if (plans.length < daysToGenerate) {
        console.warn(`Only generated ${plans.length} days instead of ${daysToGenerate}. Filling remaining days...`);
        
        while (plans.length < daysToGenerate) {
          const nextDate = dates[plans.length];
          
          const simpleMeals = [
            {
              id: `${Date.now()}-${Math.random()}`,
              name: 'Simple Breakfast',
              type: 'breakfast' as const,
              ingredients: [],
              instructions: ['Prepare a simple breakfast with available items'],
              totalNutrition: {
                calories: Math.floor(profile.dailyCalorieGoal * 0.25),
                protein: 15,
                carbs: 40,
                fat: 10,
                fiber: 5,
                sugar: 5,
                sodium: 200,
                saturatedFat: 3,
              },
              date: nextDate,
              isConsumed: false,
            },
            {
              id: `${Date.now()}-${Math.random()}-2`,
              name: 'Simple Lunch',
              type: 'lunch' as const,
              ingredients: [],
              instructions: ['Prepare a simple lunch with available items'],
              totalNutrition: {
                calories: Math.floor(profile.dailyCalorieGoal * 0.35),
                protein: 25,
                carbs: 50,
                fat: 15,
                fiber: 8,
                sugar: 8,
                sodium: 300,
                saturatedFat: 5,
              },
              date: nextDate,
              isConsumed: false,
            },
            {
              id: `${Date.now()}-${Math.random()}-3`,
              name: 'Simple Dinner',
              type: 'dinner' as const,
              ingredients: [],
              instructions: ['Prepare a simple dinner with available items'],
              totalNutrition: {
                calories: Math.floor(profile.dailyCalorieGoal * 0.4),
                protein: 30,
                carbs: 60,
                fat: 18,
                fiber: 10,
                sugar: 10,
                sodium: 400,
                saturatedFat: 6,
              },
              date: nextDate,
              isConsumed: false,
            },
          ];
          
          const totalNutrition = simpleMeals.reduce(
            (acc, meal) => ({
              calories: acc.calories + meal.totalNutrition.calories,
              protein: acc.protein + meal.totalNutrition.protein,
              carbs: acc.carbs + meal.totalNutrition.carbs,
              fat: acc.fat + meal.totalNutrition.fat,
              fiber: acc.fiber + meal.totalNutrition.fiber,
              sugar: acc.sugar + meal.totalNutrition.sugar,
              sodium: acc.sodium + meal.totalNutrition.sodium,
              saturatedFat: acc.saturatedFat + meal.totalNutrition.saturatedFat,
            }),
            {
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              fiber: 0,
              sugar: 0,
              sodium: 0,
              saturatedFat: 0,
            }
          );
          
          plans.push({
            date: nextDate,
            meals: simpleMeals,
            totalNutrition,
            calorieGoal: profile.dailyCalorieGoal,
            remainingCalories: profile.dailyCalorieGoal - totalNutrition.calories,
          });
        }
        
        console.log(`Filled meal plan to ${plans.length} days with simple meals`);
      }
      
      const plansWithIds = plans.map(plan => ({
        ...plan,
        meals: plan.meals.map(meal => ({
          ...meal,
          id: `${Date.now()}-${Math.random()}`,
          date: plan.date,
          isConsumed: false,
          ingredients: meal.ingredients.map(ing => {
            const inventoryItem = groceryInventory.find(
              item => item.name.toLowerCase().includes(ing.name.toLowerCase())
            );
            return {
              ...ing,
              groceryItemId: inventoryItem?.id || '',
            };
          }),
        })),
      }));

      console.log('Generated meal plans:', plansWithIds.length);
      return plansWithIds;
    },
    onSuccess: (data) => {
      saveMealPlansMutation.mutate(data);
    },
  });

  const { mutate: mutateMealPlans } = saveMealPlansMutation;
  
  const consumeMeal = useCallback((mealId: string) => {
    const updatedPlans = mealPlans.map(plan => ({
      ...plan,
      meals: plan.meals.map(meal => {
        if (meal.id === mealId && !meal.isConsumed) {
          meal.ingredients.forEach(ing => {
            if (ing.groceryItemId) {
              consumeFromInventory(ing.groceryItemId, ing.servings);
            }
          });
          return { ...meal, isConsumed: true };
        }
        return meal;
      }),
    }));
    
    mutateMealPlans(updatedPlans);
  }, [mealPlans, consumeFromInventory, mutateMealPlans]);

  const calculateHealthScoreMutation = useMutation({
    mutationFn: async ({ profile }: { profile: UserProfile }) => {
      console.log('Calculating health score...');
      
      const inventoryList = groceryInventory.map(item => ({
        name: item.name,
        brand: item.brand || '',
        nutrition: item.nutrition,
      }));

      if (inventoryList.length === 0) {
        return null;
      }

      const gender = profile.gender || 'other';
      const weight = profile.weight || 150;
      const height = profile.height || 66;
      const age = 30;
      
      let bmr = 0;
      if (gender === 'male') {
        bmr = 88.362 + (13.397 * weight / 2.205) + (4.799 * height * 2.54) - (5.677 * age);
      } else if (gender === 'female') {
        bmr = 447.593 + (9.247 * weight / 2.205) + (3.098 * height * 2.54) - (4.330 * age);
      } else {
        bmr = 1800;
      }
      
      const dailyCalorieNeed = Math.round(bmr * 1.55);
      
      const maxSugarGrams = gender === 'male' ? 36 : 25;
      const maxSodiumMg = 2300;
      const maxSaturatedFatGrams = Math.round((dailyCalorieNeed * 0.10) / 9);
      const minFiberGrams = gender === 'male' ? 38 : 25;
      
      const prompt = `You are a nutrition expert. Analyze this grocery list for health quality:

${JSON.stringify(inventoryList, null, 2)}

User Profile:
- Gender: ${gender}
- Weight: ${weight} lbs
- Height: ${height} inches
- Daily Calorie Need (BMR): ${dailyCalorieNeed} calories
- Goal: ${profile.weightGoal || 'maintain'} weight
- Dietary preferences: ${profile.dietaryPreferences.join(', ') || 'none'}
- Health conditions: ${profile.healthConditions.join(', ') || 'none'}

Personalized Daily Nutritional Targets (based on gender and weight):
- Maximum sugar: ${maxSugarGrams}g per day
- Maximum sodium: ${maxSodiumMg}mg per day
- Maximum saturated fat: ${maxSaturatedFatGrams}g per day
- Minimum fiber: ${minFiberGrams}g per day

CRITICAL SCORING RULES:
1. Calculate average daily intake from all grocery items
2. Compare to personalized targets above
3. EXTREMELY HEAVILY penalize artificial ingredients:
   - EXTREMELY HARMFUL (−50 points EACH): Sucralose, Aspartame, Red 40/Red Dye 40, Yellow 5 (Tartrazine), Partially hydrogenated oils, Trans fats, Potassium bromate
   - VERY HARMFUL (−45 to −48 points EACH): Acesulfame-K, Yellow 6 (Sunset Yellow), TBHQ, BHA, BHT, Blue 1, Blue 2
   - HARMFUL (−35 to −40 points EACH): Caramel color, Propyl gallate, Sodium nitrite, Sodium nitrate
   - CONCERNING (−25 to −32 points EACH): High fructose corn syrup, MSG/Monosodium glutamate, Sodium benzoate, Carrageenan, Polysorbate, Artificial flavors
   - MODERATELY CONCERNING (−20 points): Corn syrup
   Products with multiple harmful ingredients should have CUMULATIVE penalties
4. Sugar scoring: Compare to ${maxSugarGrams}g daily limit
5. Sodium scoring: Compare to ${maxSodiumMg}mg daily limit
6. Fat scoring: Compare to personalized needs based on ${dailyCalorieNeed} calories
7. Fiber scoring: Compare to ${minFiberGrams}g daily minimum
8. A product with ONE extremely harmful ingredient should score below 50
9. A product with TWO extremely harmful ingredients should score below 20
10. A product with THREE or more extremely harmful ingredients should score near 0

For EACH harmful ingredient found:
- Name: exact ingredient name (capitalize properly)
- Severity: 'excellent', 'good', 'moderate', 'concerning', or 'avoid'
  - avoid: Sucralose, Aspartame, Acesulfame-K, Red 40, Red Dye 40, Yellow 5, Yellow 6, Blue 1, Blue 2, TBHQ, BHA, BHT, Partially hydrogenated oils, Trans fats, Potassium bromate
  - concerning: High fructose corn syrup, Sodium nitrite, Sodium nitrate, Propyl gallate, Caramel color, MSG, Artificial flavors, Carrageenan, Polysorbate 80
  - moderate: Corn syrup, Sodium benzoate, Refined sugars, Vegetable oils, Modified food starch
  - good: Cane sugar, Whole grains, Olive oil, Natural flavors, Sea salt
  - excellent: Stevia leaf extract, Whole foods, Organic ingredients, Monk fruit extract
- Reason: brief explanation (1-2 sentences)
- HealthImpact: detailed health effects (2-3 sentences) specific to user's profile including gender, weight, and health conditions
- Alternatives: 2-3 specific branded products available in grocery stores
- FoundIn: List ALL products containing this ingredient

Return ONLY valid JSON:
{
  "overall": 45,
  "categories": {
    "sugar": { "score": 60, "status": "fair", "message": "Average ${maxSugarGrams}g/day exceeds your ${maxSugarGrams}g limit by X%" },
    "fat": { "score": 70, "status": "good", "message": "Fat intake appropriate for ${dailyCalorieNeed} calorie needs" },
    "saturatedFat": { "score": 55, "status": "fair", "message": "Exceeds ${maxSaturatedFatGrams}g daily limit" },
    "sodium": { "score": 65, "status": "fair", "message": "Close to ${maxSodiumMg}mg daily limit" },
    "fiber": { "score": 50, "status": "fair", "message": "Below ${minFiberGrams}g daily target" },
    "processedFoods": { "score": 30, "status": "poor", "message": "Multiple harmful artificial ingredients detected" }
  },
  "recommendations": [
    "Replace products with sucralose with stevia-based alternatives",
    "Avoid products with Red 40 - linked to hyperactivity",
    "Increase fiber intake for ${gender}s (target: ${minFiberGrams}g/day)"
  ],
  "badIngredients": [
    {
      "name": "Sucralose",
      "severity": "avoid",
      "reason": "Artificial sweetener that disrupts gut microbiome",
      "foundIn": ["Product A", "Product B"],
      "healthImpact": "May disrupt gut bacteria, linked to glucose intolerance, potential weight gain despite zero calories, concerns for ${profile.healthConditions.includes('diabetes') ? 'diabetics' : 'metabolic health'}",
      "alternatives": ["Stevia-sweetened alternatives", "Naturally sweetened products", "Whole fruit for sweetness"]
    },
    {
      "name": "Red 40",
      "severity": "avoid",
      "reason": "Petroleum-based artificial food dye",
      "foundIn": ["Product C"],
      "healthImpact": "Linked to hyperactivity in children, potential allergen, may cause inflammatory responses, banned in several countries",
      "alternatives": ["Products colored with beet juice", "Naturally colored alternatives", "Uncolored versions"]
    }
  ],
  "date": "${new Date().toISOString()}"
}`;

      const response = await generateText({ 
        messages: [{ role: 'user', content: prompt }] 
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to calculate health score');
      }

      const score = JSON.parse(jsonMatch[0]) as HealthScore;
      
      if (!score.badIngredients) {
        score.badIngredients = [];
      }
      if (!score.date) {
        score.date = new Date().toISOString();
      }
      
      console.log('Health score calculated:', score.overall);
      return score;
    },
    onSuccess: (data) => {
      if (data) {
        saveHealthScoreMutation.mutate(data);
      }
    },
  });

  const { mutate: mutateHealthScore } = saveHealthScoreMutation;
  const { mutate: mutateWeightHistory } = saveWeightHistoryMutation;

  const addWeightEntry = useCallback((weight: number) => {
    const newEntry: WeightEntry = {
      weight,
      date: new Date().toISOString(),
    };
    const updated = [newEntry, ...weightHistory];
    mutateWeightHistory(updated);
  }, [weightHistory, mutateWeightHistory]);

  const getWeeklyTrends = useCallback((): HealthTrend[] => {
    const trends: HealthTrend[] = [];
    const now = new Date();
    
    for (let weekOffset = 0; weekOffset < 12; weekOffset++) {
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - (weekOffset * 7));
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekWeights = weightHistory.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= weekStart && entryDate <= weekEnd;
      });
      
      const weekMeals = mealPlans
        .filter(plan => {
          const planDate = new Date(plan.date);
          return planDate >= weekStart && planDate <= weekEnd;
        })
        .flatMap(plan => plan.meals);
      
      const consumedMeals = weekMeals.filter(meal => meal.isConsumed);
      const caloriesConsumed = consumedMeals.reduce(
        (sum, meal) => sum + meal.totalNutrition.calories,
        0
      );
      
      const averageWeight = weekWeights.length > 0
        ? weekWeights.reduce((sum, entry) => sum + entry.weight, 0) / weekWeights.length
        : 0;
      
      let averageHealthScore = 0;
      if (healthScore && healthScore.date) {
        const scoreDate = new Date(healthScore.date);
        if (scoreDate >= weekStart && scoreDate <= weekEnd) {
          averageHealthScore = healthScore.overall;
        }
      }
      
      if (weekWeights.length > 0 || consumedMeals.length > 0 || averageHealthScore > 0) {
        trends.push({
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          averageHealthScore,
          averageWeight,
          caloriesConsumed,
          mealsCompleted: consumedMeals.length,
        });
      }
    }
    
    return trends.reverse();
  }, [weightHistory, mealPlans, healthScore]);
  
  const clearAllData = useCallback(() => {
    mutateInventory([]);
    mutateMealPlans([]);
    mutateWeightHistory([]);
    mutateHealthScore({
      overall: 0,
      categories: {
        sugar: { score: 0, status: 'bad' as const, message: '' },
        fat: { score: 0, status: 'bad' as const, message: '' },
        saturatedFat: { score: 0, status: 'bad' as const, message: '' },
        sodium: { score: 0, status: 'bad' as const, message: '' },
        fiber: { score: 0, status: 'bad' as const, message: '' },
        processedFoods: { score: 0, status: 'bad' as const, message: '' },
      },
      recommendations: [],
      badIngredients: [],
      date: new Date().toISOString(),
    });
  }, [mutateInventory, mutateMealPlans, mutateWeightHistory, mutateHealthScore]);

  return useMemo(() => ({
    groceryInventory,
    mealPlans,
    healthScore,
    weightHistory,
    addToInventory,
    consumeFromInventory,
    generateMeals: generateMealsMutation.mutate,
    isGeneratingMeals: generateMealsMutation.isPending,
    generateMealsError: generateMealsMutation.error,
    consumeMeal,
    calculateHealthScore: calculateHealthScoreMutation.mutate,
    isCalculatingHealthScore: calculateHealthScoreMutation.isPending,
    addWeightEntry,
    getWeeklyTrends,
    clearAllData,
    isLoading: inventoryQuery.isLoading || mealPlansQuery.isLoading || healthScoreQuery.isLoading || weightHistoryQuery.isLoading,
  }), [
    groceryInventory,
    mealPlans,
    healthScore,
    weightHistory,
    addToInventory,
    consumeFromInventory,
    generateMealsMutation.mutate,
    generateMealsMutation.isPending,
    generateMealsMutation.error,
    consumeMeal,
    calculateHealthScoreMutation.mutate,
    calculateHealthScoreMutation.isPending,
    addWeightEntry,
    getWeeklyTrends,
    clearAllData,
    inventoryQuery.isLoading,
    mealPlansQuery.isLoading,
    healthScoreQuery.isLoading,
    weightHistoryQuery.isLoading,
  ]);
});
