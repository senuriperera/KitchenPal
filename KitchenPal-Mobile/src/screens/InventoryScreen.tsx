import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const InventoryScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('');

  const filters = ['Coffee Beans', 'Flour', 'Sugar', 'Eggs'];

  // Placeholder data - will be replaced with actual data from database
  const inventoryItems = [
    { id: 1, name: 'Ingredient Name', expireDate: 'Expire Date', image: null },
    { id: 2, name: 'Ingredient Name', expireDate: 'Expire Date', image: null },
    { id: 3, name: 'Ingredient Name', expireDate: 'Expire Date', image: null },
    { id: 4, name: 'Ingredient Name', expireDate: 'Expire Date', image: null },
    { id: 5, name: 'Ingredient Name', expireDate: 'Expire Date', image: null },
  ];

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Enter search terms"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
      </View>

      {/* Filter Tags */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((filter, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.filterTag,
              selectedFilter === filter && styles.filterTagActive,
            ]}
            onPress={() => setSelectedFilter(filter === selectedFilter ? '' : filter)}
          >
            <Text style={styles.filterText}>{filter}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Inventory Items List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {inventoryItems.map((item, index) => (
          <View key={item.id} style={styles.itemCard}>
            {/* Item Image */}
            <View style={styles.itemImageContainer}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.itemImage} />
              ) : (
                <View style={styles.itemImagePlaceholder}>
                  <MaterialIcons name="restaurant" size={40} color="#CCC" />
                </View>
              )}
            </View>

            {/* Item Details */}
            <View style={styles.itemDetails}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemExpireDate}>{item.expireDate}</Text>
            </View>

            {/* Delete Button - Only show on first item as per UI */}
            {index === 0 && (
              <TouchableOpacity style={styles.deleteButton}>
                <MaterialIcons name="delete-outline" size={28} color="#FF6B6B" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingTop: 60,
  },
  searchContainer: {
    marginHorizontal: 20,
    marginBottom: 15,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 45,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    position: 'absolute',
    right: 15,
    top: 14,
  },
  filterContainer: {
    marginBottom: 15,
    maxHeight: 50,
    flexGrow: 0,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterTag: {
    backgroundColor: '#FFD55A',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTagActive: {
    backgroundColor: '#FFC107',
  },
  filterText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 15,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemExpireDate: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
});

export default InventoryScreen;
