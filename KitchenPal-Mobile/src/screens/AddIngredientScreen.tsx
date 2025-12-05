import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

const CLOUDINARY_CLOUD_NAME = 'dzf4mceyk';
const CLOUDINARY_UPLOAD_PRESET = 'kitchenpal';

const uploadImageToCloudinary = async (imageUri: string): Promise<string | null> => {
  try {
    // Create form data
    const formData = new FormData();
    
    // Get file info
    const filename = imageUri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri: imageUri,
      name: filename,
      type: type,
    } as any);
    
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'ingredients'); // Optional: organize images in folders

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.secure_url) {
      return data.secure_url;
    } else {
      console.error('Cloudinary response:', data);
      throw new Error('No secure_url in response');
    }
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    return null;
  }
};

const AddIngredientScreen = () => {
  const [ingredientName, setIngredientName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [weight, setWeight] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [price, setPrice] = useState('');
  const [manufactureDate, setManufactureDate] = useState(new Date());
  const [expiryDate, setExpiryDate] = useState(new Date());
  const [selectedStorage, setSelectedStorage] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [showManufactureDatePicker, setShowManufactureDatePicker] = useState(false);
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [showStorageDropdown, setShowStorageDropdown] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  const units = ['kg', 'g', 'L', 'ml', 'pcs', 'cups'];
  const storageTypes = ['Pantry', 'Refrigerator', 'Freezer', 'Dry Storage', 'Room Temperature'];

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleManufactureDateChange = (event: any, selectedDate?: Date) => {
    setShowManufactureDatePicker(false);
    if (selectedDate) {
      setManufactureDate(selectedDate);
      if (validationErrors.manufactureDate) {
        setValidationErrors(prev => ({ ...prev, manufactureDate: '' }));
      }
    }
  };

  const handleExpiryDateChange = (event: any, selectedDate?: Date) => {
    setShowExpiryDatePicker(false);
    if (selectedDate) {
      setExpiryDate(selectedDate);
      if (validationErrors.expiryDate) {
        setValidationErrors(prev => ({ ...prev, expiryDate: '' }));
      }
    }
  };

  const formatDate = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month} / ${day} / ${year}`;
  };

  const validateFields = () => {
    const errors: {[key: string]: string} = {};

    if (!ingredientName.trim()) {
      errors.ingredientName = 'Ingredient name is required';
    }

    if (!quantity.trim()) {
      errors.quantity = 'Quantity is required';
    } else if (isNaN(Number(quantity)) || Number(quantity) <= 0) {
      errors.quantity = 'Quantity must be a valid positive number';
    }

    if (!weight.trim()) {
      errors.weight = 'Weight is required';
    } else if (isNaN(Number(weight)) || Number(weight) <= 0) {
      errors.weight = 'Weight must be a valid positive number';
    }

    if (!selectedUnit) {
      errors.selectedUnit = 'Unit is required';
    }

    if (!price.trim()) {
      errors.price = 'Price is required';
    } else if (isNaN(Number(price)) || Number(price) <= 0) {
      errors.price = 'Price must be a valid positive number';
    }

    if (!expiryDate) {
      errors.expiryDate = 'Expire date is required';
    }

    if (!manufactureDate) {
      errors.manufactureDate = 'Manufacture date is required';
    }

    if (!selectedStorage) {
      errors.selectedStorage = 'Storage type is required';
    }

    // Validate dates if both are provided
    if (expiryDate && manufactureDate) {
      if (expiryDate <= manufactureDate) {
        errors.expiryDate = 'Expire date must be after manufacture date';
      }
    }

    return errors;
  };

  const handleAdd = async () => {
    const errors = validateFields();
    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsUploading(true);
    let imageUrl = null;

    try {
      // Upload image if one is selected
      if (image) {
        imageUrl = await uploadImageToCloudinary(image);
        if (!imageUrl) {
          Alert.alert(
            'Upload Failed',
            'Failed to upload image. Do you want to continue without the image?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setIsUploading(false) },
              { 
                text: 'Continue', 
                onPress: () => {
                  saveIngredient(null);
                }
              }
            ]
          );
          return;
        }
      }

      await saveIngredient(imageUrl);
    } catch (error) {
      console.error('Error in handleAdd:', error);
      Alert.alert('Error', 'Failed to add ingredient. Please try again.');
      setIsUploading(false);
    }
  };

  const saveIngredient = async (imageUrl: string | null) => {
    try {
      // TODO: Save ingredient to your backend/database
      console.log('Saving ingredient with data:', {
        name: ingredientName,
        quantity,
        weight,
        unit: selectedUnit,
        price,
        manufactureDate,
        expiryDate,
        storageType: selectedStorage,
        imageUrl, // This is the Cloudinary URL
      });

      Alert.alert('Success', 'Ingredient added successfully!');
      
      // Clear form
      setIngredientName('');
      setQuantity('');
      setWeight('');
      setSelectedUnit('');
      setPrice('');
      setManufactureDate(new Date());
      setExpiryDate(new Date());
      setSelectedStorage('');
      setImage(null);
      
    } catch (error) {
      console.error('Error saving ingredient:', error);
      Alert.alert('Error', 'Failed to save ingredient');
    } finally {
      setIsUploading(false);
    }
  };

  // Clear validation error when user starts typing
  const handleIngredientNameChange = (text: string) => {
    setIngredientName(text);
    if (validationErrors.ingredientName) {
      setValidationErrors(prev => ({ ...prev, ingredientName: '' }));
    }
  };

  const handleQuantityChange = (text: string) => {
    setQuantity(text);
    if (validationErrors.quantity) {
      setValidationErrors(prev => ({ ...prev, quantity: '' }));
    }
  };

  const handleWeightChange = (text: string) => {
    setWeight(text);
    if (validationErrors.weight) {
      setValidationErrors(prev => ({ ...prev, weight: '' }));
    }
  };

  const handlePriceChange = (text: string) => {
    setPrice(text);
    if (validationErrors.price) {
      setValidationErrors(prev => ({ ...prev, price: '' }));
    }
  };

  const handleUnitSelect = (unit: string) => {
    setSelectedUnit(unit);
    setShowUnitDropdown(false);
    if (validationErrors.selectedUnit) {
      setValidationErrors(prev => ({ ...prev, selectedUnit: '' }));
    }
  };

  const handleStorageSelect = (storage: string) => {
    setSelectedStorage(storage);
    setShowStorageDropdown(false);
    if (validationErrors.selectedStorage) {
      setValidationErrors(prev => ({ ...prev, selectedStorage: '' }));
    }
  };

  const handleManufactureDateSelect = (selectedDate?: Date) => {
    setShowManufactureDatePicker(false);
    if (selectedDate) {
      setManufactureDate(selectedDate);
      if (validationErrors.manufactureDate) {
        setValidationErrors(prev => ({ ...prev, manufactureDate: '' }));
      }
    }
  };

  const handleExpiryDateSelect = (selectedDate?: Date) => {
    setShowExpiryDatePicker(false);
    if (selectedDate) {
      setExpiryDate(selectedDate);
      if (validationErrors.expiryDate) {
        setValidationErrors(prev => ({ ...prev, expiryDate: '' }));
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Image Upload Section */}
      <TouchableOpacity style={styles.imageUploadContainer} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.uploadedImage} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <MaterialIcons name="add-photo-alternate" size={40} color="#999" />
          </View>
        )}
      </TouchableOpacity>

      {/* Ingredient Name */}
      <Text style={styles.label}>Ingredient Name *</Text>
      <TextInput
        style={[styles.input, validationErrors.ingredientName && styles.errorInput]}
        value={ingredientName}
        onChangeText={handleIngredientNameChange}
        placeholder="Enter ingredient name"
        placeholderTextColor="#CCC"
      />
      {validationErrors.ingredientName ? <Text style={styles.errorText}>{validationErrors.ingredientName}</Text> : null}

      {/* Quantity, Weight, and Unit Row */}
      <View style={styles.row}>
        <View style={styles.flexColumn}>
          <Text style={styles.label}>Quantity *</Text>
          <TextInput
            style={[styles.smallInput, validationErrors.quantity && styles.errorInput]}
            value={quantity}
            onChangeText={handleQuantityChange}
            keyboardType="numeric"
            placeholder=""
            placeholderTextColor="#CCC"
          />
          {validationErrors.quantity ? <Text style={styles.errorText}>{validationErrors.quantity}</Text> : null}
        </View>

        <View style={styles.flexColumn}>
          <Text style={styles.label}>Weight *</Text>
          <TextInput
            style={[styles.smallInput, validationErrors.weight && styles.errorInput]}
            value={weight}
            onChangeText={handleWeightChange}
            keyboardType="numeric"
            placeholder=""
            placeholderTextColor="#CCC"
          />
          {validationErrors.weight ? <Text style={styles.errorText}>{validationErrors.weight}</Text> : null}
        </View>

        <View style={styles.flexColumn}>
          <Text style={styles.label}>Unit *</Text>
          <TouchableOpacity
            style={[styles.dropdownButtonWide, validationErrors.selectedUnit && styles.errorInput]}
            onPress={() => setShowUnitDropdown(!showUnitDropdown)}
          >
            <Text style={styles.dropdownButtonText}>{selectedUnit || ''}</Text>
            <MaterialIcons name="unfold-more" size={20} color="#666" />
          </TouchableOpacity>
          {validationErrors.selectedUnit ? <Text style={styles.errorText}>{validationErrors.selectedUnit}</Text> : null}
          {/* Unit Dropdown */}
          {showUnitDropdown && (
            <ScrollView style={styles.unitDropdownContainer} nestedScrollEnabled>
              {units.map((unit, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.dropdownItem}
                  onPress={() => handleUnitSelect(unit)}
                >
                  <Text style={styles.dropdownText}>{unit}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      {/* Price */}
      <Text style={styles.label}>Price *</Text>
      <TextInput
        style={[styles.input, validationErrors.price && styles.errorInput]}
        value={price}
        onChangeText={handlePriceChange}
        keyboardType="numeric"
        placeholder="Enter price"
        placeholderTextColor="#CCC"
      />
      {validationErrors.price ? <Text style={styles.errorText}>{validationErrors.price}</Text> : null}

      {/* Manufacture Date */}
      <Text style={styles.label}>Manufacture Date *</Text>
      <TouchableOpacity
        style={[styles.dateInput, validationErrors.manufactureDate && styles.errorInput]}
        onPress={() => setShowManufactureDatePicker(true)}
      >
        <Text style={styles.dateText}>{formatDate(manufactureDate)}</Text>
        <MaterialIcons name="calendar-today" size={20} color="#666" />
      </TouchableOpacity>
      {validationErrors.manufactureDate ? <Text style={styles.errorText}>{validationErrors.manufactureDate}</Text> : null}

      {showManufactureDatePicker && (
        <DateTimePicker
          value={manufactureDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleManufactureDateChange}
        />
      )}

      {/* Expire Date */}
      <Text style={styles.label}>Expire Date *</Text>
      <TouchableOpacity
        style={[styles.dateInput, validationErrors.expiryDate && styles.errorInput]}
        onPress={() => setShowExpiryDatePicker(true)}
      >
        <Text style={styles.dateText}>{formatDate(expiryDate)}</Text>
        <MaterialIcons name="calendar-today" size={20} color="#666" />
      </TouchableOpacity>
      {validationErrors.expiryDate ? <Text style={styles.errorText}>{validationErrors.expiryDate}</Text> : null}

      {showExpiryDatePicker && (
        <DateTimePicker
          value={expiryDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleExpiryDateChange}
        />
      )}

      {/* Storage Type */}
      <Text style={styles.label}>Storage Type *</Text>
      <View style={styles.dropdownWrapper}>
        <TouchableOpacity
          style={[styles.dropdownInputButton, validationErrors.selectedStorage && styles.errorInput]}
          onPress={() => setShowStorageDropdown(!showStorageDropdown)}
        >
          <Text style={[styles.dropdownInputText, !selectedStorage && styles.placeholderText]}>
            {selectedStorage || 'Dropdown text'}
          </Text>
          <MaterialIcons name="unfold-more" size={20} color="#666" />
        </TouchableOpacity>
        {validationErrors.selectedStorage ? <Text style={styles.errorText}>{validationErrors.selectedStorage}</Text> : null}

        {/* Storage Type Dropdown */}
        {showStorageDropdown && (
          <ScrollView style={styles.storageDropdownContainer} nestedScrollEnabled>
            {storageTypes.map((storage, index) => (
              <TouchableOpacity
                key={index}
                style={styles.dropdownItem}
                onPress={() => handleStorageSelect(storage)}
              >
                <Text style={styles.dropdownText}>{storage}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Add Button */}
      <TouchableOpacity 
        style={[styles.addButton, isUploading && { opacity: 0.6 }]} 
        onPress={handleAdd}
        disabled={isUploading}
      >
        <Text style={styles.addButtonText}>
          {isUploading ? 'Uploading...' : 'Add'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 200,
  },
  imageUploadContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#E8E8E8',
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  dropdownWrapper: {
    position: 'relative',
    zIndex: 100,
    marginBottom: 10,
  },
  flexColumn: {
    flex: 1,
  },
  smallInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  dropdownButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownButtonWide: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#DDD',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
  },
  dateInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DDD',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#999',
  },
  dropdownInputButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownInputText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    marginTop: 2,
    maxHeight: 150,
    position: 'absolute',
    top: 65,
    left: 0,
    right: 0,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  unitDropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    marginTop: 20,
    maxHeight: 150,
    position: 'absolute',
    top: 65,
    left: 0,
    right: 0,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  storageDropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    maxHeight: 150,
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownItem: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  selectedValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  addButton: {
    backgroundColor: '#FFD55A',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  errorInput: {
    borderColor: '#ff4444',
    borderWidth: 2,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 4,
  },
});

export default AddIngredientScreen;
