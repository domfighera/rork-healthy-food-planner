import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { 
  ChefHat, 
  Calendar, 
  AlertCircle,
  CheckCircle2,
  Flame,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMealPlan } from '../../contexts/MealPlanContext';
import { useApp } from '../../contexts/AppContext';
import Colors from '../../constants/colors';
import type { Meal } from '../../constants/types';

export default function MealsScreen() {
  const insets = useSafeAreaInsets();
  const { 
    mealPlans, 
    groceryInventory,
    generateMeals, 
    isGeneratingMeals,
    generateMealsError,
    consumeMeal,
  } = useMealPlan();
  const { profile } = useApp();
  
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  const handleGenerateMeals = () => {
    if (groceryInventory.length === 0) {
      Alert.alert(
        'No Groceries Found',
        'Please add items to your budget first. Go to the Search or Scan tab to add groceries.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Generate Meal Plan',
      `Generate a 7-day meal plan using your ${groceryInventory.length} grocery items?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: () => {
            generateMeals({ profile, daysToGenerate: 7 });
          },
        },
      ]
    );
  };

  const handleConsumeMeal = (meal: Meal) => {
    if (meal.isConsumed) return;

    Alert.alert(
      'Mark as Consumed',
      `Mark "${meal.name}" as consumed? This will deduct ingredients from your inventory.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => consumeMeal(meal.id),
        },
      ]
    );
  };

  const selectedPlan = mealPlans[selectedDayIndex];

  const getMealIcon = (type: Meal['type']) => {
    switch (type) {
      case 'breakfast':
        return '🌅';
      case 'lunch':
        return '☀️';
      case 'dinner':
        return '🌙';
      case 'snack':
        return '🍎';
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Meal Plan</Text>
          <Text style={styles.subtitle}>
            AI-generated meals from your groceries
          </Text>
        </View>

        {mealPlans.length === 0 ? (
          <View style={styles.emptyState}>
            <ChefHat size={64} color={Colors.neutral.lightGray} />
            <Text style={styles.emptyTitle}>No Meal Plan Yet</Text>
            <Text style={styles.emptyText}>
              {groceryInventory.length === 0
                ? 'Add groceries to your budget to generate personalized meal plans'
                : `Generate meals using your ${groceryInventory.length} grocery items`}
            </Text>
            
            {generateMealsError && (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color={Colors.health.bad} />
                <Text style={styles.errorText}>
                  {(generateMealsError as Error).message}
                </Text>
              </View>
            )}

            <Pressable
              testID="generate-meal-plan-button"
              style={({ pressed }) => [
                styles.generateButton,
                groceryInventory.length === 0 && styles.generateButtonDisabled,
                pressed && !(isGeneratingMeals || groceryInventory.length === 0) && styles.generateButtonPressed,
              ]}
              onPress={handleGenerateMeals}
              disabled={isGeneratingMeals || groceryInventory.length === 0}
            >
              {isGeneratingMeals ? (
                <ActivityIndicator color={Colors.neutral.white} />
              ) : (
                <>
                  <ChefHat size={20} color={Colors.neutral.white} />
                  <Text style={styles.generateButtonText}>Generate Meal Plan</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.daySelector}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {mealPlans.map((plan, index) => {
                  const date = new Date(plan.date);
                  const isSelected = index === selectedDayIndex;
                  return (
                    <TouchableOpacity
                      key={plan.date}
                      style={[styles.dayChip, isSelected && styles.dayChipSelected]}
                      onPress={() => setSelectedDayIndex(index)}
                    >
                      <Text style={[styles.dayChipLabel, isSelected && styles.dayChipLabelSelected]}>
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </Text>
                      <Text style={[styles.dayChipDate, isSelected && styles.dayChipDateSelected]}>
                        {date.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {selectedPlan && (
              <>
                <View style={styles.dailyStatsCard}>
                  <View style={styles.statItem}>
                    <Flame size={20} color={Colors.accent.orange} />
                    <View style={styles.statContent}>
                      <Text style={styles.statValue}>
                        {selectedPlan.totalNutrition.calories}
                      </Text>
                      <Text style={styles.statLabel}>Calories</Text>
                    </View>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {selectedPlan.totalNutrition.protein}g
                    </Text>
                    <Text style={styles.statLabel}>Protein</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {selectedPlan.totalNutrition.carbs}g
                    </Text>
                    <Text style={styles.statLabel}>Carbs</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {selectedPlan.totalNutrition.fat}g
                    </Text>
                    <Text style={styles.statLabel}>Fat</Text>
                  </View>
                </View>

                <View style={styles.calorieProgress}>
                  <View style={styles.calorieProgressHeader}>
                    <Text style={styles.calorieProgressLabel}>Daily Goal Progress</Text>
                    <Text style={styles.calorieProgressValue}>
                      {selectedPlan.totalNutrition.calories} / {selectedPlan.calorieGoal} cal
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min((selectedPlan.totalNutrition.calories / selectedPlan.calorieGoal) * 100, 100)}%`,
                          backgroundColor: 
                            selectedPlan.remainingCalories < -100 
                              ? Colors.health.bad 
                              : selectedPlan.remainingCalories > 100
                              ? Colors.accent.orange
                              : Colors.primary.blue,
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.mealsSection}>
                  <Text style={styles.sectionTitle}>
                    {selectedPlan.meals.length} Meals
                  </Text>
                  {selectedPlan.meals.map((meal) => (
                    <TouchableOpacity
                      key={meal.id}
                      style={[
                        styles.mealCard,
                        meal.isConsumed && styles.mealCardConsumed,
                      ]}
                      onPress={() => handleConsumeMeal(meal)}
                      disabled={meal.isConsumed}
                    >
                      <View style={styles.mealHeader}>
                        <View style={styles.mealTitleRow}>
                          <Text style={styles.mealIcon}>{getMealIcon(meal.type)}</Text>
                          <View style={styles.mealTitleContent}>
                            <Text style={styles.mealType}>
                              {meal.type.charAt(0).toUpperCase() + meal.type.slice(1)}
                            </Text>
                            <Text style={styles.mealName}>{meal.name}</Text>
                          </View>
                        </View>
                        {meal.isConsumed ? (
                          <CheckCircle2 size={24} color={Colors.primary.blue} />
                        ) : (
                          <View style={styles.consumeButton}>
                            <Text style={styles.consumeButtonText}>Mark Eaten</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.mealNutrition}>
                        <View style={styles.nutritionItem}>
                          <Text style={styles.nutritionValue}>
                            {meal.totalNutrition.calories}
                          </Text>
                          <Text style={styles.nutritionLabel}>cal</Text>
                        </View>
                        <View style={styles.nutritionItem}>
                          <Text style={styles.nutritionValue}>
                            {meal.totalNutrition.protein}g
                          </Text>
                          <Text style={styles.nutritionLabel}>protein</Text>
                        </View>
                        <View style={styles.nutritionItem}>
                          <Text style={styles.nutritionValue}>
                            {meal.totalNutrition.carbs}g
                          </Text>
                          <Text style={styles.nutritionLabel}>carbs</Text>
                        </View>
                        <View style={styles.nutritionItem}>
                          <Text style={styles.nutritionValue}>
                            {meal.totalNutrition.fat}g
                          </Text>
                          <Text style={styles.nutritionLabel}>fat</Text>
                        </View>
                      </View>

                      <View style={styles.ingredientsSection}>
                        <Text style={styles.ingredientsTitle}>Ingredients:</Text>
                        {meal.ingredients.map((ing, i) => (
                          <Text key={i} style={styles.ingredientText}>
                            • {ing.servings} serving(s) of {ing.name}
                          </Text>
                        ))}
                      </View>

                      {meal.instructions.length > 0 && (
                        <View style={styles.instructionsSection}>
                          <Text style={styles.instructionsTitle}>Instructions:</Text>
                          {meal.instructions.map((step, i) => (
                            <Text key={i} style={styles.instructionText}>
                              {i + 1}. {step}
                            </Text>
                          ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                <Pressable
                  testID="regenerate-meal-plan-button"
                  style={({ pressed }) => [
                    styles.regenerateButton,
                    pressed && styles.regenerateButtonPressed,
                    isGeneratingMeals && styles.regenerateButtonDisabled,
                  ]}
                  onPress={handleGenerateMeals}
                  disabled={isGeneratingMeals}
                >
                  {isGeneratingMeals ? (
                    <ActivityIndicator color={Colors.neutral.white} />
                  ) : (
                    <>
                      <Calendar size={18} color={Colors.neutral.white} />
                      <Text style={styles.regenerateButtonText}>
                        Regenerate Meal Plan
                      </Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    marginTop: 40,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    lineHeight: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginTop: 20,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: Colors.health.bad,
  },
  generateButton: {
    backgroundColor: Colors.primary.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    minWidth: 200,
  },
  generateButtonPressed: {
    backgroundColor: Colors.primary.darkBlue,
  },
  generateButtonDisabled: {
    backgroundColor: Colors.neutral.lightGray,
    opacity: 0.6,
  },
  generateButtonText: {
    color: Colors.neutral.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  daySelector: {
    marginBottom: 20,
    paddingLeft: 24,
  },
  dayChip: {
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginRight: 10,
    minWidth: 70,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayChipSelected: {
    backgroundColor: Colors.primary.mediumBlue,
    borderColor: Colors.primary.darkBlue,
  },
  dayChipLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  dayChipLabelSelected: {
    color: Colors.neutral.white,
  },
  dayChipDate: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  dayChipDateSelected: {
    color: Colors.neutral.white,
  },
  dailyStatsCard: {
    backgroundColor: Colors.background.card,
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statContent: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border.light,
  },
  calorieProgress: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  calorieProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calorieProgressLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  calorieProgressValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.background.secondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  mealsSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  mealCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  mealCardConsumed: {
    opacity: 0.6,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  mealIcon: {
    fontSize: 32,
  },
  mealTitleContent: {
    flex: 1,
  },
  mealType: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mealName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginTop: 2,
  },
  consumeButton: {
    backgroundColor: Colors.primary.lightBlue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  consumeButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary.darkBlue,
  },
  mealNutrition: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  nutritionLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  ingredientsSection: {
    marginBottom: 12,
  },
  ingredientsTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  ingredientText: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 4,
    paddingLeft: 8,
  },
  instructionsSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  instructionsTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 6,
    lineHeight: 18,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginHorizontal: 24,
    marginBottom: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary.darkBlue,
    backgroundColor: Colors.primary.mediumBlue,
  },
  regenerateButtonPressed: {
    backgroundColor: Colors.primary.darkBlue,
  },
  regenerateButtonDisabled: {
    backgroundColor: Colors.primary.lightBlue,
    borderColor: Colors.primary.lightBlue,
    opacity: 0.6,
  },
  regenerateButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.neutral.white,
  },
});
