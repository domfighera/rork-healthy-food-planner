import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Animated,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Search as SearchIcon,
  X,
  TrendingUp,
  AlertTriangle,
  Check,
  BookmarkPlus,
  ShoppingCart,
  Trash2,
  PencilLine,
  Heart,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { generateText } from '@rork-ai/toolkit-sdk';
import { useApp } from '../../contexts/AppContext';
import { useMealPlan } from '../../contexts/MealPlanContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import Colors from '../../constants/colors';
import type { FavoriteItem } from '../../constants/types';

interface GeneratedFoodItem {
  name: string;
  brand: string;
  price: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  saturatedFat?: number;
  ingredientStatement?: string;
  warnings?: string[];
  benefits?: string[];
}

interface SearchResult {
  name: string;
  brand: string;
  price: number;
  healthScore: number;
  calories: number;
  protein: number;
  warnings: string[];
  benefits: string[];
  alternatives?: string[];
  fdcId?: number;
  carbs?: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  saturatedFat?: number;
  ingredientStatement?: string;
}

type PendingAction =
  | { type: 'search-add-budget'; item: SearchResult }
  | { type: 'search-add-favorite'; item: SearchResult }
  | { type: 'favorite-add-budget'; item: FavoriteItem }
  | { type: 'favorite-update'; item: FavoriteItem };

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');
  const [activeSegment, setActiveSegment] = useState<'search' | 'favorites'>('search');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [priceInput, setPriceInput] = useState<string>('');
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const insets = useSafeAreaInsets();
  const { addBudgetEntry, profile, weeklySpent } = useApp();
  const { addToInventory } = useMealPlan();
  const { favorites, isLoading: favoritesLoading, addFavorite, updateFavorite, removeFavorite } = useFavorites();
  const [showAddedNotification, setShowAddedNotification] = useState<boolean>(false);
  const [notificationMessage, setNotificationMessage] = useState<string>('');
  const [fadeAnim] = useState(() => new Animated.Value(0));

  const searchQuery$ = useQuery({
    queryKey: ['foodSearch', activeSearch],
    queryFn: async () => {
      if (!activeSearch.trim()) return [] as SearchResult[];

      console.log('Generating AI food search for:', activeSearch);

      try {
        const prompt = `You are a nutrition specialist for American grocery shoppers. The user is searching for "${activeSearch}". Return ONLY a JSON array (no markdown) of 6 unique products from well-known US grocery brands that best match the query. Each item MUST:
- use plain English names that US shoppers recognize
- belong to established American brands sold nationwide
- include only real-world branded products (no generics, no foreign brands)

Each JSON object must have:
{
  "name": "Product name",
  "brand": "Brand name",
  "price": 4.99,
  "calories": 190,
  "protein": 12,
  "carbs": 20,
  "fat": 7,
  "fiber": 3,
  "sugar": 8,
  "sodium": 320,
  "saturatedFat": 3,
  "ingredientStatement": "comma-separated ingredients",
  "warnings": ["optional health warning"],
  "benefits": ["optional benefit"]
}
- price must be a realistic US price in dollars as a number (no symbols)
- calories, protein, carbs, fat, fiber, sugar in grams
- sodium in milligrams
- ingredientStatement should describe the primary ingredients in English
- warnings and benefits should each be arrays (can be empty)
Return ONLY the JSON array.`;

        const response = await generateText({
          messages: [{ role: 'user', content: prompt }],
        });

        const jsonMatch = response.match(/\[[\s\S]*\]/);

        if (!jsonMatch) {
          console.error('Failed to parse AI food search response:', response);
          throw new Error('Unable to generate search results');
        }

        const parsed = JSON.parse(jsonMatch[0]) as GeneratedFoodItem[];
        console.log('AI food search raw results:', parsed);

        if (!Array.isArray(parsed) || parsed.length === 0) {
          return [] as SearchResult[];
        }

        const trimmed = parsed.slice(0, 10);

        const enrichedResults = await Promise.all(
          trimmed.map(async (item) => {
            const calories = Number.isFinite(Number(item.calories)) ? Number(item.calories) : 0;
            const protein = Number.isFinite(Number(item.protein)) ? Number(item.protein) : 0;
            const carbs = Number.isFinite(Number(item.carbs)) ? Number(item.carbs) : 0;
            const fat = Number.isFinite(Number(item.fat)) ? Number(item.fat) : 0;
            const fiber = Number.isFinite(Number(item.fiber)) ? Number(item.fiber) : 0;
            const sugar = Number.isFinite(Number(item.sugar)) ? Number(item.sugar) : 0;
            const sodium = Number.isFinite(Number(item.sodium)) ? Number(item.sodium) : 0;
            const saturatedFat = Number.isFinite(Number(item.saturatedFat)) ? Number(item.saturatedFat) : 0;
            const priceCandidate = Number.isFinite(Number(item.price)) ? Number(item.price) : 0;
            const price = priceCandidate > 0 ? priceCandidate : 4.99;
            const ingredients = (item.ingredientStatement || '').toLowerCase();

            const dangerousIngredients = [
              { name: 'sucralose', severity: 50 },
              { name: 'aspartame', severity: 50 },
              { name: 'acesulfame', severity: 45 },
              { name: 'acesulfame-k', severity: 45 },
              { name: 'red 40', severity: 50 },
              { name: 'red dye 40', severity: 50 },
              { name: 'yellow 5', severity: 45 },
              { name: 'yellow 6', severity: 45 },
              { name: 'blue 1', severity: 40 },
              { name: 'blue 2', severity: 40 },
              { name: 'caramel color', severity: 35 },
              { name: 'tartrazine', severity: 45 },
              { name: 'sunset yellow', severity: 45 },
              { name: 'tbhq', severity: 48 },
              { name: 'bha', severity: 48 },
              { name: 'bht', severity: 48 },
              { name: 'high fructose corn syrup', severity: 25 },
              { name: 'corn syrup', severity: 20 },
              { name: 'partially hydrogenated', severity: 50 },
              { name: 'trans fat', severity: 50 },
              { name: 'monosodium glutamate', severity: 30 },
              { name: 'msg', severity: 30 },
              { name: 'sodium benzoate', severity: 25 },
              { name: 'potassium bromate', severity: 50 },
              { name: 'propyl gallate', severity: 35 },
              { name: 'sodium nitrite', severity: 40 },
              { name: 'sodium nitrate', severity: 38 },
              { name: 'artificial flavor', severity: 30 },
              { name: 'artificial flavoring', severity: 30 },
              { name: 'carrageenan', severity: 28 },
              { name: 'polysorbate', severity: 32 },
            ];

            let artificialPenalty = 0;
            const foundBadIngredients: string[] = [];

            dangerousIngredients.forEach(({ name, severity }) => {
              if (ingredients.includes(name)) {
                artificialPenalty += severity;
                foundBadIngredients.push(name);
              }
            });

            const baseScore = Math.max(
              0,
              Math.min(
                100,
                100 - (sugar / 50) * 20 - (sodium / 2300) * 20 - (saturatedFat / 20) * 15 - (fat / 78) * 10 + (fiber / 30) * 15 + (protein / 50) * 10,
              ),
            );

            const healthScore = Math.round(Math.max(0, baseScore - artificialPenalty));

            const warningsSet = new Set<string>((item.warnings || []).map((warning) => warning));
            const benefitsSet = new Set<string>((item.benefits || []).map((benefit) => benefit));

            if (sugar > 15) warningsSet.add('High in sugar');
            if (sodium > 400) warningsSet.add('High in sodium');
            if (saturatedFat > 5) warningsSet.add('High in saturated fat');
            if (foundBadIngredients.length > 0) {
              warningsSet.add(`Contains: ${foundBadIngredients.slice(0, 2).join(', ')}`);
            }
            if (protein > 10) benefitsSet.add('Good protein source');
            if (fiber > 5) benefitsSet.add('High fiber');
            if (foundBadIngredients.length === 0 && !ingredients.includes('artificial')) {
              benefitsSet.add('No artificial ingredients');
            }

            const result: SearchResult = {
              name: item.name,
              brand: item.brand,
              price,
              healthScore,
              calories: Math.round(calories),
              protein: Math.round(protein * 10) / 10,
              carbs: Math.round((carbs ?? 0) * 10) / 10,
              fat: Math.round(fat * 10) / 10,
              fiber: Math.round((fiber ?? 0) * 10) / 10,
              sugar: Math.round((sugar ?? 0) * 10) / 10,
              sodium: Math.round(sodium),
              saturatedFat: Math.round((saturatedFat ?? 0) * 10) / 10,
              warnings: Array.from(warningsSet),
              benefits: Array.from(benefitsSet),
              ingredientStatement: item.ingredientStatement,
            };

            if (healthScore < 60) {
              try {
                const altPrompt = `For this product: "${item.brand} ${item.name}", suggest 2-3 healthier brand alternatives available in US grocery stores. Return as a simple JSON array of strings. For example: ["Brand A Product", "Brand B Product"]`;
                const altText = await generateText({
                  messages: [{ role: 'user', content: altPrompt }],
                });
                const altMatch = altText.match(/\[.*?\]/s);
                if (altMatch) {
                  result.alternatives = JSON.parse(altMatch[0]);
                }
              } catch {
                console.log('Alternatives generation failed');
              }
            }

            return result;
          }),
        );

        console.log('Enriched food search results:', enrichedResults.length);
        return enrichedResults;
      } catch (error: unknown) {
        console.error('Food search error:', error);
        throw error instanceof Error ? error : new Error('Failed to generate search results');
      }
    },
    enabled: activeSearch.length > 0,
    staleTime: 1000 * 60 * 10,
    retry: 1,
    retryDelay: 500,
  });

  const popularSearches = [
    'Organic eggs',
    'Greek yogurt',
    'Almond milk',
    'Protein bars',
    'Whole wheat bread',
    'Fresh salmon',
  ];

  const favoritesIsEmpty = !favoritesLoading && favorites.length === 0;

  const actionTitle = useMemo(() => {
    switch (pendingAction?.type) {
      case 'search-add-budget':
        return 'Set Item Price';
      case 'search-add-favorite':
        return 'Save to Favorites';
      case 'favorite-add-budget':
        return 'Quick Add to Budget';
      case 'favorite-update':
        return 'Update Favorite Price';
      default:
        return '';
    }
  }, [pendingAction]);

  const actionSubtitle = useMemo(() => {
    switch (pendingAction?.type) {
      case 'search-add-budget':
        return 'Adjust the price before tracking this item in your budget.';
      case 'search-add-favorite':
        return 'Choose the default price to save with this favorite item.';
      case 'favorite-add-budget':
        return 'Confirm the price before adding this favorite to your weekly budget.';
      case 'favorite-update':
        return 'Update the stored price for this favorite item.';
      default:
        return '';
    }
  }, [pendingAction]);

  const actionConfirmLabel = useMemo(() => {
    switch (pendingAction?.type) {
      case 'search-add-budget':
      case 'favorite-add-budget':
        return 'Add to Budget';
      case 'search-add-favorite':
        return 'Save Favorite';
      case 'favorite-update':
        return 'Save Changes';
      default:
        return 'Confirm';
    }
  }, [pendingAction]);

  const pendingItemLabel = useMemo(() => {
    if (!pendingAction) return '';
    if (pendingAction.type === 'search-add-budget' || pendingAction.type === 'search-add-favorite') {
      return `${pendingAction.item.brand} ${pendingAction.item.name}`.trim();
    }
    return `${pendingAction.item.brand} ${pendingAction.item.name}`.trim();
  }, [pendingAction]);

  const triggerNotification = (message: string) => {
    setNotificationMessage(message);
    fadeAnim.stopAnimation(() => {
      fadeAnim.setValue(0);
      setShowAddedNotification(true);
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowAddedNotification(false);
      });
    });
  };

  const handleSearch = () => {
    setActiveSearch(searchQuery);
  };

  const openActionModal = (action: PendingAction, initialPrice: number) => {
    setPendingAction(action);
    setPriceInput(initialPrice.toFixed(2));
  };

  const closeActionModal = () => {
    if (isProcessingAction) return;
    setPendingAction(null);
    setPriceInput('');
  };

  const proceedWithAdd = async (item: SearchResult, price: number) => {
    addBudgetEntry({
      productCode: `ai-food-${Date.now()}`,
      productName: `${item.brand} ${item.name}`,
      price,
    });

    try {
      const prompt = `Based on this product: "${item.brand} ${item.name}", determine:
1. How many servings are in a typical package?
2. What is the serving size?

Return ONLY a JSON object:
{
  "servingsPerContainer": 12,
  "servingSize": "1 bar (40g)"
}`;

      const response = await generateText({
        messages: [{ role: 'user', content: prompt }],
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      let servingsPerContainer = 1;
      let servingSize = '1 serving';

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        servingsPerContainer = parsed.servingsPerContainer || 1;
        servingSize = parsed.servingSize || '1 serving';
      }

      addToInventory({
        name: item.name,
        brand: item.brand,
        totalQuantity: servingsPerContainer,
        servingSize,
        servingsPerContainer,
        nutrition: {
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs || 0,
          fat: item.fat,
          fiber: item.fiber || 0,
          sugar: item.sugar || 0,
          sodium: (item.sodium || 0) / 1000,
          saturatedFat: item.saturatedFat || 0,
        },
        price,
      });
    } catch (error) {
      console.error('Error adding to inventory:', error);
    }

    triggerNotification('Added to budget!');
  };

  const finalizeSearchAdd = async (item: SearchResult, priceValue: number) => {
    setIsProcessingAction(true);
    try {
      await proceedWithAdd(item, priceValue);
      closeActionModal();
    } catch (error) {
      console.error('Finalize search add failed', error);
      Alert.alert('Error', 'Unable to add this item right now. Please try again.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const finalizeFavoriteBudgetAdd = async (item: FavoriteItem, priceValue: number) => {
    setIsProcessingAction(true);
    try {
      addBudgetEntry({
        productCode: `favorite-${item.id}`,
        productName: `${item.brand} ${item.name}`.trim(),
        price: priceValue,
      });
      triggerNotification('Favorite added to budget!');
      closeActionModal();
    } catch (error) {
      console.error('Finalize favorite add failed', error);
      Alert.alert('Error', 'Unable to add this favorite right now. Please try again.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const finalizeSaveFavorite = async (item: SearchResult, priceValue: number) => {
    setIsProcessingAction(true);
    try {
      await addFavorite({
        name: item.name,
        brand: item.brand,
        price: priceValue,
      });
      triggerNotification('Saved to favorites!');
      setActiveSegment('favorites');
      closeActionModal();
    } catch (error) {
      console.error('Save favorite failed', error);
      Alert.alert('Error', 'Unable to save favorite right now. Please try again.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const finalizeUpdateFavorite = async (item: FavoriteItem, priceValue: number) => {
    setIsProcessingAction(true);
    try {
      await updateFavorite({ id: item.id, price: priceValue });
      triggerNotification('Favorite updated!');
      closeActionModal();
    } catch (error) {
      console.error('Update favorite failed', error);
      Alert.alert('Error', 'Unable to update favorite right now. Please try again.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleConfirmAction = () => {
    if (!pendingAction) {
      return;
    }

    const priceValue = Number.parseFloat(priceInput);
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      Alert.alert('Invalid Price', 'Enter a valid price greater than zero.');
      return;
    }

    if (pendingAction.type === 'search-add-budget') {
      const newTotal = weeklySpent + priceValue;
      if (newTotal > profile.weeklyBudget) {
        Alert.alert(
          'Over Budget',
          `Adding this item ($${priceValue.toFixed(2)}) will exceed your weekly budget by $${(newTotal - profile.weeklyBudget).toFixed(2)}. Do you want to add it anyway?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Add Anyway',
              onPress: () => finalizeSearchAdd(pendingAction.item, priceValue),
            },
          ],
        );
        return;
      }

      void finalizeSearchAdd(pendingAction.item, priceValue);
      return;
    }

    if (pendingAction.type === 'favorite-add-budget') {
      const newTotal = weeklySpent + priceValue;
      if (newTotal > profile.weeklyBudget) {
        Alert.alert(
          'Over Budget',
          `Adding this favorite ($${priceValue.toFixed(2)}) will exceed your weekly budget by $${(newTotal - profile.weeklyBudget).toFixed(2)}. Do you want to add it anyway?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Add Anyway',
              onPress: () => finalizeFavoriteBudgetAdd(pendingAction.item, priceValue),
            },
          ],
        );
        return;
      }

      void finalizeFavoriteBudgetAdd(pendingAction.item, priceValue);
      return;
    }

    if (pendingAction.type === 'search-add-favorite') {
      void finalizeSaveFavorite(pendingAction.item, priceValue);
      return;
    }

    if (pendingAction.type === 'favorite-update') {
      void finalizeUpdateFavorite(pendingAction.item, priceValue);
    }
  };

  const handleRemoveFavorite = (favorite: FavoriteItem) => {
    Alert.alert(
      'Remove Favorite',
      `Remove "${favorite.name}" from favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFavorite(favorite.id);
              triggerNotification('Favorite removed');
            } catch (error) {
              console.error('Remove favorite failed', error);
              Alert.alert('Error', 'Unable to remove favorite right now. Please try again.');
            }
          },
        },
      ],
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return Colors.health.excellent;
    if (score >= 60) return Colors.health.good;
    if (score >= 40) return Colors.health.fair;
    if (score >= 20) return Colors.health.poor;
    return Colors.health.bad;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    if (score >= 20) return 'Poor';
    return 'Bad';
  };

  const renderSearchResults = () => {
    if (searchQuery$.isLoading) {
      return (
        <View testID="search-loading" style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.blue} />
          <Text style={styles.loadingText}>Building American grocery matches...</Text>
        </View>
      );
    }

    if (searchQuery$.isError) {
      return (
        <View testID="search-error" style={styles.errorContainer}>
          <AlertTriangle size={48} color={Colors.health.bad} />
          <Text style={styles.errorText}>Search Failed</Text>
          <Text style={styles.errorSubtext}>
            {searchQuery$.error?.message || 'Unable to search. Please check your connection and try again.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => searchQuery$.refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (searchQuery$.data && searchQuery$.data.length > 0) {
      return (
        <View testID="search-results-section" style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>Found {searchQuery$.data.length} products</Text>
          {searchQuery$.data.map((item, index) => {
            const scoreColor = getScoreColor(item.healthScore);
            const scoreLabel = getScoreLabel(item.healthScore);
            const meetsRestrictions = profile.dietaryPreferences.every((pref) => {
              if (pref === 'vegan' && (item.name.toLowerCase().includes('milk') || item.name.toLowerCase().includes('cheese') || item.name.toLowerCase().includes('egg'))) {
                return false;
              }
              if (pref === 'vegetarian' && (item.name.toLowerCase().includes('chicken') || item.name.toLowerCase().includes('beef') || item.name.toLowerCase().includes('pork'))) {
                return false;
              }
              if (pref === 'gluten-free' && item.name.toLowerCase().includes('wheat')) {
                return false;
              }
              return true;
            });

            return (
              <View key={`${item.name}-${index}`} style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    <Text style={styles.resultBrand}>{item.brand}</Text>
                  </View>
                  <View style={styles.resultPrice}>
                    <Text style={styles.priceAmount}>${item.price.toFixed(2)}</Text>
                  </View>
                </View>

                <View style={styles.scoreRow}>
                  <View style={[styles.scoreChip, { backgroundColor: scoreColor }]}> 
                    <Text style={styles.scoreChipText}>{scoreLabel} ({item.healthScore})</Text>
                  </View>
                  {!meetsRestrictions && (
                    <View style={styles.restrictionBadge}>
                      <AlertTriangle size={12} color={Colors.health.bad} />
                      <Text style={styles.restrictionText}>Not for your diet</Text>
                    </View>
                  )}
                </View>

                <View style={styles.nutritionRow}>
                  <Text style={styles.nutritionItem}>{item.calories} cal</Text>
                  <Text style={styles.nutritionItem}>{item.protein}g protein</Text>
                  {typeof item.carbs === 'number' && (
                    <Text style={styles.nutritionItem}>{item.carbs}g carbs</Text>
                  )}
                </View>

                {item.warnings && item.warnings.length > 0 && (
                  <View style={styles.warningsRow}>
                    {item.warnings.map((warning, warnIndex) => (
                      <View key={warnIndex} style={styles.warningChip}>
                        <Text style={styles.warningChipText}>{warning}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {item.benefits && item.benefits.length > 0 && (
                  <View style={styles.benefitsRow}>
                    {item.benefits.map((benefit, benefitIndex) => (
                      <View key={benefitIndex} style={styles.benefitChip}>
                        <Text style={styles.benefitChipText}>{benefit}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {item.alternatives && item.alternatives.length > 0 && (
                  <View style={styles.alternativesSection}>
                    <View style={styles.alternativesHeader}>
                      <TrendingUp size={14} color={Colors.primary.blue} />
                      <Text style={styles.alternativesTitle}>Healthier alternatives:</Text>
                    </View>
                    {item.alternatives.map((alt, altIndex) => (
                      <Text key={altIndex} style={styles.alternativeText}>• {alt}</Text>
                    ))}
                  </View>
                )}

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonPrimary]}
                    onPress={() => openActionModal({ type: 'search-add-budget', item }, item.price)}
                  >
                    <ShoppingCart size={18} color={Colors.neutral.white} />
                    <Text style={styles.actionButtonTextPrimary}>Add to Budget</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonSecondary]}
                    onPress={() => openActionModal({ type: 'search-add-favorite', item }, item.price)}
                  >
                    <BookmarkPlus size={18} color={Colors.primary.darkBlue} />
                    <Text style={styles.actionButtonTextSecondary}>Save Favorite</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      );
    }

    if (activeSearch && !searchQuery$.isLoading) {
      return (
        <View style={styles.emptyState}>
          <SearchIcon size={48} color={Colors.neutral.lightGray} />
          <Text style={styles.emptyText}>No products found</Text>
          <Text style={styles.emptySubtext}>Try a different search term</Text>
        </View>
      );
    }

    return null;
  };

  const renderFavorites = () => {
    if (favoritesLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.blue} />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      );
    }

    if (favoritesIsEmpty) {
      return (
        <View style={styles.emptyFavorites}>
          <Heart size={56} color={Colors.primary.blue} />
          <Text style={styles.emptyFavoritesTitle}>No favorites yet</Text>
          <Text style={styles.emptyFavoritesSubtitle}>
            Save items from the search tab to build your personalized favorites list.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.favoritesList}>
        {favorites.map((favorite) => (
          <View key={favorite.id} style={styles.favoriteCard}>
            <View style={styles.favoriteHeader}>
              <View style={styles.favoriteInfo}>
                <Text style={styles.favoriteName}>{favorite.name}</Text>
                <Text style={styles.favoriteBrand}>{favorite.brand}</Text>
              </View>
              <Text style={styles.favoritePrice}>${favorite.price.toFixed(2)}</Text>
            </View>
            <View style={styles.favoriteActions}>
              <TouchableOpacity
                style={[styles.favoriteActionButton, styles.favoritePrimaryButton]}
                onPress={() => openActionModal({ type: 'favorite-add-budget', item: favorite }, favorite.price)}
              >
                <ShoppingCart size={18} color={Colors.neutral.white} />
                <Text style={styles.favoriteActionTextPrimary}>Quick Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.favoriteActionButton}
                onPress={() => openActionModal({ type: 'favorite-update', item: favorite }, favorite.price)}
              >
                <PencilLine size={18} color={Colors.primary.darkBlue} />
                <Text style={styles.favoriteActionTextSecondary}>Edit Price</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.favoriteRemoveButton}
                onPress={() => handleRemoveFavorite(favorite)}
              >
                <Trash2 size={18} color={Colors.health.bad} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}> 
      <StatusBar barStyle="dark-content" />
      {showAddedNotification && (
        <Animated.View
          style={[
            styles.addedNotification,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Check size={20} color={Colors.neutral.white} />
          <Text style={styles.addedNotificationText}>{notificationMessage}</Text>
        </Animated.View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Search Foods</Text>
          <Text style={styles.subtitle}>
            Discover trusted American brands with tailored nutrition insights
          </Text>
        </View>

        <View style={styles.segmentControl}>
          <TouchableOpacity
            style={[styles.segmentButton, activeSegment === 'search' && styles.segmentButtonActive]}
            onPress={() => setActiveSegment('search')}
          >
            <Text style={[styles.segmentLabel, activeSegment === 'search' && styles.segmentLabelActive]}>Search</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentButton, activeSegment === 'favorites' && styles.segmentButtonActive]}
            onPress={() => setActiveSegment('favorites')}
          >
            <Text style={[styles.segmentLabel, activeSegment === 'favorites' && styles.segmentLabelActive]}>Favorites</Text>
          </TouchableOpacity>
        </View>

        {activeSegment === 'search' ? (
          <>
            <View style={styles.searchContainer}>
              <SearchIcon size={20} color={Colors.text.secondary} />
              <TextInput
                testID="search-input"
                style={styles.searchInput}
                placeholder="Search for products..."
                placeholderTextColor={Colors.text.light}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setActiveSearch('');
                  }}
                >
                  <X size={20} color={Colors.text.secondary} />
                </TouchableOpacity>
              )}
            </View>

            {searchQuery && !activeSearch && (
              <TouchableOpacity testID="search-trigger-button" style={styles.searchButton} onPress={handleSearch}>
                <Text style={styles.searchButtonText}>Search</Text>
              </TouchableOpacity>
            )}

            {renderSearchResults()}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Popular Searches</Text>
              <View style={styles.tagsContainer}>
                {popularSearches.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.tag}
                    onPress={() => {
                      setSearchQuery(tag);
                      setActiveSearch(tag);
                    }}
                  >
                    <Text style={styles.tagText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {!activeSearch && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>How to Use</Text>
                <View style={styles.instructionCard}>
                  <View style={styles.instructionStep}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>1</Text>
                    </View>
                    <Text style={styles.instructionText}>
                      Search for any food product or brand name
                    </Text>
                  </View>
                  <View style={styles.instructionStep}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <Text style={styles.instructionText}>
                      See health scores, prices, and detailed nutrition
                    </Text>
                  </View>
                  <View style={styles.instructionStep}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>3</Text>
                    </View>
                    <Text style={styles.instructionText}>
                      Add items to your budget and track spending
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.favoritesSection}>
            <Text style={styles.favoritesIntroTitle}>Pinned favorites</Text>
            <Text style={styles.favoritesIntroSubtitle}>
              Save frequently purchased foods with custom prices for instant access.
            </Text>
            {renderFavorites()}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!pendingAction}
        transparent
        animationType="fade"
        onRequestClose={closeActionModal}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={closeActionModal}
          disabled={isProcessingAction}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{actionTitle}</Text>
            {pendingItemLabel.length > 0 && (
              <Text style={styles.modalItemLabel}>{pendingItemLabel}</Text>
            )}
            {actionSubtitle.length > 0 && (
              <Text style={styles.modalSubtitle}>{actionSubtitle}</Text>
            )}
            <Text style={styles.modalFieldLabel}>Price (USD)</Text>
            <TextInput
              style={styles.modalInput}
              value={priceInput}
              onChangeText={setPriceInput}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={Colors.text.light}
              editable={!isProcessingAction}
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={closeActionModal}
                disabled={isProcessingAction}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, isProcessingAction && styles.modalConfirmButtonDisabled]}
                onPress={handleConfirmAction}
                disabled={isProcessingAction}
              >
                {isProcessingAction ? (
                  <ActivityIndicator color={Colors.neutral.white} />
                ) : (
                  <Text style={styles.modalConfirmText}>{actionConfirmLabel}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  segmentControl: {
    flexDirection: 'row',
    marginHorizontal: 24,
    backgroundColor: Colors.background.secondary,
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  segmentButtonActive: {
    backgroundColor: Colors.neutral.white,
    shadowColor: '#1B365D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  segmentLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  segmentLabelActive: {
    color: Colors.text.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    marginHorizontal: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  searchButton: {
    backgroundColor: Colors.primary.blue,
    marginHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.neutral.white,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  resultsSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  resultCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  resultInfo: {
    flex: 1,
    marginRight: 12,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  resultBrand: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  resultPrice: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.primary.blue,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  scoreChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.neutral.white,
  },
  restrictionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
  },
  restrictionText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.health.bad,
  },
  nutritionRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  nutritionItem: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  warningsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  warningChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  warningChipText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.health.bad,
  },
  benefitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  benefitChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.primary.lightBlue,
    borderRadius: 8,
  },
  benefitChipText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.primary.darkBlue,
  },
  alternativesSection: {
    backgroundColor: Colors.primary.lightBlue,
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  alternativesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  alternativesTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary.darkBlue,
  },
  alternativeText: {
    fontSize: 12,
    color: Colors.primary.darkBlue,
    marginTop: 4,
    paddingLeft: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  actionButtonPrimary: {
    backgroundColor: Colors.primary.blue,
    borderColor: Colors.primary.blue,
  },
  actionButtonSecondary: {
    backgroundColor: Colors.background.secondary,
    borderColor: Colors.border.light,
  },
  actionButtonTextPrimary: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.neutral.white,
  },
  actionButtonTextSecondary: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary.darkBlue,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.light,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    backgroundColor: Colors.primary.lightBlue,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.primary.darkBlue,
  },
  instructionCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border.light,
    gap: 20,
  },
  instructionStep: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary.blue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.neutral.white,
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.secondary,
    lineHeight: 22,
    paddingTop: 4,
  },
  favoritesSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  favoritesIntroTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  favoritesIntroSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  favoritesList: {
    gap: 16,
  },
  favoriteCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  favoriteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  favoriteInfo: {
    flex: 1,
    marginRight: 12,
  },
  favoriteName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  favoriteBrand: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  favoritePrice: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.primary.blue,
  },
  favoriteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  favoriteActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    backgroundColor: Colors.background.secondary,
    flex: 1,
  },
  favoritePrimaryButton: {
    backgroundColor: Colors.primary.blue,
    borderColor: Colors.primary.blue,
  },
  favoriteActionTextPrimary: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.neutral.white,
  },
  favoriteActionTextSecondary: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary.darkBlue,
  },
  favoriteRemoveButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
  },
  emptyFavorites: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  emptyFavoritesTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  emptyFavoritesSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  addedNotification: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    marginHorizontal: 24,
    backgroundColor: Colors.primary.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addedNotificationText: {
    color: Colors.neutral.white,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.health.bad,
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary.blue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.neutral.white,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  modalItemLabel: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  modalFieldLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  modalInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary.blue,
  },
  modalConfirmButtonDisabled: {
    opacity: 0.7,
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.neutral.white,
  },
});
