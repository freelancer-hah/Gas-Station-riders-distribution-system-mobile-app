import React, { useCallback, useState } from "react";
import { 
  ScrollView, 
  View, 
  Text, 
  RefreshControl, 
  Alert, 
  TouchableOpacity // ✅ Yahan import add kiya
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import {
  Screen,
  Card,
  Button,
  SectionTitle,
  ErrorText,
  SuccessText,
  COLORS,
  Badge,
} from "../../components/UI";
import Icon from "react-native-vector-icons/Ionicons";

export default function ReturnEmptyScreen() {
  const [inventory, setInventory] = useState([]);
  const [selectedItems, setSelectedItems] = useState({}); // { "23 KG": 2, "48 KG": 1 }
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadInventory = useCallback(async () => {
    try {
      const res = await api.get("/inventory/rider/me");
      const items = res.data.filter(item => (item.emptyQty || 0) > 0);
      setInventory(items);
    } catch (err) {
      setError("Failed to load inventory");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadInventory();
    }, [loadInventory])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInventory();
    setRefreshing(false);
  };

  // ================== TOGGLE SIZE SELECTION ==================
  const toggleSelection = (size) => {
    setSelectedItems((prev) => {
      const copy = { ...prev };
      if (copy[size]) {
        delete copy[size];
      } else {
        copy[size] = 1; // Default quantity 1
      }
      return copy;
    });
  };

  // ================== QUANTITY CONTROLS (Rectangle Box) ==================
  const updateQuantity = (size, delta) => {
    setSelectedItems((prev) => {
      const current = prev[size] || 0;
      const newQty = Math.max(1, current + delta);
      return { ...prev, [size]: newQty };
    });
  };

  // ================== SUBMIT RETURN ==================
  const returnEmpty = async () => {
    setError("");
    setSuccess("");

    const sizeKeys = Object.keys(selectedItems);
    if (sizeKeys.length === 0) {
      setError("Please select at least one cylinder size to return");
      return;
    }

    // Prepare items array with correct formatting (add space: 34KG -> 34 KG)
    const items = sizeKeys.map((size) => ({
      cylinderSize: size.replace(/(\d+)(KG)/i, '$1 KG'),
      emptyQty: selectedItems[size],
    }));

    setLoading(true);
    try {
      const res = await api.post("/riders/return-empty", { items });

      const totalQty = res.data.transaction.emptyQty;
      setSuccess(`✅ Successfully returned ${totalQty} empty cylinders to admin`);

      setSelectedItems({});
      loadInventory();

      Alert.alert(
        "Return Successful",
        `Returned ${totalQty} empty cylinders to admin`,
        [{ text: "OK" }]
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to return empty cylinders");
    } finally {
      setLoading(false);
    }
  };

  // Helpers
  const totalSelectedQty = Object.values(selectedItems).reduce((sum, qty) => sum + qty, 0);

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <SectionTitle icon="refresh">Return Empty Cylinders to Admin</SectionTitle>

        <Card>
          <ErrorText>{error}</ErrorText>
          <SuccessText>{success}</SuccessText>

          <Text style={{ color: COLORS.gray, marginBottom: 8, fontWeight: "600" }}>
            Select Cylinder Sizes (Tap to select multiple):
          </Text>

          {inventory.length === 0 ? (
            <View
              style={{
                padding: 16,
                backgroundColor: COLORS.lightGray,
                borderRadius: 8,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Icon name="cube-outline" size={32} color={COLORS.gray} />
              <Text style={{ color: COLORS.gray, marginTop: 8, textAlign: "center" }}>
                You don't have any empty cylinders to return.
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {inventory.map((item) => (
                <Button
                  key={item._id}
                  title={`${item.cylinderSize} (${item.emptyQty})`}
                  variant={selectedItems[item.cylinderSize] ? "primary" : "secondary"}
                  onPress={() => toggleSelection(item.cylinderSize)}
                  size="small"
                />
              ))}
            </View>
          )}
        </Card>

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

                {/* Rectangle Background Box for + / - */}
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
              title="Return Empty Cylinders"
              onPress={returnEmpty}
              loading={loading}
              icon="checkmark"
              style={{ marginTop: 12 }}
              disabled={Object.keys(selectedItems).length === 0}
            />
          </Card>
        )}

        {/* Summary Card */}
        <SectionTitle icon="list">My Cylinder Summary</SectionTitle>
        {inventory.length === 0 ? (
          <Card>
            <Text style={{ color: COLORS.gray, textAlign: "center" }}>
              No cylinders in your inventory.
            </Text>
          </Card>
        ) : (
          inventory.map((item) => (
            <Card key={item._id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontWeight: "700", fontSize: 16, color: COLORS.dark }}>
                  {item.cylinderSize}
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Badge variant="primary">{item.filledQty} Filled</Badge>
                  <Badge variant="danger">{item.emptyQty} Empty</Badge>
                </View>
              </View>
              <Text style={{ color: COLORS.gray, fontSize: 12 }}>
                {item.weightKg} kg/cylinder
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

// Styles for Rectangle Quantity Box
const styles = {
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