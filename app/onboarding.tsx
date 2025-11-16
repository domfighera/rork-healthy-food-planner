import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  Platform,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react-native';
import { useApp } from '../contexts/AppContext';
import Colors from '../constants/colors';
import Logo from '../components/Logo';
import type { DietaryPreference, Gender, WeightGoal } from '../constants/types';

const STEPS = [
  { title: 'Diet Preferences', subtitle: 'Select your dietary restrictions' },
  { title: 'Weekly Budget', subtitle: 'Set your grocery budget' },
  { title: 'Personal Info', subtitle: 'Help us calculate your needs' },
  { title: 'Favorite Foods', subtitle: 'What foods do you enjoy?' },
];

const DIET_OPTIONS: { value: DietaryPreference; label: string; description: string }[] = [
  { value: 'none', label: 'No Restrictions', description: 'I eat everything' },
  { value: 'vegetarian', label: 'Vegetarian', description: 'No meat or fish' },
  { value: 'vegan', label: 'Vegan', description: 'No animal products' },
  { value: 'keto', label: 'Keto', description: 'Low carb, high fat' },
  { value: 'gluten-free', label: 'Gluten Free', description: 'No gluten' },
  { value: 'paleo', label: 'Paleo', description: 'Whole foods only' },
];

const FOOD_BY_DIET: Record<DietaryPreference, string[]> = {
  'none': ['Chicken', 'Beef', 'Fish', 'Eggs', 'Rice', 'Pasta', 'Bread', 'Vegetables', 'Fruits', 'Nuts', 'Yogurt', 'Cheese', 'Milk', 'Beans', 'Tofu', 'Quinoa', 'Oats', 'Avocado', 'Sweet Potato'],
  'vegetarian': ['Eggs', 'Rice', 'Pasta', 'Bread', 'Vegetables', 'Fruits', 'Nuts', 'Yogurt', 'Cheese', 'Milk', 'Beans', 'Tofu', 'Quinoa', 'Oats', 'Avocado', 'Sweet Potato'],
  'vegan': ['Rice', 'Pasta', 'Bread', 'Vegetables', 'Fruits', 'Nuts', 'Beans', 'Tofu', 'Quinoa', 'Oats', 'Avocado', 'Sweet Potato', 'Nutritional Yeast', 'Tempeh'],
  'keto': ['Chicken', 'Beef', 'Fish', 'Eggs', 'Avocado', 'Cheese', 'Nuts', 'Butter', 'Olive Oil', 'Broccoli', 'Spinach', 'Bacon'],
  'paleo': ['Chicken', 'Beef', 'Fish', 'Eggs', 'Vegetables', 'Fruits', 'Nuts', 'Sweet Potato', 'Avocado'],
  'gluten-free': ['Chicken', 'Beef', 'Fish', 'Eggs', 'Rice', 'Vegetables', 'Fruits', 'Nuts', 'Yogurt', 'Cheese', 'Milk', 'Beans', 'Tofu', 'Quinoa', 'Oats', 'Avocado', 'Sweet Potato'],
  'dairy-free': ['Chicken', 'Beef', 'Fish', 'Eggs', 'Rice', 'Pasta', 'Bread', 'Vegetables', 'Fruits', 'Nuts', 'Beans', 'Tofu', 'Quinoa', 'Oats', 'Avocado', 'Sweet Potato'],
  'low-carb': ['Chicken', 'Beef', 'Fish', 'Eggs', 'Cheese', 'Vegetables', 'Nuts', 'Avocado'],
  'low-fat': ['Chicken', 'Fish', 'Vegetables', 'Fruits', 'Rice', 'Pasta', 'Oats', 'Beans'],
};

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useApp();

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [dietaryPreferences, setDietaryPreferences] = useState<DietaryPreference[]>([]);
  const [weeklyBudget, setWeeklyBudget] = useState<string>('100');
  const [weight, setWeight] = useState<string>('');
  const [targetWeight, setTargetWeight] = useState<string>('');
  const [heightFeet, setHeightFeet] = useState<string>('');
  const [heightInches, setHeightInches] = useState<string>('');
  const [gender, setGender] = useState<Gender | undefined>(undefined);
  const [weightGoal, setWeightGoal] = useState<WeightGoal | undefined>(undefined);
  const [favoriteFoods, setFavoriteFoods] = useState<string[]>([]);
  const [customFood, setCustomFood] = useState<string>('');
  const [showSplash, setShowSplash] = useState<boolean>(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const calculateCalories = useMemo(() => {
    if (!weight || !heightFeet || !heightInches || !gender || !weightGoal) return 2000;

    const weightLbs = parseFloat(weight);
    const targetWeightLbs = targetWeight ? parseFloat(targetWeight) : weightLbs;
    const feet = parseFloat(heightFeet);
    const inches = parseFloat(heightInches);
    
    if (isNaN(weightLbs) || isNaN(feet) || isNaN(inches)) return 2000;
    if (targetWeight && isNaN(targetWeightLbs)) return 2000;

    const weightKg = weightLbs * 0.453592;
    const heightCm = (feet * 12 + inches) * 2.54;

    let bmr: number;
    if (gender === 'male') {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * 25 + 5;
    } else if (gender === 'female') {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * 25 - 161;
    } else {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * 25 - 78;
    }

    const tdee = bmr * 1.55;

    if (weightGoal === 'lose') {
      const weightDiff = Math.abs(weightLbs - targetWeightLbs);
      const deficit = Math.min(weightDiff > 20 ? 700 : 500, 1000);
      return Math.max(1200, Math.round(tdee - deficit));
    }
    if (weightGoal === 'gain') {
      const weightDiff = Math.abs(targetWeightLbs - weightLbs);
      const surplus = Math.min(weightDiff > 20 ? 700 : 500, 1000);
      return Math.round(tdee + surplus);
    }
    return Math.round(tdee);
  }, [weight, targetWeight, heightFeet, heightInches, gender, weightGoal]);

  const filteredFoods = useMemo(() => {
    if (dietaryPreferences.length === 0 || dietaryPreferences.includes('none')) {
      return FOOD_BY_DIET['none'];
    }
    const allFoods = new Set<string>();
    dietaryPreferences.forEach(diet => {
      FOOD_BY_DIET[diet]?.forEach(food => allFoods.add(food));
    });
    return Array.from(allFoods);
  }, [dietaryPreferences]);

  const toggleDiet = (diet: DietaryPreference) => {
    if (diet === 'none') {
      setDietaryPreferences(['none']);
    } else {
      const newPrefs = dietaryPreferences.filter((d) => d !== 'none');
      if (newPrefs.includes(diet)) {
        setDietaryPreferences(newPrefs.filter((d) => d !== diet));
      } else {
        setDietaryPreferences([...newPrefs, diet]);
      }
    }
  };

  const toggleFood = (food: string) => {
    if (favoriteFoods.includes(food)) {
      setFavoriteFoods(favoriteFoods.filter((f) => f !== food));
    } else {
      setFavoriteFoods([...favoriteFoods, food]);
    }
  };

  const addCustomFood = () => {
    if (customFood.trim() && !favoriteFoods.includes(customFood.trim())) {
      setFavoriteFoods([...favoriteFoods, customFood.trim()]);
      setCustomFood('');
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return dietaryPreferences.length > 0;
      case 1:
        return weeklyBudget && parseFloat(weeklyBudget) > 0;
      case 2:
        const hasTargetWeight = weightGoal === 'maintain' || (targetWeight && parseFloat(targetWeight) > 0);
        return weight && heightFeet && heightInches && gender && weightGoal && hasTargetWeight;
      case 3:
        return favoriteFoods.length > 0;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    const weightLbs = parseFloat(weight);
    const targetWeightLbs = targetWeight ? parseFloat(targetWeight) : weightLbs;
    const feet = parseFloat(heightFeet);
    const inches = parseFloat(heightInches);
    const heightCm = (feet * 12 + inches) * 2.54;

    completeOnboarding({
      dietaryPreferences,
      weeklyBudget: parseFloat(weeklyBudget),
      weight: weightLbs,
      targetWeight: targetWeightLbs,
      height: heightCm,
      gender,
      weightGoal,
      dailyCalorieGoal: calculateCalories,
      favoriteFoods,
    });
    router.replace('/(tabs)');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepTitle}>{STEPS[0].title}</Text>
            <Text style={styles.stepSubtitle}>{STEPS[0].subtitle}</Text>
            <View style={styles.optionsContainer}>
              {DIET_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dietOption,
                    dietaryPreferences.includes(option.value) && styles.dietOptionSelected,
                  ]}
                  onPress={() => toggleDiet(option.value)}
                >
                  <View style={styles.dietOptionContent}>
                    <Text
                      style={[
                        styles.dietOptionLabel,
                        dietaryPreferences.includes(option.value) && styles.dietOptionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text
                      style={[
                        styles.dietOptionDescription,
                        dietaryPreferences.includes(option.value) && styles.dietOptionDescriptionSelected,
                      ]}
                    >
                      {option.description}
                    </Text>
                  </View>
                  {dietaryPreferences.includes(option.value) && (
                    <CheckCircle2 size={24} color={Colors.neutral.white} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{STEPS[1].title}</Text>
            <Text style={styles.stepSubtitle}>{STEPS[1].subtitle}</Text>
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Weekly Grocery Budget</Text>
              <View style={styles.currencyInput}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.input}
                  value={weeklyBudget}
                  onChangeText={setWeeklyBudget}
                  keyboardType="decimal-pad"
                  placeholder="100"
                  placeholderTextColor={Colors.text.tertiary}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>
              <Text style={styles.inputHint}>
                We&apos;ll recommend groceries that fit your budget
              </Text>
            </View>
          </View>
        );

      case 2:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepTitle}>{STEPS[2].title}</Text>
            <Text style={styles.stepSubtitle}>{STEPS[2].subtitle}</Text>
            
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderButtons}>
                {(['male', 'female', 'other'] as Gender[]).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.genderButton,
                      gender === g && styles.genderButtonSelected,
                    ]}
                    onPress={() => setGender(g)}
                  >
                    <Text
                      style={[
                        styles.genderButtonText,
                        gender === g && styles.genderButtonTextSelected,
                      ]}
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Weight (lbs)</Text>
              <TextInput
                style={styles.textInput}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="150"
                placeholderTextColor={Colors.text.tertiary}
                returnKeyType="next"
                onSubmitEditing={() => Keyboard.dismiss()}
                onBlur={() => Keyboard.dismiss()}
              />
            </View>

            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Height</Text>
              <View style={styles.heightInputRow}>
                <View style={styles.heightInputContainer}>
                  <TextInput
                    style={styles.heightInput}
                    value={heightFeet}
                    onChangeText={setHeightFeet}
                    keyboardType="number-pad"
                    placeholder="5"
                    placeholderTextColor={Colors.text.tertiary}
                    returnKeyType="next"
                  />
                  <Text style={styles.heightLabel}>ft</Text>
                </View>
                <View style={styles.heightInputContainer}>
                  <TextInput
                    style={styles.heightInput}
                    value={heightInches}
                    onChangeText={setHeightInches}
                    keyboardType="number-pad"
                    placeholder="8"
                    placeholderTextColor={Colors.text.tertiary}
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                    onBlur={() => Keyboard.dismiss()}
                  />
                  <Text style={styles.heightLabel}>in</Text>
                </View>
              </View>
            </View>

            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Goal</Text>
              <View style={styles.goalButtons}>
                {(['lose', 'maintain', 'gain'] as WeightGoal[]).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.goalButton,
                      weightGoal === g && styles.goalButtonSelected,
                    ]}
                    onPress={() => setWeightGoal(g)}
                  >
                    <Text
                      style={[
                        styles.goalButtonText,
                        weightGoal === g && styles.goalButtonTextSelected,
                      ]}
                    >
                      {g === 'lose' ? 'Lose Weight' : g === 'maintain' ? 'Maintain' : 'Gain Weight'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {weightGoal && weightGoal !== 'maintain' && (
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>Target Weight (lbs)</Text>
                <TextInput
                  style={styles.textInput}
                  value={targetWeight}
                  onChangeText={setTargetWeight}
                  keyboardType="decimal-pad"
                  placeholder={weightGoal === 'lose' ? '140' : '160'}
                  placeholderTextColor={Colors.text.tertiary}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  onBlur={() => Keyboard.dismiss()}
                />
                <Text style={styles.targetWeightHint}>
                  {weightGoal === 'lose' 
                    ? 'Enter your target weight to customize your calorie goal'
                    : 'Enter your desired weight to plan your bulk'}
                </Text>
              </View>
            )}

            {weight && heightFeet && heightInches && gender && weightGoal && (
              <View style={styles.calorieCard}>
                <Text style={styles.calorieLabel}>Your Daily Calorie Goal</Text>
                <Text style={styles.calorieValue}>{calculateCalories} cal</Text>
                <Text style={styles.calorieHint}>
                  Calculated based on your info and goal
                </Text>
              </View>
            )}
          </ScrollView>
        );

      case 3:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepTitle}>{STEPS[3].title}</Text>
            <Text style={styles.stepSubtitle}>{STEPS[3].subtitle}</Text>
            
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Add Custom Food</Text>
              <View style={styles.customFoodInput}>
                <TextInput
                  style={styles.customInput}
                  value={customFood}
                  onChangeText={setCustomFood}
                  placeholder="e.g., Salmon, Broccoli..."
                  placeholderTextColor={Colors.text.tertiary}
                  onSubmitEditing={addCustomFood}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[styles.addButton, !customFood.trim() && styles.addButtonDisabled]}
                  onPress={addCustomFood}
                  disabled={!customFood.trim()}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.suggestionsTitle}>Suggestions</Text>
            <View style={styles.foodChips}>
              {filteredFoods.map((food) => (
                <TouchableOpacity
                  key={food}
                  style={[
                    styles.foodChip,
                    favoriteFoods.includes(food) && styles.foodChipSelected,
                  ]}
                  onPress={() => toggleFood(food)}
                >
                  <Text
                    style={[
                      styles.foodChipText,
                      favoriteFoods.includes(food) && styles.foodChipTextSelected,
                    ]}
                  >
                    {food}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {favoriteFoods.length > 0 && (
              <View style={styles.selectedSection}>
                <Text style={styles.selectedTitle}>Your Favorites ({favoriteFoods.length})</Text>
                <View style={styles.foodChips}>
                  {favoriteFoods.map((food) => (
                    <TouchableOpacity
                      key={food}
                      style={styles.selectedChip}
                      onPress={() => toggleFood(food)}
                    >
                      <Text style={styles.selectedChipText}>{food}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        );

      default:
        return null;
    }
  };

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar barStyle="dark-content" />
        <Logo size="large" showText={true} />
        <Text style={styles.splashTagline}>Smart Nutrition & Budget Tracking</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          {STEPS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index === currentStep && styles.progressDotActive,
                index < currentStep && styles.progressDotCompleted,
              ]}
            />
          ))}
        </View>
        <Text style={styles.stepIndicator}>
          Step {currentStep + 1} of {STEPS.length}
        </Text>
      </View>

      {renderStep()}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.buttonRow}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentStep(currentStep - 1)}
            >
              <ChevronLeft size={20} color={Colors.text.primary} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.nextButton,
              !canProceed() && styles.nextButtonDisabled,
              currentStep === 0 && styles.nextButtonFull,
            ]}
            onPress={handleNext}
            disabled={!canProceed()}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === STEPS.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            {currentStep < STEPS.length - 1 && (
              <ChevronRight size={20} color={Colors.neutral.white} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  splashTagline: {
    fontSize: 16,
    color: Colors.text.secondary,
    fontWeight: '500' as const,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border.light,
  },
  progressDotActive: {
    backgroundColor: Colors.primary.blue,
  },
  progressDotCompleted: {
    backgroundColor: Colors.primary.blue,
  },
  stepIndicator: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500' as const,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 12,
  },
  dietOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border.light,
  },
  dietOptionSelected: {
    backgroundColor: Colors.primary.blue,
    borderColor: Colors.primary.blue,
  },
  dietOptionContent: {
    flex: 1,
  },
  dietOptionLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  dietOptionLabelSelected: {
    color: Colors.neutral.white,
  },
  dietOptionDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  dietOptionDescriptionSelected: {
    color: Colors.neutral.white,
    opacity: 0.9,
  },
  inputCard: {
    backgroundColor: Colors.background.card,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  input: {
    flex: 1,
    fontSize: 48,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    padding: 0,
  },
  inputHint: {
    fontSize: 14,
    color: Colors.text.tertiary,
    marginTop: 12,
  },
  targetWeightHint: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 8,
    fontStyle: 'italic' as const,
  },
  textInput: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    padding: 16,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
  },
  heightInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  heightInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heightInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  heightLabel: {
    fontSize: 18,
    fontWeight: '500' as const,
    color: Colors.text.secondary,
    marginLeft: 8,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
  },
  genderButtonSelected: {
    backgroundColor: Colors.primary.blue,
  },
  genderButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  genderButtonTextSelected: {
    color: Colors.neutral.white,
  },
  goalButtons: {
    gap: 8,
  },
  goalButton: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
  },
  goalButtonSelected: {
    backgroundColor: Colors.primary.blue,
  },
  goalButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  goalButtonTextSelected: {
    color: Colors.neutral.white,
  },
  calorieCard: {
    backgroundColor: Colors.primary.lightBlue,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  calorieLabel: {
    fontSize: 14,
    color: Colors.primary.darkBlue,
    marginBottom: 8,
  },
  calorieValue: {
    fontSize: 40,
    fontWeight: '700' as const,
    color: Colors.primary.darkBlue,
    marginBottom: 8,
  },
  calorieHint: {
    fontSize: 13,
    color: Colors.primary.darkBlue,
    opacity: 0.8,
    textAlign: 'center',
  },
  customFoodInput: {
    flexDirection: 'row',
    gap: 8,
  },
  customInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
    padding: 14,
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
  },
  addButton: {
    backgroundColor: Colors.primary.blue,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.neutral.white,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  foodChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  foodChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  foodChipSelected: {
    backgroundColor: Colors.primary.lightBlue,
    borderColor: Colors.primary.blue,
  },
  foodChipText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text.secondary,
  },
  foodChipTextSelected: {
    color: Colors.primary.darkBlue,
    fontWeight: '600' as const,
  },
  selectedSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  selectedChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.primary.blue,
  },
  selectedChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.neutral.white,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: Colors.background.card,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: Colors.primary.blue,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary.blue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.neutral.white,
  },
});
