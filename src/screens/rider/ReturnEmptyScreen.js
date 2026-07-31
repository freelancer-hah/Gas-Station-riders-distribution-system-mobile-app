import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, RefreshControl, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { 
  Screen, Card, Field, Button, SectionTitle, 
  ErrorText, SuccessText, COLORS, Badge 
} from "../../components/UI";
import Icon from "react-native-vector-icons/Ionicons";

export default function ReturnEmptyScreen() {
  const [inventory, setInventory] = useState([]);
  const [selectedCylinder, setSelectedCylinder] = useState(null);
  const [emptyQty, setEmptyQty] = useState("");
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

  const handleCylinderSelect = (item) => {
    setSelectedCylinder(item);
    setEmptyQty("");
    setError("");
  };

  const returnEmpty = async () => {
    setError("");
    setSuccess("");
    
    if (!selectedCylinder) {
      setError("Please select a cylinder size");
      return;
    }
    if (!emptyQty || Number(emptyQty) <= 0) {
      setError("Please enter valid quantity");
      return;
    }
    if (Number(emptyQty) > selectedCylinder.emptyQty) {
      setError(`You only have ${selectedCylinder.emptyQty} empty cylinders to return`);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/riders/return-empty", {
        cylinderSize: selectedCylinder.cylinderSize,
        emptyQty: Number(emptyQty),
      });
      
      setSuccess(`✅ Successfully returned ${emptyQty} empty cylinders of ${selectedCylinder.cylinderSize} to admin`);
      
      setSelectedCylinder(null);
      setEmptyQty("");
      
      loadInventory();
      
      Alert.alert(
        "Return Successful",
        `Returned ${emptyQty} empty cylinders of ${selectedCylinder.cylinderSize}`,
        [{ text: "OK" }]
      );
      
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to return empty cylinders");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <SectionTitle icon="refresh">Return Empty Cylinders to Admin</SectionTitle>
        
        <Card>
          <ErrorText>{error}</ErrorText>
          <SuccessText>{success}</SuccessText>

          <Text style={{ color: COLORS.gray, marginBottom: 8, fontWeight: "600" }}>
            Select Cylinder Size:
          </Text>
          
          {inventory.length === 0 ? (
            <View style={{ 
              padding: 16, 
              backgroundColor: COLORS.lightGray, 
              borderRadius: 8,
              alignItems: "center",
              marginBottom: 12
            }}>
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
                  variant={selectedCylinder?._id === item._id ? "primary" : "secondary"}
                  onPress={() => handleCylinderSelect(item)}
                  size="small"
                />
              ))}
            </View>
          )}

          {selectedCylinder && (
            <View style={{ 
              padding: 12, 
              backgroundColor: COLORS.primaryLight, 
              borderRadius: 8,
              marginBottom: 12
            }}>
              <Text style={{ fontWeight: "700", color: COLORS.dark }}>
                {selectedCylinder.cylinderSize}
              </Text>
              <View style={{ flexDirection: "row", gap: 16, marginTop: 4 }}>
                <Text style={{ color: COLORS.dark }}>Filled: {selectedCylinder.filledQty}</Text>
                <Text style={{ color: COLORS.danger, fontWeight: "600" }}>
                  Empty: {selectedCylinder.emptyQty}
                </Text>
              </View>
            </View>
          )}

          <Field 
            label="Number of Empty Cylinders to Return" 
            value={emptyQty} 
            onChangeText={setEmptyQty} 
            placeholder="Enter quantity"
            keyboardType="numeric"
            icon="cube-outline"
          />

          <Button 
            title="Return Empty Cylinders" 
            onPress={returnEmpty} 
            loading={loading}
            icon="checkmark"
            disabled={!selectedCylinder}
            style={{ marginTop: 8 }}
          />
        </Card>

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