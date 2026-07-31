import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, RefreshControl, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { 
  Screen, Card, Field, Button, SectionTitle, 
  ErrorText, SuccessText, COLORS 
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

  const loadRiders = useCallback(async () => {
    try {
      const res = await api.get("/riders");
      setRiders(res.data);
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
      setError(`Insufficient empty cylinders. Available: ${selectedCylinder.emptyQty}`);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/admin/receive-empty", {
        riderId: selectedRider._id,
        cylinderSize: selectedCylinder.cylinderSize,
        emptyQty: Number(emptyQty),
      });

      setSuccess(`✅ Received ${emptyQty} empty cylinders of ${selectedCylinder.cylinderSize} from ${selectedRider.name}`);
      
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

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <SectionTitle icon="refresh">Receive Empty Cylinders</SectionTitle>
        
        <Card>
          <ErrorText>{error}</ErrorText>
          <SuccessText>{success}</SuccessText>

          <Text style={{ color: COLORS.gray, marginBottom: 8, fontWeight: "600" }}>
            Select Rider:
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {riders.map((r) => (
              <Button
                key={r._id}
                title={r.name}
                variant={selectedRider?._id === r._id ? "primary" : "secondary"}
                onPress={() => handleRiderSelect(r)}
                size="small"
              />
            ))}
          </View>
          {selectedRider && (
            <View style={{ 
              padding: 10, 
              backgroundColor: COLORS.lightGray, 
              borderRadius: 8,
              marginBottom: 12
            }}>
              <Text style={{ fontWeight: "600", color: COLORS.dark }}>{selectedRider.name}</Text>
              <Text style={{ color: COLORS.gray }}>{selectedRider.phone}</Text>
            </View>
          )}

          {riderInventory.length > 0 && (
            <>
              <Text style={{ color: COLORS.gray, marginBottom: 8, fontWeight: "600" }}>
                Rider's Empty Cylinders:
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {riderInventory.map((item) => (
                  <Button
                    key={item._id}
                    title={`${item.cylinderSize} (${item.emptyQty})`}
                    variant={selectedCylinder?._id === item._id ? "primary" : "secondary"}
                    onPress={() => handleCylinderSelect(item)}
                    size="small"
                    disabled={item.emptyQty <= 0}
                  />
                ))}
              </View>
            </>
          )}

          {selectedCylinder && (
            <View style={{ 
              padding: 10, 
              backgroundColor: COLORS.primaryLight, 
              borderRadius: 8,
              marginBottom: 12
            }}>
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
    </Screen>
  );
}