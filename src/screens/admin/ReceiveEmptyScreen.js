import React, { useCallback, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import {
  Screen,
  Card,
  Field,
  Button,
  SectionTitle,
  ErrorText,
  SuccessText,
  COLORS,
} from "../../components/UI";
import Icon from "react-native-vector-icons/Ionicons";

export default function ReceiveEmptyScreen() {
  const [riders, setRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [riderInventory, setRiderInventory] = useState([]);
  const [selectedCylinder, setSelectedCylinder] = useState(null);
  const [emptyQty, setEmptyQty] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal & search state
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadRiders = useCallback(async () => {
    try {
      const res = await api.get("/riders");
      // Sort riders alphabetically by name
      const sorted = res.data.sort((a, b) => a.name.localeCompare(b.name));
      setRiders(sorted);
    } catch (err) {
      setError("Failed to load riders");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRiders();
    }, [loadRiders])
  );

  const loadRiderInventory = async (riderId) => {
    try {
      const res = await api.get(`/admin/rider-inventory/${riderId}`);
      setRiderInventory(res.data.inventory);
    } catch (err) {
      setError("Failed to load rider inventory");
    }
  };

  const handleRiderSelect = (rider) => {
    setSelectedRider(rider);
    setSelectedCylinder(null);
    setEmptyQty("");
    loadRiderInventory(rider._id);
    setModalVisible(false);
    setSearchQuery("");
  };

  const handleCylinderSelect = (item) => {
    setSelectedCylinder(item);
    setEmptyQty("");
  };

  const receiveEmpty = async () => {
    setError("");
    setSuccess("");

    if (!selectedRider) {
      setError("Please select a rider");
      return;
    }
    if (!selectedCylinder) {
      setError("Please select a cylinder size");
      return;
    }
    if (!emptyQty || Number(emptyQty) <= 0) {
      setError("Please enter valid quantity");
      return;
    }
    if (Number(emptyQty) > selectedCylinder.emptyQty) {
      setError(
        `Insufficient empty cylinders. Available: ${selectedCylinder.emptyQty}`
      );
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/admin/receive-empty", {
        riderId: selectedRider._id,
        cylinderSize: selectedCylinder.cylinderSize,
        emptyQty: Number(emptyQty),
      });

      setSuccess(
        `✅ Received ${emptyQty} empty cylinders of ${selectedCylinder.cylinderSize} from ${selectedRider.name}`
      );

      setSelectedCylinder(null);
      setEmptyQty("");

      loadRiderInventory(selectedRider._id);

      Alert.alert(
        "Received Successfully",
        `Received ${emptyQty} empty cylinders of ${selectedCylinder.cylinderSize} from ${selectedRider.name}`,
        [{ text: "OK" }]
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to receive empty cylinders");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRiders();
    if (selectedRider) {
      await loadRiderInventory(selectedRider._id);
    }
    setRefreshing(false);
  };

  // Filter riders based on search query
  const filteredRiders = riders.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderRiderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.riderItem}
      onPress={() => handleRiderSelect(item)}
    >
      <Text style={styles.riderName}>{item.name}</Text>
      <Text style={styles.riderPhone}>{item.phone}</Text>
    </TouchableOpacity>
  );

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <SectionTitle icon="refresh">Receive Empty Cylinders</SectionTitle>

        <Card>
          <ErrorText>{error}</ErrorText>
          <SuccessText>{success}</SuccessText>

          {/* Rider Selection */}
          <Text style={{ color: COLORS.gray, marginBottom: 8, fontWeight: "600" }}>
            Select Rider:
          </Text>

          <TouchableOpacity
            style={styles.riderSelector}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.riderSelectorText}>
              {selectedRider ? selectedRider.name : "Tap to choose a rider"}
            </Text>
            <Icon name="chevron-down" size={20} color={COLORS.gray} />
          </TouchableOpacity>

          {selectedRider && (
            <View
              style={{
                padding: 10,
                backgroundColor: COLORS.lightGray,
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontWeight: "600", color: COLORS.dark }}>
                {selectedRider.name}
              </Text>
              <Text style={{ color: COLORS.gray }}>{selectedRider.phone}</Text>
            </View>
          )}

          {/* Rider Inventory */}
          {riderInventory.length > 0 && (
            <>
              <Text
                style={{ color: COLORS.gray, marginBottom: 8, fontWeight: "600" }}
              >
                Rider's Empty Cylinders:
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                {riderInventory.map((item) => (
                  <Button
                    key={item._id}
                    title={`${item.cylinderSize} (${item.emptyQty})`}
                    variant={
                      selectedCylinder?._id === item._id ? "primary" : "secondary"
                    }
                    onPress={() => handleCylinderSelect(item)}
                    size="small"
                    disabled={item.emptyQty <= 0}
                  />
                ))}
              </View>
            </>
          )}

          {selectedCylinder && (
            <View
              style={{
                padding: 10,
                backgroundColor: COLORS.primaryLight,
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontWeight: "600", color: COLORS.dark }}>
                {selectedCylinder.cylinderSize}
              </Text>
              <Text style={{ color: COLORS.gray }}>
                Empty available: {selectedCylinder.emptyQty}
              </Text>
              <Text style={{ color: COLORS.gray }}>
                Filled: {selectedCylinder.filledQty}
              </Text>
            </View>
          )}

          <Field
            label="Number of Empty Cylinders to Receive"
            value={emptyQty}
            onChangeText={setEmptyQty}
            placeholder="Enter quantity"
            keyboardType="numeric"
            icon="hash-outline"
          />

          <Button
            title="Receive Empty Cylinders"
            onPress={receiveEmpty}
            loading={loading}
            icon="checkmark"
            style={{ marginTop: 12 }}
          />
        </Card>
      </ScrollView>

      {/* Modal for selecting rider */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Rider</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon name="close" size={28} color={COLORS.dark} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color={COLORS.gray} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Icon name="close-circle" size={20} color={COLORS.gray} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredRiders}
            keyExtractor={(item) => item._id}
            renderItem={renderRiderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No riders found</Text>
            }
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </Modal>
    </Screen>
  );
}

const styles = {
  riderSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: COLORS.white,
  },
  riderSelectorText: {
    fontSize: 16,
    color: COLORS.dark,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.dark,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: COLORS.white,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.dark,
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
  riderItem: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  riderName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  riderPhone: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 2,
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.gray,
    fontSize: 16,
    marginTop: 20,
  },
};