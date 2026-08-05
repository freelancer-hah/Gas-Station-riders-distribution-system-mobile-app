import React, { useCallback, useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  RefreshControl,
  Modal,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
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
import { CYLINDER_SIZES } from "../../constants/cylinderSizes";

export default function ReceiveEmptyScreen() {
  // Rider selection
  const [riders, setRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [riderModalVisible, setRiderModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Rider inventory & Multi-select state
  const [riderInventory, setRiderInventory] = useState([]);
  const [selectedItems, setSelectedItems] = useState({}); // { "23 KG": 3, "48 KG": 2 }

  // UI state
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load riders
  const loadRiders = useCallback(async () => {
    try {
      const res = await api.get("/riders");
      setRiders((res.data || []).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      setError("Failed to load riders");
    }
  }, []);

  // Load rider inventory when rider is selected
  const loadRiderInventory = async (riderId) => {
    try {
      const res = await api.get(`/admin/rider-inventory/${riderId}`);
      setRiderInventory(res.data.inventory);
    } catch (err) {
      setError("Failed to load rider inventory");
    }
  };

  useFocusEffect(useCallback(() => { loadRiders(); }, [loadRiders]));

  const handleRiderSelect = (rider) => {
    setSelectedRider(rider);
    setSelectedItems({}); // Clear selections
    setRiderModalVisible(false);
    setSearchQuery("");
    loadRiderInventory(rider._id);
  };

  // ================== TOGGLE SIZE SELECTION ==================
  const toggleSelection = (size) => {
    setSelectedItems((prev) => {
      const copy = { ...prev };
      if (copy[size]) {
        delete copy[size];
      } else {
        copy[size] = 1; // default quantity = 1
      }
      return copy;
    });
  };

  // ================== QUANTITY CONTROLS FOR SELECTED SIZES ==================
  const updateQuantity = (size, delta) => {
    setSelectedItems((prev) => {
      const current = prev[size] || 0;
      const newQty = Math.max(1, current + delta);
      return { ...prev, [size]: newQty };
    });
  };

  // ================== SUBMIT RETURN ==================
  const submitReturn = async () => {
    setError("");
    setSuccess("");

    if (!selectedRider) {
      setError("Please select a rider");
      return;
    }
    const sizeKeys = Object.keys(selectedItems);
    if (sizeKeys.length === 0) {
      setError("Please select at least one cylinder size to return");
      return;
    }

    // Prepare items array for backend
    const items = sizeKeys.map((size) => ({
      cylinderSize: size,
      emptyQty: selectedItems[size],
    }));

    setLoading(true);
    try {
      const res = await api.post("/admin/receive-empty", {
        riderId: selectedRider._id,
        items: items,
      });

      const totalQty = res.data.transaction.emptyQty;
      setSuccess(`✅ Received ${totalQty} empty cylinders from ${selectedRider.name}`);
      setSelectedItems({});
      loadRiderInventory(selectedRider._id);

      Alert.alert("Success", `Received ${totalQty} empty cylinders from ${selectedRider.name}`, [
        { text: "OK" },
      ]);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to receive empty cylinders");
    } finally {
      setLoading(false);
    }
  };

  // Helpers
  const totalSelectedQty = Object.values(selectedItems).reduce((sum, qty) => sum + qty, 0);
  const filteredRiders = riders.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.phone && r.phone.includes(searchQuery))
  );

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadRiders} />}>
        <SectionTitle icon="refresh">Receive Empty Cylinders</SectionTitle>

        <Card>
          <ErrorText>{error}</ErrorText>
          <SuccessText>{success}</SuccessText>

          {/* Rider Selection */}
          <Text style={{ color: COLORS.gray, fontWeight: "600" }}>Select Rider:</Text>
          <TouchableOpacity
            style={styles.riderSelector}
            onPress={() => setRiderModalVisible(true)}
          >
            <Text style={styles.selectorText}>
              {selectedRider ? selectedRider.name : "Tap to choose a rider"}
            </Text>
            <Icon name="chevron-down" size={20} color={COLORS.gray} />
          </TouchableOpacity>

          {selectedRider && (
            <View
              style={{
                padding: 10,
                backgroundColor: COLORS.primaryLight,
                borderRadius: 8,
                marginBottom: 12,
                marginTop: 8,
              }}
            >
              <Text style={{ fontWeight: "600", color: COLORS.dark }}>{selectedRider.name}</Text>
              <Text style={{ color: COLORS.gray }}>{selectedRider.phone}</Text>
            </View>
          )}
        </Card>

        {/* ================== CYLINDER SELECTION GRID (INTERFACE WAISA HI) ================== */}
        {selectedRider && riderInventory.length > 0 && (
          <Card>
            <Text style={{ color: COLORS.gray, fontWeight: "600", marginBottom: 8 }}>
              Rider's Empty Cylinders (Tap to select multiple):
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {riderInventory.map((item) => (
                <Button
                  key={item._id}
                  title={`${item.cylinderSize} (${item.emptyQty})`}
                  variant={selectedItems[item.cylinderSize] ? "primary" : "secondary"}
                  onPress={() => toggleSelection(item.cylinderSize)}
                  size="small"
                  disabled={item.emptyQty <= 0}
                  style={{ minWidth: 80 }}
                />
              ))}
            </View>
          </Card>
        )}

        {/* ================== QUANTITY INPUTS FOR SELECTED ITEMS ================== */}
        {Object.keys(selectedItems).length > 0 && (
          <Card>
            <Text style={{ fontWeight: "700", color: COLORS.dark, marginBottom: 8 }}>
              Enter quantities for selected sizes:
            </Text>
            {Object.keys(selectedItems).map((size) => (
              <View
                key={size}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                  paddingVertical: 4,
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.border,
                }}
              >
                <Text style={{ fontWeight: "600", color: COLORS.dark, fontSize: 16 }}>{size}</Text>

                {/* Rectangle Quantity Box (as requested) */}
                <View style={styles.quantityRow}>
                  <TouchableOpacity
                    onPress={() => updateQuantity(size, -1)}
                    disabled={selectedItems[size] <= 1}
                    style={[
                      styles.quantityButton,
                      {
                        backgroundColor: selectedItems[size] > 1 ? COLORS.primary : COLORS.gray,
                        opacity: selectedItems[size] > 1 ? 1 : 0.5,
                      },
                    ]}
                  >
                    <Icon name="remove" size={20} color={COLORS.white} />
                  </TouchableOpacity>

                  <Text style={styles.quantityNumber}>{selectedItems[size]}</Text>

                  <TouchableOpacity
                    onPress={() => updateQuantity(size, 1)}
                    style={[styles.quantityButton, { backgroundColor: COLORS.primary }]}
                  >
                    <Icon name="add" size={20} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
              <Text style={{ color: COLORS.gray }}>Total Cylinders:</Text>
              <Text style={{ fontWeight: "800", color: COLORS.dark, fontSize: 16 }}>
                {totalSelectedQty}
              </Text>
            </View>

            <Button
              title="Receive Empty Cylinders"
              onPress={submitReturn}
              loading={loading}
              icon="checkmark"
              style={{ marginTop: 12 }}
              disabled={Object.keys(selectedItems).length === 0}
            />
          </Card>
        )}
      </ScrollView>

      {/* Rider Modal */}
      <Modal visible={riderModalVisible} transparent={false} onRequestClose={() => setRiderModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Rider</Text>
            <TouchableOpacity onPress={() => setRiderModalVisible(false)}>
              <Icon name="close" size={28} color={COLORS.dark} />
            </TouchableOpacity>
          </View>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color={COLORS.gray} />
            <TextInput style={styles.searchInput} placeholder="Search..." value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <FlatList
            data={filteredRiders}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.riderItem}
                onPress={() => {
                  handleRiderSelect(item);
                }}
              >
                <Text style={styles.riderName}>{item.name}</Text>
                <Text style={styles.riderPhone}>{item.phone}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </Screen>
  );
}

// ==========================================================
// STYLES (Interface same, rectangle box for quantity)
// ==========================================================
const styles = {
  riderSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  selectorText: { fontSize: 16, color: COLORS.dark },
  modalContainer: { flex: 1, backgroundColor: COLORS.white, paddingTop: 40, paddingHorizontal: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: COLORS.dark },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 16, marginLeft: 8 },
  riderItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  riderName: { fontSize: 16, fontWeight: "600" },
  riderPhone: { fontSize: 14, color: COLORS.gray },

  // 👇 RECTANGLE BACKGROUND BOX FOR QUANTITY (same as SellToRider)
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
    minWidth: 24,
    textAlign: "center",
  },
};