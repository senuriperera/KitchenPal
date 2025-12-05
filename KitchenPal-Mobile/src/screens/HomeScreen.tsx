import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Monthly Summary</Text>
        <TouchableOpacity style={styles.profileIcon}>
          <MaterialIcons name="account-circle" size={28} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Monthly Summary Chart Card */}
      <View style={styles.summaryCard}>
        {/* Placeholder for Chart - Will be populated with actual data */}
        <View style={styles.chartPlaceholder}>
          <Text style={styles.chartLabel}>Chart will be displayed here</Text>
          <Text style={styles.chartSubLabel}>After fetching data from database</Text>
        </View>
        
        {/* Month Label */}
        <View style={styles.monthLabelContainer}>
          <Text style={styles.monthLabel}>July 2025</Text>
        </View>
      </View>

      {/* Expiry Nearing Items Section */}
      <View style={styles.expirySection}>
        <Text style={styles.sectionTitle}>Expiry Nearing Items</Text>
        
        {/* Placeholder for Expiry Items - Will be populated with actual data */}
        <View style={styles.expiryPlaceholder}>
          <MaterialIcons name="inventory-2" size={48} color="#CCC" />
          <Text style={styles.placeholderText}>Expiry items will appear here</Text>
          <Text style={styles.placeholderSubText}>After fetching from database</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  profileIcon: {
    padding: 4,
  },
  summaryCard: {
    backgroundColor: '#FFD55A',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chartPlaceholder: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 15,
    marginBottom: 15,
  },
  chartLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  chartSubLabel: {
    fontSize: 12,
    color: '#888',
  },
  monthLabelContainer: {
    alignItems: 'flex-end',
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  expirySection: {
    marginTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
  },
  expiryPlaceholder: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
    fontWeight: '500',
  },
  placeholderSubText: {
    fontSize: 12,
    color: '#BBB',
    marginTop: 5,
  },
});

export default HomeScreen;
