import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { UserProfile, BudgetEntry } from '../constants/types';

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  dietaryPreferences: [],
  healthConditions: [],
  allergens: [],
  dailyCalorieGoal: 2000,
  weeklyBudget: 100,
  favoriteFoods: [],
  onboardingCompleted: false,
};

export const [AppProvider, useApp] = createContextHook(() => {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [budgetEntries, setBudgetEntries] = useState<BudgetEntry[]>([]);

  const profileQuery = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('userProfile');
      return stored ? JSON.parse(stored) : DEFAULT_PROFILE;
    },
  });

  const budgetQuery = useQuery({
    queryKey: ['budgetEntries'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem('budgetEntries');
      return stored ? JSON.parse(stored) : [];
    },
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (newProfile: UserProfile) => {
      await AsyncStorage.setItem('userProfile', JSON.stringify(newProfile));
      return newProfile;
    },
    onSuccess: (data) => {
      setProfile(data);
    },
  });
  const { mutate: mutateProfile } = saveProfileMutation;

  const saveBudgetMutation = useMutation({
    mutationFn: async (entries: BudgetEntry[]) => {
      await AsyncStorage.setItem('budgetEntries', JSON.stringify(entries));
      return entries;
    },
    onSuccess: (data) => {
      setBudgetEntries(data);
    },
  });
  const { mutate: mutateBudget } = saveBudgetMutation;

  useEffect(() => {
    if (profileQuery.data) {
      setProfile(profileQuery.data);
    }
  }, [profileQuery.data]);

  useEffect(() => {
    if (budgetQuery.data) {
      setBudgetEntries(budgetQuery.data);
    }
  }, [budgetQuery.data]);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    const newProfile = { ...profile, ...updates };
    mutateProfile(newProfile);
  }, [profile, mutateProfile]);

  const addBudgetEntry = useCallback((entry: Omit<BudgetEntry, 'id' | 'date'>) => {
    const newEntry: BudgetEntry = {
      ...entry,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };
    const updated = [...budgetEntries, newEntry];
    mutateBudget(updated);
  }, [budgetEntries, mutateBudget]);
  
  const removeBudgetEntry = useCallback((entryId: string) => {
    const updated = budgetEntries.filter(entry => entry.id !== entryId);
    mutateBudget(updated);
  }, [budgetEntries, mutateBudget]);

  const clearBudgetEntries = useCallback(() => {
    mutateBudget([]);
  }, [mutateBudget]);

  const weeklySpent = useMemo(() => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    return budgetEntries
      .filter((entry) => new Date(entry.date) >= weekStart)
      .reduce((sum, entry) => sum + entry.price, 0);
  }, [budgetEntries]);

  const completeOnboarding = useCallback((profileData: Partial<UserProfile>) => {
    const newProfile = { ...profile, ...profileData, onboardingCompleted: true };
    mutateProfile(newProfile);
  }, [profile, mutateProfile]);

  return useMemo(() => ({
    profile,
    updateProfile,
    completeOnboarding,
    budgetEntries,
    addBudgetEntry,
    removeBudgetEntry,
    clearBudgetEntries,
    weeklySpent,
    isLoading: profileQuery.isLoading || budgetQuery.isLoading,
    isSaving: saveProfileMutation.isPending || saveBudgetMutation.isPending,
  }), [
    profile,
    updateProfile,
    completeOnboarding,
    budgetEntries,
    addBudgetEntry,
    removeBudgetEntry,
    clearBudgetEntries,
    weeklySpent,
    profileQuery.isLoading,
    budgetQuery.isLoading,
    saveProfileMutation.isPending,
    saveBudgetMutation.isPending,
  ]);
});
