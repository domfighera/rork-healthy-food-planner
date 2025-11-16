import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { DollarSign, Plus, X, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../contexts/AppContext';
import Colors from '../../constants/colors';

export default function BudgetScreen() {
  const insets = useSafeAreaInsets();
  const { profile, weeklySpent, budgetEntries, addBudgetEntry, removeBudgetEntry } = useApp();
  const [showManualEntry, setShowManualEntry] = useState<boolean>(false);
  const [manualItemName, setManualItemName] = useState<string>('');
  const [manualItemPrice, setManualItemPrice] = useState<string>('');

  const weeklyBudget = profile.weeklyBudget;
  const remaining = weeklyBudget - weeklySpent;
  const percentUsed = (weeklySpent / weeklyBudget) * 100;
  
  const handleManualEntry = () => {
    if (!manualItemName.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }
    
    const price = parseFloat(manualItemPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }
    
    addBudgetEntry({
      productCode: `manual-${Date.now()}`,
      productName: manualItemName.trim(),
      price: price,
    });
    
    setManualItemName('');
    setManualItemPrice('');
    setShowManualEntry(false);
  };
  
  const handleDeleteEntry = (entryId: string, itemName: string) => {
    Alert.alert(
      'Delete Item',
      `Remove "${itemName}" from your budget?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeBudgetEntry(entryId)
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Weekly Budget</Text>
          <Text style={styles.subtitle}>
            Track your food spending and stay on budget
          </Text>
        </View>

        <View style={styles.budgetCard}>
          <View style={styles.budgetHeader}>
            <DollarSign size={32} color={Colors.primary.green} />
            <Text style={styles.budgetAmount}>${weeklySpent.toFixed(2)}</Text>
          </View>
          <Text style={styles.budgetLabel}>Spent this week</Text>

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(percentUsed, 100)}%`,
                  backgroundColor:
                    percentUsed > 100
                      ? Colors.health.bad
                      : percentUsed > 80
                      ? Colors.health.fair
                      : Colors.primary.green,
                },
              ]}
            />
          </View>

          <View style={styles.budgetStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>${weeklyBudget.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Budget</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  { color: remaining < 0 ? Colors.health.bad : Colors.primary.green },
                ]}
              >
                ${Math.abs(remaining).toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>
                {remaining < 0 ? 'Over Budget' : 'Remaining'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Purchases</Text>
          {budgetEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <DollarSign size={48} color={Colors.neutral.lightGray} />
              <Text style={styles.emptyText}>No purchases yet</Text>
              <Text style={styles.emptySubtext}>
                Scan products to start tracking your spending
              </Text>
            </View>
          ) : (
            <View style={styles.entriesList}>
              {budgetEntries.slice().reverse().slice(0, 20).map((entry) => (
                <View key={entry.id} style={styles.entryCard}>
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryName}>{entry.productName}</Text>
                    <Text style={styles.entryDate}>
                      {new Date(entry.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.entryActions}>
                    <Text style={styles.entryPrice}>${entry.price.toFixed(2)}</Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteEntry(entry.id, entry.productName)}
                      style={styles.deleteButton}
                    >
                      <Trash2 size={18} color={Colors.health.bad} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowManualEntry(true)}
        >
          <Plus size={20} color={Colors.neutral.white} />
          <Text style={styles.actionButtonText}>Manual Entry</Text>
        </TouchableOpacity>
      </ScrollView>
      
      <Modal
        visible={showManualEntry}
        transparent
        animationType="slide"
        onRequestClose={() => setShowManualEntry(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowManualEntry(false)}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContentContainer}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Manual Entry</Text>
              <TouchableOpacity onPress={() => setShowManualEntry(false)}>
                <X size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Item Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., Organic Apples"
                  placeholderTextColor={Colors.text.light}
                  value={manualItemName}
                  onChangeText={setManualItemName}
                  returnKeyType="next"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Price ($)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0.00"
                  placeholderTextColor={Colors.text.light}
                  keyboardType="decimal-pad"
                  value={manualItemPrice}
                  onChangeText={setManualItemPrice}
                  returnKeyType="done"
                  onSubmitEditing={handleManualEntry}
                />
              </View>
              
              <TouchableOpacity
                style={styles.modalSubmitButton}
                onPress={handleManualEntry}
              >
                <Text style={styles.modalSubmitText}>Add to Budget</Text>
              </TouchableOpacity>
            </ScrollView>
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
  budgetCard: {
    backgroundColor: Colors.background.card,
    marginHorizontal: 24,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border.light,
    marginBottom: 32,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  budgetAmount: {
    fontSize: 40,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  budgetLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.background.secondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 4,
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
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
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
  entriesList: {
    gap: 12,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  entryDate: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  entryPrice: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.primary.green,
  },
  actionButton: {
    backgroundColor: Colors.primary.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
  },
  actionButtonText: {
    color: Colors.neutral.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  entryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 4,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContentContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalScrollView: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  modalSubmitButton: {
    backgroundColor: Colors.primary.green,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalSubmitText: {
    color: Colors.neutral.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
