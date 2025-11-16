import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
} from 'react-native';
import { Heart, AlertCircle, DollarSign, Target, RotateCcw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../contexts/AppContext';
import { useMealPlan } from '../../contexts/MealPlanContext';
import { useRouter } from 'expo-router';
import Colors from '../../constants/colors';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, clearBudgetEntries } = useApp();
  const { clearAllData } = useMealPlan();
  const router = useRouter();

  const dietaryOptions = [
    { value: 'vegetarian' as const, label: 'Vegetarian' },
    { value: 'vegan' as const, label: 'Vegan' },
    { value: 'keto' as const, label: 'Keto' },
    { value: 'paleo' as const, label: 'Paleo' },
    { value: 'gluten-free' as const, label: 'Gluten-Free' },
    { value: 'dairy-free' as const, label: 'Dairy-Free' },
  ];

  const healthConditions = [
    { value: 'diabetes' as const, label: 'Diabetes' },
    { value: 'hypertension' as const, label: 'Hypertension' },
    { value: 'heart-disease' as const, label: 'Heart Disease' },
    { value: 'kidney-disease' as const, label: 'Kidney Disease' },
  ];

  const toggleDiet = (diet: typeof dietaryOptions[0]['value']) => {
    const current = profile.dietaryPreferences;
    const updated = current.includes(diet)
      ? current.filter((d) => d !== diet)
      : [...current, diet];
    updateProfile({ dietaryPreferences: updated });
  };

  const toggleCondition = (condition: typeof healthConditions[0]['value']) => {
    const current = profile.healthConditions;
    const updated = current.includes(condition)
      ? current.filter((c) => c !== condition)
      : [...current, condition];
    updateProfile({ healthConditions: updated });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>
            Personalize your health and budget preferences
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Target size={20} color={Colors.primary.green} />
            <Text style={styles.sectionTitle}>Daily Calorie Goal</Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={profile.dailyCalorieGoal.toString()}
              onChangeText={(text) => {
                const value = parseInt(text) || 0;
                updateProfile({ dailyCalorieGoal: value });
              }}
            />
            <Text style={styles.inputSuffix}>cal/day</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DollarSign size={20} color={Colors.primary.green} />
            <Text style={styles.sectionTitle}>Weekly Food Budget</Text>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputPrefix}>$</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={profile.weeklyBudget.toString()}
              onChangeText={(text) => {
                const value = parseFloat(text) || 0;
                updateProfile({ weeklyBudget: value });
              }}
            />
            <Text style={styles.inputSuffix}>/week</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Heart size={20} color={Colors.primary.green} />
            <Text style={styles.sectionTitle}>Dietary Preferences</Text>
          </View>
          <View style={styles.optionsGrid}>
            {dietaryOptions.map((option) => {
              const isSelected = profile.dietaryPreferences.includes(option.value);
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.optionChip, isSelected && styles.optionChipSelected]}
                  onPress={() => toggleDiet(option.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AlertCircle size={20} color={Colors.primary.green} />
            <Text style={styles.sectionTitle}>Health Conditions</Text>
          </View>
          <View style={styles.optionsGrid}>
            {healthConditions.map((option) => {
              const isSelected = profile.healthConditions.includes(option.value);
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.optionChip, isSelected && styles.optionChipSelected]}
                  onPress={() => toggleCondition(option.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Your preferences help us provide personalized health scores and recommendations
            tailored to your dietary needs and budget.
          </Text>
        </View>

        <View style={styles.dangerSection}>
          <Text style={styles.dangerSectionTitle}>Reset App Data</Text>
          <Text style={styles.dangerSectionText}>
            This will clear all your data including groceries, meal plans, budget entries, and preferences. You&apos;ll need to complete onboarding again.
          </Text>
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={() => {
              Alert.alert(
                'Reset All Data',
                'Are you sure you want to reset all data? This action cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: () => {
                      clearAllData();
                      clearBudgetEntries();
                      updateProfile({ onboardingCompleted: false });
                      router.replace('/onboarding');
                    }
                  }
                ]
              );
            }}
          >
            <RotateCcw size={20} color={Colors.health.bad} />
            <Text style={styles.resetButtonText}>Reset All Data</Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 32,
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
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    paddingVertical: 12,
  },
  inputPrefix: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    marginRight: 4,
  },
  inputSuffix: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 8,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  optionChipSelected: {
    backgroundColor: Colors.primary.green,
    borderColor: Colors.primary.green,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text.primary,
  },
  optionTextSelected: {
    color: Colors.neutral.white,
  },
  infoCard: {
    marginHorizontal: 24,
    marginBottom: 32,
    backgroundColor: Colors.primary.lightGreen,
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.primary.darkGreen,
    lineHeight: 20,
  },
  dangerSection: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  dangerSectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  dangerSectionText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.health.bad,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.health.bad,
  },
});
