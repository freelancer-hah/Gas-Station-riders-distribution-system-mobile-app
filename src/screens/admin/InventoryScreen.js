import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, FlatList } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { Screen, Card, Field, Button, SectionTitle, ErrorText, COLORS } from "../../components/UI";

export default function InventoryScreen() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [cylinderSize, setCylinderSize] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [filledQty, setFilledQty] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get("/inventory");
      setItems(res.data);
    } catch (err) {
      setError("Failed to load inventory");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const addItem = async () => {
    setError("");
    if (!cylinderSize || !weightKg) {
      setError("Cylinder size and weight are required");
      return;
    }
    setLoading(true);
    try {
      await api.post("/inventory", {
        cylinderSize,
        weightKg: Number(weightKg),
        filledQty: Number(filledQty || 0),
      });
      setCylinderSize("");
      setWeightKg("");
      setFilledQty("");
      load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to add inventory item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView>
        <SectionTitle>Add Cylinder Size</SectionTitle>
        <Card>
          <ErrorText>{error}</ErrorText>
          <Field label="Cylinder Size (e.g. 48KG)" value={cylinderSize} onChangeText={setCylinderSize} />
          <Field label="Weight (kg)" value={weightKg} onChangeText={setWeightKg} keyboardType="numeric" />
          <Field label="Initial Filled Qty" value={filledQty} onChangeText={setFilledQty} keyboardType="numeric" />
          <Button title="Add to Inventory" onPress={addItem} loading={loading} />
        </Card>

        <SectionTitle>Company Inventory</SectionTitle>
        {items.length === 0 && <Text style={{ color: COLORS.gray }}>No inventory items yet.</Text>}
        {items.map((item) => (
          <Card key={item._id}>
            <Text style={{ fontWeight: "800", fontSize: 16, color: COLORS.dark }}>{item.cylinderSize}</Text>
            <Text style={{ color: COLORS.gray, marginTop: 4 }}>Weight: {item.weightKg} kg</Text>
            <View style={{ flexDirection: "row", marginTop: 8, gap: 16 }}>
              <Text style={{ color: COLORS.dark }}>Filled: {item.filledQty}</Text>
              <Text style={{ color: COLORS.dark }}>Empty: {item.emptyQty}</Text>
            </View>
            {item.filledQty <= item.lowStockThreshold && (
              <Text style={{ color: COLORS.danger, marginTop: 6, fontWeight: "700" }}>Low Stock!</Text>
            )}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

