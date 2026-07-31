import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { 
  Screen, Card, SectionTitle, StatBox, 
  ErrorText, COLORS, Button, Field 
} from "../../components/UI";
import Icon from "react-native-vector-icons/Ionicons";

export default function AdminInventoryScreen() {
  const [inventory, setInventory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  
  const [newSize, setNewSize] = useState("");
  const [newWeight, setNewWeight] = useState("");
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
    
    if (!newSize || !newWeight) {
      setError("Cylinder size and weight are required");
      return;
    }

    setLoading(true);
    try {
      await api.post("/admin/inventory", {
        cylinderSize: newSize.trim(),
        weightKg: Number(newWeight),
        filledQty: Number(newFilled) || 0,
        saleRatePerKg: Number(newRate) || 0,
      });
      
      setSuccess(`✅ Added ${newSize} to inventory`);
      setNewSize("");
      setNewWeight("");
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
            <Field 
              label="Cylinder Size" 
              value={newSize} 
              onChangeText={setNewSize} 
              placeholder="e.g. 48KG"
              icon="cube-outline"
            />
            <Field 
              label="Weight (kg)" 
              value={newWeight} 
              onChangeText={setNewWeight} 
              placeholder="e.g. 48"
              keyboardType="numeric"
              icon="scale-outline"
            />
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
    </Screen>
  );
}