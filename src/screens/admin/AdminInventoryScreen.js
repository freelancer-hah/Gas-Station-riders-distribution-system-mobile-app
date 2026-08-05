import React, { useCallback, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  RefreshControl,
  Modal,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import {
  Screen,
  Card,
  SectionTitle,
  StatBox,
  ErrorText,
  COLORS,
  Button,
  Field,
  Badge,
} from "../../components/UI";
import Icon from "react-native-vector-icons/Ionicons";
import { CYLINDER_SIZES, SIZE_LABELS, getWeightBySize } from "../../constants/cylinderSizes";

export default function AdminInventoryScreen() {
  const [inventory, setInventory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  
  const [selectedSize, setSelectedSize] = useState(null);
  const [sizeModalVisible, setSizeModalVisible] = useState(false);
  const [newFilled, setNewFilled] = useState("");
  const [newRate, setNewRate] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    try {
      const res = await api.get("/admin/inventory");
      setInventory(res.data);
      setError("");
    } catch (err) {
      setError("Failed to load inventory");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const addInventory = async () => {
    setError("");
    setSuccess("");
    
    if (!selectedSize) {
      setError("Please select a cylinder size");
      return;
    }

    setLoading(true);
    try {
      await api.post("/admin/inventory", {
        cylinderSize: selectedSize,
        weightKg: getWeightBySize(selectedSize),
        filledQty: Number(newFilled) || 0,
        saleRatePerKg: Number(newRate) || 0,
      });
      
      setSuccess(`✅ Added ${selectedSize} to inventory`);
      setSelectedSize(null);
      setNewFilled("");
      setNewRate("");
      setShowAdd(false);
      loadData();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to add inventory");
    } finally {
      setLoading(false);
    }
  };

  const totalFilled = inventory.reduce((sum, item) => sum + item.filledQty, 0);
  const totalEmpty = inventory.reduce((sum, item) => sum + item.emptyQty, 0);

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <SectionTitle icon="cube">My Inventory</SectionTitle>
        
        <ErrorText>{error}</ErrorText>
        
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <StatBox label="Total Filled" value={totalFilled} accent={COLORS.success} />
          <StatBox label="Total Empty" value={totalEmpty} accent={COLORS.danger} />
        </View>

        <Button 
          title={showAdd ? "Cancel" : "Add Cylinder Size"} 
          variant={showAdd ? "secondary" : "primary"}
          onPress={() => setShowAdd(!showAdd)}
          icon={showAdd ? "close" : "add"}
          style={{ marginVertical: 10 }}
        />

        {showAdd && (
          <Card>
            {success && <Text style={{ color: COLORS.success, marginBottom: 8 }}>{success}</Text>}
            
            <Text style={{ color: COLORS.gray, marginBottom: 8, fontWeight: "600" }}>
              Cylinder Size *
            </Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setSizeModalVisible(true)}
            >
              <Text style={styles.selectorText}>
                {selectedSize ? selectedSize : "Tap to select size"}
              </Text>
              <Icon name="chevron-down" size={20} color={COLORS.gray} />
            </TouchableOpacity>

            <Field 
              label="Initial Filled Quantity" 
              value={newFilled} 
              onChangeText={setNewFilled} 
              placeholder="0"
              keyboardType="numeric"
              icon="hash-outline"
            />
            <Field 
              label="Sale Rate per kg (Rs.)" 
              value={newRate} 
              onChangeText={setNewRate} 
              placeholder="0"
              keyboardType="numeric"
              icon="cash-outline"
            />
            <Button 
              title="Add to Inventory" 
              onPress={addInventory} 
              loading={loading}
              icon="checkmark"
            />
          </Card>
        )}

        <SectionTitle icon="list">Current Stock</SectionTitle>
        {inventory.length === 0 ? (
          <Card>
            <Text style={{ color: COLORS.gray }}>No inventory items. Add your first cylinder size above.</Text>
          </Card>
        ) : (
          inventory.map((item) => (
            <Card key={item._id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ fontWeight: "800", fontSize: 16, color: COLORS.dark }}>
                    {item.cylinderSize}
                  </Text>
                  <Text style={{ color: COLORS.gray }}>{item.weightKg} kg/cylinder</Text>
                </View>
                <View>
                  <Text style={{ fontWeight: "700", color: COLORS.success }}>Filled: {item.filledQty}</Text>
                  <Text style={{ fontWeight: "700", color: COLORS.danger }}>Empty: {item.emptyQty}</Text>
                </View>
              </View>
              {item.saleRatePerKg > 0 && (
                <Text style={{ color: COLORS.gray, marginTop: 4 }}>
                  Sale Rate: Rs. {item.saleRatePerKg}/kg
                </Text>
              )}
              {item.filledQty <= item.lowStockThreshold && (
                <Badge variant="danger" style={{ marginTop: 6 }}>Low Stock!</Badge>
              )}
            </Card>
          ))
        )}
      </ScrollView>

      {/* Modal for size selection */}
      <Modal
        visible={sizeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSizeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Cylinder Size</Text>
            <FlatList
              data={CYLINDER_SIZES}
              keyExtractor={(item) => item.label}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.sizeItem}
                  onPress={() => {
                    setSelectedSize(item.label);
                    setSizeModalVisible(false);
                  }}
                >
                  <Text style={styles.sizeLabel}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => setSizeModalVisible(false)}
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = {
  selector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border || "#ddd",
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: COLORS.white,
  },
  selectorText: {
    fontSize: 16,
    color: COLORS.dark,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.dark,
    marginBottom: 16,
  },
  sizeItem: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || "#eee",
  },
  sizeLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
};