import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Animated,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, AlertTriangle, CheckCircle, Flame, Wheat, Check, FlaskConical, X } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { useMealPlan } from '../contexts/MealPlanContext';
import Colors from '../constants/colors';
import type { Product } from '../constants/types';
import { generateText } from '@rork-ai/toolkit-sdk';

export default function ProductScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addBudgetEntry, profile, weeklySpent } = useApp();
  const { addToInventory } = useMealPlan();
  const [showAddedNotification, setShowAddedNotification] = useState<boolean>(false);
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [showIngredientAnalysis, setShowIngredientAnalysis] = useState<boolean>(false);
  const [ingredientAnalysis, setIngredientAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const productQuery = useQuery({
    queryKey: ['product', code],
    queryFn: async () => {
      console.log('Fetching product:', code);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      try {
        const response = await fetch(
          `https://world.openfoodfacts.org/api/v2/product/${code}.json`,
          { 
            signal: controller.signal,
            headers: {
              'User-Agent': 'FoodBudgetApp/1.0'
            }
          }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Product data received:', data.status);

      if (data.status === 0 || !data.product) {
        throw new Error('Product not found');
      }

      const product = data.product;
      const nutriments = product.nutriments || {};

      const healthScore = product.nutriscore_grade
        ? (5 - 'abcde'.indexOf(product.nutriscore_grade.toLowerCase())) * 20
        : 50;

      let unitPrice = 3.50;
      try {
        const productInfo = `
          Product: ${product.product_name || 'Unknown'}
          Brand: ${product.brands || 'Unknown'}
          Quantity: ${product.quantity || product.product_quantity_unit || 'Unknown'}
          Serving Size: ${product.serving_size || 'Unknown'}
          Package Size: ${product.product_quantity || 'Unknown'} ${product.product_quantity_unit || ''}
        `.trim();

        const priceEstimate = await generateText({
          messages: [
            {
              role: 'user',
              content: `Based on this product information, estimate the price for ONE UNIT (one bar, one bottle, one serving, etc.) of this product in USD. Return ONLY a number between 0.50 and 20.00, no currency symbols or explanations.\n\n${productInfo}`,
            },
          ],
        });

        const estimatedPrice = parseFloat(priceEstimate.trim().replace(/[^0-9.]/g, ''));
        if (!isNaN(estimatedPrice) && estimatedPrice > 0 && estimatedPrice < 100) {
          unitPrice = estimatedPrice;
        }
      } catch (error) {
        console.error('Error estimating price:', error);
      }

      const result: Product = {
        code: product.code || code,
        name: product.product_name || 'Unknown Product',
        brand: product.brands || 'Unknown Brand',
        image: product.image_url,
        ingredients: product.ingredients_text
          ? product.ingredients_text.split(',').map((i: string) => i.trim())
          : [],
        nutrition: {
          calories: nutriments['energy-kcal_100g'] || 0,
          protein: nutriments.proteins_100g || 0,
          carbs: nutriments.carbohydrates_100g || 0,
          fat: nutriments.fat_100g || 0,
          fiber: nutriments.fiber_100g || 0,
          sugar: nutriments.sugars_100g || 0,
          sodium: nutriments.sodium_100g || 0,
          saturatedFat: nutriments['saturated-fat_100g'] || 0,
        },
        healthScore,
        warnings: [],
        benefits: [],
        estimatedPrice: unitPrice,
      };

      if (nutriments.sugars_100g > 15) {
        result.warnings.push('High in sugar');
      }
      if (nutriments.sodium_100g > 1) {
        result.warnings.push('High in sodium');
      }
      if (nutriments['saturated-fat_100g'] > 5) {
        result.warnings.push('High in saturated fat');
      }

      if (nutriments.fiber_100g > 3) {
        result.benefits.push('Good source of fiber');
      }
      if (nutriments.proteins_100g > 10) {
        result.benefits.push('High in protein');
      }

      return result;
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Error fetching product:', error);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw error;
      }
    },
    enabled: !!code,
    staleTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: 1000,
  });

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

  const handleAddToBudget = async () => {
    if (productQuery.data) {
      const product = productQuery.data;
      const itemPrice = product.estimatedPrice || 5;
      const newTotal = weeklySpent + itemPrice;
      
      if (newTotal > profile.weeklyBudget) {
        Alert.alert(
          'Over Budget',
          `Adding this item (${itemPrice.toFixed(2)}) will exceed your weekly budget by ${(newTotal - profile.weeklyBudget).toFixed(2)}. Do you want to add it anyway?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Add Anyway',
              onPress: () => proceedWithAdd(product, itemPrice)
            }
          ]
        );
        return;
      }
      
      proceedWithAdd(product, itemPrice);
    }
  };
  
  const proceedWithAdd = async (product: Product, itemPrice: number) => {
      addBudgetEntry({
        productCode: product.code,
        productName: product.name,
        price: itemPrice,
        nutrition: product.nutrition,
      });

      try {
        const prompt = `Based on this product information, determine:
1. How many servings are in this package/container?
2. What is a realistic serving size?

Product: ${product.name}
Brand: ${product.brand}

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
          name: product.name,
          brand: product.brand,
          totalQuantity: servingsPerContainer,
          servingSize: servingSize,
          servingsPerContainer: servingsPerContainer,
          nutrition: product.nutrition,
          price: product.estimatedPrice || 5,
        });
      } catch (error) {
        console.error('Error adding to inventory:', error);
      }

      setShowAddedNotification(true);
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowAddedNotification(false);
        setTimeout(() => {
          router.back();
        }, 100);
      });
  };

  if (productQuery.isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary.green} />
          <Text style={styles.loadingText}>Loading product info...</Text>
        </View>
      </View>
    );
  }

  if (productQuery.isError || !productQuery.data) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorContainer}>
          <AlertTriangle size={64} color={Colors.health.poor} />
          <Text style={styles.errorTitle}>Product Not Found</Text>
          <Text style={styles.errorText}>
            We could not find this product in our database. Try scanning a different barcode.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const product = productQuery.data;
  const scoreColor = getScoreColor(product.healthScore);
  const scoreLabel = getScoreLabel(product.healthScore);

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
          <Check size={24} color={Colors.neutral.white} />
          <Text style={styles.addedNotificationText}>Added to budget!</Text>
        </Animated.View>
      )}
      <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
        <ArrowLeft size={24} color={Colors.text.primary} />
      </TouchableOpacity>

      <ScrollView style={styles.content}>
        {product.image && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: product.image }} style={styles.productImage} contentFit="contain" />
          </View>
        )}

        <View style={styles.mainInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productBrand}>{product.brand}</Text>

          <View style={[styles.scoreCard, { borderColor: scoreColor }]}>
            <View style={styles.scoreHeader}>
              <View style={[styles.scoreCircle, { backgroundColor: scoreColor }]}>
                <Text style={styles.scoreNumber}>{product.healthScore}</Text>
              </View>
              <View style={styles.scoreInfo}>
                <Text style={styles.scoreLabel}>{scoreLabel}</Text>
                <Text style={styles.scoreSublabel}>Health Score</Text>
              </View>
            </View>
          </View>

          {product.warnings.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AlertTriangle size={20} color={Colors.health.poor} />
                <Text style={styles.sectionTitle}>Warnings</Text>
              </View>
              <View style={styles.tagsList}>
                {product.warnings.map((warning, index) => (
                  <View key={index} style={[styles.tag, styles.warningTag]}>
                    <Text style={styles.warningText}>{warning}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {product.benefits.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <CheckCircle size={20} color={Colors.primary.green} />
                <Text style={styles.sectionTitle}>Benefits</Text>
              </View>
              <View style={styles.tagsList}>
                {product.benefits.map((benefit, index) => (
                  <View key={index} style={[styles.tag, styles.benefitTag]}>
                    <Text style={styles.benefitText}>{benefit}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Flame size={20} color={Colors.accent.orange} />
              <Text style={styles.sectionTitle}>Nutrition Facts (per 100g)</Text>
            </View>
            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{Math.round(product.nutrition.calories)}</Text>
                <Text style={styles.nutritionLabel}>Calories</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{product.nutrition.protein.toFixed(1)}g</Text>
                <Text style={styles.nutritionLabel}>Protein</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{product.nutrition.carbs.toFixed(1)}g</Text>
                <Text style={styles.nutritionLabel}>Carbs</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{product.nutrition.fat.toFixed(1)}g</Text>
                <Text style={styles.nutritionLabel}>Fat</Text>
              </View>
            </View>
          </View>

          {product.ingredients.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Wheat size={20} color={Colors.primary.teal} />
                <Text style={styles.sectionTitle}>Ingredients</Text>
              </View>
              <Text style={styles.ingredientsText}>
                {product.ingredients.slice(0, 10).join(', ')}
                {product.ingredients.length > 10 && '...'}
              </Text>
              <TouchableOpacity
                style={styles.analyzeButton}
                onPress={async () => {
                  setShowIngredientAnalysis(true);
                  setIsAnalyzing(true);
                  try {
                    const prompt = `Analyze these food ingredients for harmful or processed chemicals:

${product.ingredients.join(', ')}

For each problematic ingredient, provide:
1. Name of ingredient
2. Why it's concerning (preservative, artificial color, seed oil, etc.)
3. Potential health issues it can cause

Focus on: artificial preservatives, seed oils, artificial colors, high fructose corn syrup, trans fats, sodium nitrite, BHA/BHT, artificial sweeteners, MSG.

Return in this format:
**[Ingredient Name]**
Type: [e.g., Artificial Preservative]
Concerns: [Brief description of health issues]

If no problematic ingredients found, say "No concerning ingredients detected."`;

                    const analysis = await generateText({
                      messages: [{ role: 'user', content: prompt }],
                    });
                    setIngredientAnalysis(analysis);
                  } catch {
                    setIngredientAnalysis('Failed to analyze ingredients. Please try again.');
                  } finally {
                    setIsAnalyzing(false);
                  }
                }}
              >
                <FlaskConical size={18} color={Colors.primary.darkGreen} />
                <Text style={styles.analyzeButtonText}>Analyze Ingredients</Text>
              </TouchableOpacity>
            </View>
          )}

          {product.estimatedPrice && (
            <View style={styles.priceCard}>
              <Text style={styles.priceLabel}>Estimated Price</Text>
              <Text style={styles.priceValue}>${product.estimatedPrice.toFixed(2)}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddToBudget}>
          <Text style={styles.addButtonText}>Add to Budget</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showIngredientAnalysis}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowIngredientAnalysis(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ingredient Analysis</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowIngredientAnalysis(false)}
            >
              <X size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {isAnalyzing ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary.green} />
                <Text style={styles.modalLoadingText}>Analyzing ingredients...</Text>
              </View>
            ) : (
              <Text style={styles.analysisText}>{ingredientAnalysis}</Text>
            )}
          </ScrollView>
        </View>
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
  headerButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  errorText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  backButton: {
    backgroundColor: Colors.primary.green,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  backButtonText: {
    color: Colors.neutral.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  mainInfo: {
    padding: 24,
  },
  productName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  productBrand: {
    fontSize: 18,
    color: Colors.text.secondary,
    marginBottom: 24,
  },
  scoreCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 3,
    marginBottom: 24,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.neutral.white,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  scoreSublabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  warningTag: {
    backgroundColor: '#FFEBEE',
  },
  warningText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.health.bad,
  },
  benefitTag: {
    backgroundColor: Colors.primary.lightGreen,
  },
  benefitText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.primary.darkGreen,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nutritionItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  ingredientsText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  priceCard: {
    backgroundColor: Colors.primary.lightGreen,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: Colors.primary.darkGreen,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.primary.darkGreen,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  addButton: {
    backgroundColor: Colors.primary.green,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: Colors.neutral.white,
    fontSize: 18,
    fontWeight: '600' as const,
  },
  addedNotification: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    marginHorizontal: 24,
    backgroundColor: Colors.primary.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 10,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addedNotificationText: {
    color: Colors.neutral.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary.lightGreen,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  analyzeButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary.darkGreen,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  modalLoadingText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  analysisText: {
    fontSize: 15,
    color: Colors.text.primary,
    lineHeight: 24,
    paddingBottom: 40,
  },
});
