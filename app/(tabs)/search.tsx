import React, { useState } from 'react';
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
} from 'react-native';
import { Search as SearchIcon, X, Plus, TrendingUp, AlertTriangle, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { generateText } from '@rork-ai/toolkit-sdk';
import { useApp } from '../../contexts/AppContext';
import { useMealPlan } from '../../contexts/MealPlanContext';
import Colors from '../../constants/colors';

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

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');
  const insets = useSafeAreaInsets();
  const { addBudgetEntry, profile, weeklySpent } = useApp();
  const { addToInventory } = useMealPlan();
  const [showAddedNotification, setShowAddedNotification] = useState<boolean>(false);
  const [notificationMessage, setNotificationMessage] = useState<string>('');
  const [fadeAnim] = useState(() => new Animated.Value(0));

  const searchQuery$ = useQuery({
    queryKey: ['foodSearch', activeSearch],
    queryFn: async () => {
      if (!activeSearch.trim()) return [];

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
          return [];
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

            const baseScore = Math.max(0, Math.min(100,
              100 -
              (sugar / 50 * 20) -
              (sodium / 2300 * 20) -
              (saturatedFat / 20 * 15) -
              (fat / 78 * 10) +
              (fiber / 30 * 15) +
              (protein / 50 * 10)
            ));

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
              carbs: Math.round(carbs * 10) / 10,
              fat: Math.round(fat * 10) / 10,
              fiber: Math.round(fiber * 10) / 10,
              sugar: Math.round(sugar * 10) / 10,
              sodium: Math.round(sodium),
              saturatedFat: Math.round(saturatedFat * 10) / 10,
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
          })
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

  const handleSearch = () => {
    setActiveSearch(searchQuery);
  };

  const handleAddToCart = async (item: SearchResult) => {
    const newTotal = weeklySpent + item.price;
    const overBudget = newTotal > profile.weeklyBudget;

    if (overBudget) {
      Alert.alert(
        'Over Budget',
        `Adding this item ($${item.price.toFixed(2)}) will exceed your weekly budget by $${(newTotal - profile.weeklyBudget).toFixed(2)}. Do you want to add it anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Anyway',
            onPress: () => proceedWithAdd(item)
          }
        ]
      );
      return;
    }

    proceedWithAdd(item);
  };

  const proceedWithAdd = async (item: SearchResult) => {
    addBudgetEntry({
      productCode: `ai-food-${Date.now()}`,
      productName: `${item.brand} ${item.name}`,
      price: item.price,
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
        servingSize: servingSize,
        servingsPerContainer: servingsPerContainer,
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
        price: item.price,
      });
    } catch (error) {
      console.error('Error adding to inventory:', error);
    }

    setNotificationMessage('Added to budget!');
    setShowAddedNotification(true);
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowAddedNotification(false);
    });
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

  const popularSearches = [
    'Organic eggs',
    'Greek yogurt',
    'Almond milk',
    'Protein bars',
    'Whole wheat bread',
    'Fresh salmon',
  ];

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
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Search Foods</Text>
          <Text style={styles.subtitle}>
            Discover trusted American brands with tailored nutrition insights
          </Text>
        </View>

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
            <TouchableOpacity onPress={() => { setSearchQuery(''); setActiveSearch(''); }}>
              <X size={20} color={Colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>

        {searchQuery && !activeSearch && (
          <TouchableOpacity testID="search-trigger-button" style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        )}

        {searchQuery$.isLoading && (
          <View testID="search-loading" style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary.blue} />
            <Text style={styles.loadingText}>Building American grocery matches...</Text>
          </View>
        )}

        {searchQuery$.isError && (
          <View testID="search-error" style={styles.errorContainer}>
            <AlertTriangle size={48} color={Colors.health.bad} />
            <Text style={styles.errorText}>Search Failed</Text>
            <Text style={styles.errorSubtext}>
              {searchQuery$.error?.message || 'Unable to search. Please check your connection and try again.'}
            </Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => searchQuery$.refetch()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {searchQuery$.data && searchQuery$.data.length > 0 && (
          <View testID="search-results-section" style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>
              Found {searchQuery$.data.length} products
            </Text>
            {searchQuery$.data.map((item, index) => {
              const scoreColor = getScoreColor(item.healthScore);
              const scoreLabel = getScoreLabel(item.healthScore);
              const meetsRestrictions = profile.dietaryPreferences.every(pref => {
                if (pref === 'vegan' && (item.name.toLowerCase().includes('milk') || item.name.toLowerCase().includes('cheese') || item.name.toLowerCase().includes('egg'))) return false;
                if (pref === 'vegetarian' && (item.name.toLowerCase().includes('chicken') || item.name.toLowerCase().includes('beef') || item.name.toLowerCase().includes('pork'))) return false;
                if (pref === 'gluten-free' && item.name.toLowerCase().includes('wheat')) return false;
                return true;
              });

              return (
                <View key={index} style={styles.resultCard}>
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
                    {item.carbs !== undefined && (
                      <Text style={styles.nutritionItem}>{item.carbs}g carbs</Text>
                    )}
                  </View>

                  {item.warnings && item.warnings.length > 0 && (
                    <View style={styles.warningsRow}>
                      {item.warnings.map((warning, i) => (
                        <View key={i} style={styles.warningChip}>
                          <Text style={styles.warningChipText}>{warning}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {item.benefits && item.benefits.length > 0 && (
                    <View style={styles.benefitsRow}>
                      {item.benefits.map((benefit, i) => (
                        <View key={i} style={styles.benefitChip}>
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
                      {item.alternatives.map((alt, i) => (
                        <Text key={i} style={styles.alternativeText}>• {alt}</Text>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.addToCartButton}
                    onPress={() => handleAddToCart(item)}
                  >
                    <Plus size={18} color={Colors.neutral.white} />
                    <Text style={styles.addToCartText}>Add to Budget</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {activeSearch && searchQuery$.data?.length === 0 && !searchQuery$.isLoading && (
          <View style={styles.emptyState}>
            <SearchIcon size={48} color={Colors.neutral.lightGray} />
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>Try a different search term</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Searches</Text>
          <View style={styles.tagsContainer}>
            {popularSearches.map((tag, index) => (
              <TouchableOpacity
                key={index}
                style={styles.tag}
                onPress={() => setSearchQuery(tag)}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    marginHorizontal: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    marginBottom: 32,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
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
  addToCartButton: {
    backgroundColor: Colors.primary.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  addToCartText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.neutral.white,
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
});
