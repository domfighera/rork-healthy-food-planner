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
  ActivityIndicator,
} from 'react-native';
import { Heart, AlertCircle, DollarSign, Target, RotateCcw, RefreshCw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { useMealPlan } from '../contexts/MealPlanContext';
import { useRouter } from 'expo-router';
import Colors from '../constants/colors';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const {
    profile,
    updateProfile,
    clearBudgetEntries,
    mergePreviousWeekGroceries,
    isMergingPreviousWeek,
    mergePreviousWeekError,
  } = useApp();
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

  const handleMergePreviousWeek = () => {
    mergePreviousWeekGroceries()
      .then((added) => {
        if (added === 0) {
          Alert.alert('Nothing to Merge', 'No groceries from the previous week were found.');
          return;
        }
        Alert.alert('Groceries Added', `Added ${added} item${added === 1 ? '' : 's'} from last week.`);
      })
      .catch(() => {
        Alert.alert('Merge Failed', 'Unable to merge previous week right now. Please try again.');
      });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}> 
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              onPress={() => {
                console.log('ProfileScreen: closing profile view');
                router.back();
              }}
              style={styles.closeButton}
              testID="profile-close-button"
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
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
                const value = parseInt(text, 10) || 0;
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
          <View style={styles.mergeCard}>
            <View style={styles.mergeInfo}>
              <View style={styles.mergeHeader}>
                <RefreshCw size={18} color={Colors.primary.blue} />
                <Text style={styles.mergeTitle}>Bring Back Last Week</Text>
              </View>
              <Text style={styles.mergeSubtitle}>
                Merge your previous week&apos;s grocery list into this week and keep your staples stocked.
              </Text>
              {mergePreviousWeekError && !isMergingPreviousWeek && (
                <Text style={styles.mergeErrorText}>Unable to merge last week&apos;s groceries. Try again.</Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.mergeButton, isMergingPreviousWeek && styles.mergeButtonDisabled]}
              onPress={handleMergePreviousWeek}
              disabled={isMergingPreviousWeek}
            >
              {isMergingPreviousWeek ? (
                <ActivityIndicator color={Colors.neutral.white} />
              ) : (
                <Text style={styles.mergeButtonText}>Merge Now</Text>
              )}
            </TouchableOpacity>
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
    marginTop: 16,
    marginBottom: 32,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  closeButton: {
    backgroundColor: Colors.primary.blue,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.neutral.white,
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
  mergeCard: {
    marginTop: 20,
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
    padding: 16,
    gap: 16,
  },
  mergeInfo: {
    gap: 8,
  },
  mergeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mergeTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  mergeSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  mergeErrorText: {
    fontSize: 12,
    color: Colors.health.bad,
  },
  mergeButton: {
    backgroundColor: Colors.primary.blue,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mergeButtonDisabled: {
    opacity: 0.7,
  },
  mergeButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.neutral.white,
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
