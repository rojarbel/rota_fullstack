// CustomPicker.js - İyileştirilmiş versiyon
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, Platform, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CustomPicker = ({ 
  selectedValue, 
  onValueChange, 
  items, 
  placeholder = "Seçim yapın",
  style 
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSelect = (value) => {
    Keyboard.dismiss(); // Klavyeyi kapat
    onValueChange(value);
    setModalVisible(false);
  };

  const handleModalOpen = () => {
    Keyboard.dismiss(); // Modal açılırken klavyeyi kapat
    setModalVisible(true);
  };

  const selectedItem = items.find(item => item.value === selectedValue);

  // Safe area ile uyumlu modal container
  const modalContainerStyle = {
    ...styles.modalContainer,
    paddingTop: Platform.OS === 'ios' ? Math.max(insets.top, 20) : 20,
    paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 20) : 20,
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.selector}
        onPress={handleModalOpen}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.selectorText,
          { color: selectedValue ? '#333' : '#999' }
        ]}>
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        statusBarTranslucent={Platform.OS === 'android'}
      >
        <View style={styles.modalOverlay}>
          <View style={modalContainerStyle}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={items}
              keyExtractor={(item) => item.value}
              showsVerticalScrollIndicator={true}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedValue === item.value && styles.selectedItem
                  ]}
                  onPress={() => handleSelect(item.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.modalItemText,
                    selectedValue === item.value && styles.selectedItemText
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  selector: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // Gölge efekti ekleyin
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectorText: {
    fontSize: 16,
    flex: 1,
  },
  arrow: {
    fontSize: 12,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '90%',
    maxHeight: '70%',
    // Gölge efekti
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#999',
    fontWeight: 'bold',
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedItem: {
    backgroundColor: '#7B2CBF20',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectedItemText: {
    color: '#7B2CBF',
    fontWeight: '600',
  },
});

export default CustomPicker;