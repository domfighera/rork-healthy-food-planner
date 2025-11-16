import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  Flame,
  RefreshCw,
  Scale,
  AlertTriangle,
  CheckCircle,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMealPlan } from '../../contexts/MealPlanContext';
import { useApp } from '../../contexts/AppContext';
import Colors from '../../constants/colors';
import type { IngredientSeverity, BadIngredient } from '../../constants/types';

export default function HealthScreen() {
  const insets = useSafeAreaInsets();
  const { 
    groceryInventory,
    calculateHealthScore,
    isCalculatingHealthScore,
    healthScore,
    weightHistory,
    addWeightEntry,
    getWeeklyTrends,
  } = useMealPlan();
  const { profile } = useApp();

  const [showWeightModal, setShowWeightModal] = useState<boolean>(false);
  const [newWeight, setNewWeight] = useState<string>('');
  const [showIngredientDetail, setShowIngredientDetail] = useState<BadIngredient | null>(null);
  const [caloriesBurned] = useState<number>(0);
  const [isHealthKitAvailable, setIsHealthKitAvailable] = useState<boolean>(false);

  const weeklyTrends = useMemo(() => getWeeklyTrends(), [getWeeklyTrends]);

  useEffect(() => {
    setIsHealthKitAvailable(Platform.OS === 'ios');
  }, []);

  const handleCalculateHealthScore = () => {
    if (groceryInventory.length === 0) {
      Alert.alert(
        'No Groceries Found',
        'Please add items to your budget first to calculate your health score.',
        [{ text: 'OK' }]
      );
      return;
    }

    calculateHealthScore({ profile });
  };

  const handleAddWeight = () => {
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight.');
      return;
    }
    addWeightEntry(weight);
    setNewWeight('');
    setShowWeightModal(false);
    Alert.alert('Success', 'Weight logged successfully!');
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

  const getSeverityColor = (severity: IngredientSeverity) => {
    switch (severity) {
      case 'excellent': return '#10b981';
      case 'good': return '#3b82f6';
      case 'moderate': return '#f59e0b';
      case 'concerning': return '#ef4444';
      case 'avoid': return '#dc2626';
      default: return Colors.neutral.gray;
    }
  };

  const getSeverityIcon = (severity: IngredientSeverity) => {
    switch (severity) {
      case 'excellent': return <CheckCircle size={20} color="#10b981" />;
      case 'good': return <CheckCircle size={20} color="#3b82f6" />;
      case 'moderate': return <AlertCircle size={20} color="#f59e0b" />;
      case 'concerning': return <AlertTriangle size={20} color="#ef4444" />;
      case 'avoid': return <AlertTriangle size={20} color="#dc2626" />;
      default: return <AlertCircle size={20} color={Colors.neutral.gray} />;
    }
  };

  const currentWeight = weightHistory.length > 0 ? weightHistory[0].weight : profile.weight || 0;
  const weightChange = useMemo(() => {
    if (weightHistory.length < 2) return 0;
    return weightHistory[0].weight - weightHistory[weightHistory.length - 1].weight;
  }, [weightHistory]);

  const predictedWeeklyChange = useMemo(() => {
    if (weeklyTrends.length < 2) return 0;
    const recent = weeklyTrends[weeklyTrends.length - 1];
    const previous = weeklyTrends[weeklyTrends.length - 2];
    if (!recent.averageWeight || !previous.averageWeight) return 0;
    return recent.averageWeight - previous.averageWeight;
  }, [weeklyTrends]);

  const sortedBadIngredients = useMemo(() => {
    if (!healthScore?.badIngredients) return [];
    const severityOrder: Record<IngredientSeverity, number> = {
      avoid: 0,
      concerning: 1,
      moderate: 2,
      good: 3,
      excellent: 4,
    };
    return [...healthScore.badIngredients].sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );
  }, [healthScore]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Health Dashboard</Text>
          <Text style={styles.subtitle}>
            Track your nutrition and progress
          </Text>
        </View>

        {profile.weight && profile.targetWeight && profile.weightGoal !== 'maintain' && (
          <View style={styles.weightGoalCard}>
            <View style={styles.weightGoalHeader}>
              <Scale size={20} color={Colors.primary.green} />
              <Text style={styles.weightGoalTitle}>Weight Goal</Text>
            </View>
            <View style={styles.weightGoalContent}>
              <View style={styles.weightColumn}>
                <Text style={styles.weightLabel}>Current</Text>
                <Text style={styles.weightValue}>{currentWeight.toFixed(1)} lbs</Text>
              </View>
              <View style={styles.weightArrow}>
                <Text style={styles.weightArrowText}>→</Text>
              </View>
              <View style={styles.weightColumn}>
                <Text style={styles.weightLabel}>Target</Text>
                <Text style={styles.weightValue}>{profile.targetWeight.toFixed(1)} lbs</Text>
              </View>
            </View>
            {weightChange !== 0 && (
              <View style={styles.weightProgress}>
                <Text style={styles.weightProgressText}>
                  {weightChange < 0 ? 'Gained' : 'Lost'} {Math.abs(weightChange).toFixed(1)} lbs so far
                </Text>
              </View>
            )}
          </View>
        )}

        {isHealthKitAvailable && (
          <View style={styles.healthKitCard}>
            <View style={styles.healthKitHeader}>
              <Activity size={20} color={Colors.primary.blue} />
              <Text style={styles.healthKitTitle}>Apple Health Integration</Text>
            </View>
            <Text style={styles.healthKitDescription}>
              Connect to Apple Health to automatically track calories burned, steps, heart rate, and sync health metrics.
            </Text>
            <TouchableOpacity
              style={styles.healthKitButton}
              onPress={() => {
                Alert.alert(
                  'Apple Health Integration',
                  'Connecting to Apple Health requires a custom build with HealthKit enabled. This feature is not available in Expo Go.\n\nOnce connected, it will:\n• Track calories burned and subtract from daily calories\n• Monitor steps and activity\n• Track blood glucose for diabetes management\n• Monitor blood pressure for heart health\n• Sync weight data automatically',
                  [{ text: 'Got it' }]
                );
              }}
            >
              <Text style={styles.healthKitButtonText}>Connect to Apple Health</Text>
            </TouchableOpacity>
            {caloriesBurned > 0 && (
              <View style={styles.caloriesBurnedCard}>
                <Flame size={18} color={Colors.primary.orange} />
                <View style={styles.caloriesBurnedInfo}>
                  <Text style={styles.caloriesBurnedLabel}>Calories Burned Today</Text>
                  <Text style={styles.caloriesBurnedValue}>{caloriesBurned} cal</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {profile.healthConditions && profile.healthConditions.length > 0 && (
          <View style={styles.healthConditionsCard}>
            <View style={styles.healthConditionsHeader}>
              <AlertCircle size={20} color={Colors.primary.orange} />
              <Text style={styles.healthConditionsTitle}>Health Condition Tracking</Text>
            </View>
            {profile.healthConditions.includes('diabetes') && (
              <View style={styles.conditionItem}>
                <View style={styles.conditionHeader}>
                  <Text style={styles.conditionName}>Diabetes Management</Text>
                </View>
                <Text style={styles.conditionDescription}>
                  Your health score accounts for sugar intake limits. Products with high sugar or artificial sweeteners are heavily penalized.
                </Text>
                <View style={styles.conditionMetrics}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Daily Sugar Limit</Text>
                    <Text style={styles.metricValue}>{profile.gender === 'male' ? '36g' : '25g'}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Blood Glucose</Text>
                    <Text style={styles.metricValue}>Connect Health App</Text>
                  </View>
                </View>
              </View>
            )}
            {(profile.healthConditions.includes('hypertension') || profile.healthConditions.includes('heart-disease')) && (
              <View style={styles.conditionItem}>
                <View style={styles.conditionHeader}>
                  <Text style={styles.conditionName}>Heart Health</Text>
                </View>
                <Text style={styles.conditionDescription}>
                  Your health score prioritizes low sodium and saturated fat. Trans fats are extremely penalized.
                </Text>
                <View style={styles.conditionMetrics}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Sodium Limit</Text>
                    <Text style={styles.metricValue}>2,300mg</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Blood Pressure</Text>
                    <Text style={styles.metricValue}>Connect Health App</Text>
                  </View>
                </View>
              </View>
            )}
            {profile.healthConditions.includes('kidney-disease') && (
              <View style={styles.conditionItem}>
                <View style={styles.conditionHeader}>
                  <Text style={styles.conditionName}>Kidney Health</Text>
                </View>
                <Text style={styles.conditionDescription}>
                  Your health score emphasizes low sodium and monitors protein intake appropriate for kidney function.
                </Text>
                <View style={styles.conditionMetrics}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Sodium Limit</Text>
                    <Text style={styles.metricValue}>2,000mg</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Protein</Text>
                    <Text style={styles.metricValue}>Monitored</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {healthScore ? (
          <>
            <View style={styles.healthScoreCard}>
              <View style={styles.healthScoreHeader}>
                <Activity size={24} color={getScoreColor(healthScore.overall)} />
                <Text style={styles.healthScoreTitle}>Overall Health Score</Text>
              </View>
              <View style={styles.healthScoreMain}>
                <Text style={[styles.healthScoreValue, { color: getScoreColor(healthScore.overall) }]}>
                  {healthScore.overall}
                </Text>
                <Text style={styles.healthScoreLabel}>
                  {getScoreLabel(healthScore.overall)}
                </Text>
              </View>
              
              <View style={styles.healthCategories}>
                {Object.entries(healthScore.categories).map(([key, data]) => (
                  <View key={key} style={styles.categoryItem}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryName}>
                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                      </Text>
                      <View style={[styles.categoryBadge, { backgroundColor: getScoreColor(data.score) }]}>
                        <Text style={styles.categoryScore}>{data.score}</Text>
                      </View>
                    </View>
                    <Text style={styles.categoryMessage}>{data.message}</Text>
                  </View>
                ))}
              </View>

              {healthScore.recommendations.length > 0 && (
                <View style={styles.recommendationsSection}>
                  <Text style={styles.recommendationsTitle}>Recommendations</Text>
                  {healthScore.recommendations.map((rec, i) => (
                    <View key={i} style={styles.recommendationItem}>
                      <TrendingUp size={14} color={Colors.primary.green} />
                      <Text style={styles.recommendationText}>{rec}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {sortedBadIngredients.length > 0 && (
              <View style={styles.badIngredientsCard}>
                <View style={styles.processedFoodsHeader}>
                  <AlertTriangle size={24} color={Colors.primary.orange} />
                  <View style={styles.processedFoodsHeaderText}>
                    <Text style={styles.sectionTitle}>Processed Foods in Your Diet</Text>
                    <Text style={styles.sectionSubtitle}>
                      Found {sortedBadIngredients.length} concerning ingredients in your groceries
                    </Text>
                  </View>
                </View>
                {sortedBadIngredients.map((ingredient, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.ingredientItem,
                      { borderLeftColor: getSeverityColor(ingredient.severity) }
                    ]}
                    onPress={() => setShowIngredientDetail(ingredient)}
                  >
                    <View style={styles.ingredientHeader}>
                      {getSeverityIcon(ingredient.severity)}
                      <View style={styles.ingredientInfo}>
                        <Text style={styles.ingredientName}>{ingredient.name}</Text>
                        <Text 
                          style={[
                            styles.ingredientSeverity,
                            { color: getSeverityColor(ingredient.severity) }
                          ]}
                        >
                          {ingredient.severity.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.ingredientReason} numberOfLines={2}>
                      {ingredient.reason}
                    </Text>
                    <Text style={styles.ingredientFound}>
                      Found in: {ingredient.foundIn.slice(0, 2).join(', ')}
                      {ingredient.foundIn.length > 2 && ` +${ingredient.foundIn.length - 2} more`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {weeklyTrends.length > 0 && weeklyTrends.some(t => t.averageHealthScore > 0) && (
              <View style={styles.trendsCard}>
                <Text style={styles.sectionTitle}>Weekly Health Trends</Text>
                <Text style={styles.sectionSubtitle}>
                  Your health progress over the past weeks
                </Text>
                
                {weeklyTrends.map((trend, index) => {
                  if (trend.averageHealthScore === 0) return null;
                  const weekStart = new Date(trend.weekStart);
                  const weekEnd = new Date(trend.weekEnd);
                  const prevTrend = index > 0 ? weeklyTrends[index - 1] : null;
                  const scoreDiff = prevTrend 
                    ? trend.averageHealthScore - prevTrend.averageHealthScore 
                    : 0;
                  
                  return (
                    <View key={index} style={styles.trendItem}>
                      <View style={styles.trendHeader}>
                        <Text style={styles.trendDate}>
                          {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                        {scoreDiff !== 0 && (
                          <View style={styles.trendChange}>
                            {scoreDiff > 0 ? (
                              <TrendingUp size={14} color={Colors.health.excellent} />
                            ) : (
                              <TrendingDown size={14} color={Colors.health.bad} />
                            )}
                            <Text 
                              style={[
                                styles.trendChangeText,
                                { color: scoreDiff > 0 ? Colors.health.excellent : Colors.health.bad }
                              ]}
                            >
                              {scoreDiff > 0 ? '+' : ''}{scoreDiff}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.trendStats}>
                        <View style={styles.trendStat}>
                          <Text style={styles.trendStatLabel}>Health Score</Text>
                          <Text style={[styles.trendStatValue, { color: getScoreColor(trend.averageHealthScore) }]}>
                            {trend.averageHealthScore}
                          </Text>
                        </View>
                        {trend.averageWeight > 0 && (
                          <View style={styles.trendStat}>
                            <Text style={styles.trendStatLabel}>Avg Weight</Text>
                            <Text style={styles.trendStatValue}>
                              {trend.averageWeight} lbs
                            </Text>
                          </View>
                        )}
                        <View style={styles.trendStat}>
                          <Text style={styles.trendStatLabel}>Meals</Text>
                          <Text style={styles.trendStatValue}>
                            {trend.mealsCompleted}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {predictedWeeklyChange !== 0 && (
                  <View style={styles.predictionCard}>
                    <Text style={styles.predictionTitle}>Weight Trend</Text>
                    <Text style={styles.predictionText}>
                      Based on your current progress, you&apos;re {predictedWeeklyChange > 0 ? 'gaining' : 'losing'} approximately{' '}
                      <Text style={styles.predictionValue}>
                        {Math.abs(predictedWeeklyChange).toFixed(1)} lbs per week
                      </Text>
                    </Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.recalculateButton}
              onPress={handleCalculateHealthScore}
              disabled={isCalculatingHealthScore}
            >
              {isCalculatingHealthScore ? (
                <ActivityIndicator color={Colors.primary.green} />
              ) : (
                <>
                  <RefreshCw size={18} color={Colors.primary.green} />
                  <Text style={styles.recalculateButtonText}>
                    Recalculate Health Score
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Activity size={64} color={Colors.neutral.lightGray} />
            <Text style={styles.emptyTitle}>No Health Score Yet</Text>
            <Text style={styles.emptyText}>
              {groceryInventory.length === 0
                ? 'Add groceries to your budget to calculate your health score'
                : `Calculate your health score using your ${groceryInventory.length} grocery items`}
            </Text>

            <TouchableOpacity
              style={[styles.calculateButton, groceryInventory.length === 0 && styles.calculateButtonDisabled]}
              onPress={handleCalculateHealthScore}
              disabled={isCalculatingHealthScore || groceryInventory.length === 0}
            >
              {isCalculatingHealthScore ? (
                <ActivityIndicator color={Colors.neutral.white} />
              ) : (
                <>
                  <Flame size={20} color={Colors.neutral.white} />
                  <Text style={styles.calculateButtonText}>Calculate Health Score</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoCard}>
          <AlertCircle size={20} color={Colors.primary.green} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoText}>
              Your health score analyzes nutritional content, identifies harmful ingredients, 
              and tracks your progress over time. Scores are personalized to your dietary preferences 
              and health conditions.
            </Text>
          </View>
        </View>

        <View style={styles.healthSyncCard}>
          <Activity size={20} color={Colors.primary.blue} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: Colors.primary.blue }]}>Health Tracking</Text>
            <Text style={[styles.infoText, { color: Colors.text.secondary }]}>
              Track your weight manually using the Log Today&apos;s Weight button above. 
              For automatic syncing with Apple Health or Google Fit, this requires a custom build 
              (not available in Expo Go).
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showWeightModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWeightModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Your Weight</Text>
              <TouchableOpacity onPress={() => setShowWeightModal(false)}>
                <X size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>Weight (lbs)</Text>
            <TextInput
              style={styles.modalInput}
              value={newWeight}
              onChangeText={setNewWeight}
              keyboardType="decimal-pad"
              placeholder={currentWeight.toString()}
              placeholderTextColor={Colors.text.tertiary}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.modalButton, !newWeight && styles.modalButtonDisabled]}
              onPress={handleAddWeight}
              disabled={!newWeight}
            >
              <Text style={styles.modalButtonText}>Log Weight</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!showIngredientDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setShowIngredientDetail(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            {showIngredientDetail && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.detailModalHeader}>
                    {getSeverityIcon(showIngredientDetail.severity)}
                    <Text style={styles.detailModalTitle}>
                      {showIngredientDetail.name}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowIngredientDetail(null)}>
                    <X size={24} color={Colors.text.secondary} />
                  </TouchableOpacity>
                </View>

                <View 
                  style={[
                    styles.severityBadge,
                    { backgroundColor: getSeverityColor(showIngredientDetail.severity) }
                  ]}
                >
                  <Text style={styles.severityBadgeText}>
                    {showIngredientDetail.severity.toUpperCase()}
                  </Text>
                </View>

                <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                  <Text style={styles.detailSectionTitle}>Why It&apos;s Concerning</Text>
                  <Text style={styles.detailText}>{showIngredientDetail.reason}</Text>

                  <Text style={styles.detailSectionTitle}>Health Impact</Text>
                  <Text style={styles.detailText}>{showIngredientDetail.healthImpact}</Text>

                  <Text style={styles.detailSectionTitle}>Found In</Text>
                  {showIngredientDetail.foundIn.map((product, i) => (
                    <View key={i} style={styles.productChip}>
                      <Text style={styles.productChipText}>{product}</Text>
                    </View>
                  ))}

                  {showIngredientDetail.alternatives.length > 0 && (
                    <>
                      <Text style={styles.detailSectionTitle}>Healthier Alternatives</Text>
                      {showIngredientDetail.alternatives.map((alt, i) => (
                        <View key={i} style={styles.alternativeItem}>
                          <CheckCircle size={16} color={Colors.health.excellent} />
                          <Text style={styles.alternativeText}>{alt}</Text>
                        </View>
                      ))}
                    </>
                  )}
                </ScrollView>
              </>
            )}
          </View>
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
  weightGoalCard: {
    backgroundColor: Colors.background.card,
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border.light,
    marginBottom: 16,
  },
  weightGoalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  weightGoalTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  weightGoalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  weightColumn: {
    alignItems: 'center',
  },
  weightLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  weightValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  weightArrow: {
    marginHorizontal: 16,
  },
  weightArrowText: {
    fontSize: 24,
    color: Colors.text.secondary,
  },
  weightProgress: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.primary.lightGreen,
    borderRadius: 8,
  },
  weightProgressText: {
    fontSize: 13,
    color: Colors.primary.darkGreen,
    textAlign: 'center',
    fontWeight: '500' as const,
  },
  healthKitCard: {
    backgroundColor: '#E3F2FD',
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BBDEFB',
    marginBottom: 16,
  },
  healthKitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  healthKitTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primary.blue,
  },
  healthKitDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  healthKitButton: {
    backgroundColor: Colors.primary.blue,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  healthKitButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.neutral.white,
  },
  caloriesBurnedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: 14,
    backgroundColor: Colors.background.card,
    borderRadius: 12,
  },
  caloriesBurnedInfo: {
    flex: 1,
  },
  caloriesBurnedLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  caloriesBurnedValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  healthConditionsCard: {
    backgroundColor: Colors.background.card,
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border.light,
    marginBottom: 16,
  },
  healthConditionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  healthConditionsTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  conditionItem: {
    backgroundColor: Colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  conditionHeader: {
    marginBottom: 8,
  },
  conditionName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  conditionDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  conditionMetrics: {
    flexDirection: 'row',
    gap: 12,
  },
  metricItem: {
    flex: 1,
    backgroundColor: Colors.background.card,
    padding: 12,
    borderRadius: 10,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  processedFoodsHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  processedFoodsHeaderText: {
    flex: 1,
  },
  healthScoreCard: {
    backgroundColor: Colors.background.card,
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border.light,
    marginBottom: 16,
  },
  healthScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  healthScoreTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  healthScoreMain: {
    alignItems: 'center',
    marginBottom: 20,
  },
  healthScoreValue: {
    fontSize: 56,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  healthScoreLabel: {
    fontSize: 16,
    color: Colors.text.secondary,
    fontWeight: '500' as const,
  },
  healthCategories: {
    gap: 12,
    marginBottom: 20,
  },
  categoryItem: {
    backgroundColor: Colors.background.secondary,
    padding: 12,
    borderRadius: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryScore: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.neutral.white,
  },
  categoryMessage: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  recommendationsSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingTop: 16,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  badIngredientsCard: {
    backgroundColor: Colors.background.card,
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border.light,
    marginBottom: 16,
  },
  ingredientItem: {
    backgroundColor: Colors.background.secondary,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  ingredientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  ingredientInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  ingredientSeverity: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  ingredientReason: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  ingredientFound: {
    fontSize: 12,
    color: Colors.text.tertiary,
    fontStyle: 'italic' as const,
  },
  trendsCard: {
    backgroundColor: Colors.background.card,
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border.light,
    marginBottom: 16,
  },
  trendItem: {
    backgroundColor: Colors.background.secondary,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  trendDate: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  trendChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendChangeText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  trendStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  trendStat: {
    alignItems: 'center',
  },
  trendStatLabel: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  trendStatValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  predictionCard: {
    backgroundColor: Colors.primary.lightGreen,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  predictionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary.darkGreen,
    marginBottom: 6,
  },
  predictionText: {
    fontSize: 13,
    color: Colors.primary.darkGreen,
    lineHeight: 18,
  },
  predictionValue: {
    fontWeight: '700' as const,
  },
  recalculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary.green,
    backgroundColor: Colors.background.primary,
  },
  recalculateButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary.green,
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
  calculateButton: {
    backgroundColor: Colors.primary.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    minWidth: 200,
  },
  calculateButtonDisabled: {
    backgroundColor: Colors.neutral.lightGray,
  },
  calculateButtonText: {
    color: Colors.neutral.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 24,
    marginBottom: 32,
    backgroundColor: Colors.primary.lightGreen,
    padding: 16,
    borderRadius: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary.darkGreen,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: Colors.primary.darkGreen,
    lineHeight: 18,
  },
  healthSyncCard: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 24,
    marginBottom: 40,
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.background.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: Colors.primary.green,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.neutral.white,
  },
  detailModalContent: {
    backgroundColor: Colors.background.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
    marginTop: 'auto',
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  severityBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.neutral.white,
    letterSpacing: 0.5,
  },
  detailScroll: {
    maxHeight: 400,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  productChip: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  productChipText: {
    fontSize: 13,
    color: Colors.text.primary,
  },
  alternativeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  alternativeText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
});
