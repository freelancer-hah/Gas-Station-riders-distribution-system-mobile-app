import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { 
  Screen, Card, Field, Button, SectionTitle, 
  ErrorText, SuccessText, COLORS, Badge 
} from "../../components/UI";
import { Ionicons as Icon } from "@expo/vector-icons";

export default function PlantRefillScreen() {
  const [suppliers, setSuppliers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [refills, setRefills] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [cylinderWeight, setCylinderWeight] = useState("");
  const [noOfCylinders, setNoOfCylinders] = useState("");
  const [ratePerKg, setRatePerKg] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [suppRes, invRes, refRes] = await Promise.all([
        api.get("/suppliers"),
        api.get("/inventory"),
        api.get("/plant-refills")
      ]);
      setSuppliers(suppRes.data);
      setInventory(invRes.data);
      setRefills(refRes.data);
    } catch (err) {
      setError("Failed to load data");
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

  const submitRefill = async () => {
    setError("");
    setSuccess("");
    
    if (!selectedSupplier) {
      setError("Please select a supplier");
      return;
    }
    if (!cylinderWeight || Number(cylinderWeight) <= 0) {
      setError("Please enter valid cylinder weight");
      return;
    }
    if (!noOfCylinders || Number(noOfCylinders) <= 0) {
      setError("Please enter valid number of cylinders");
      return;
    }
    if (!ratePerKg || Number(ratePerKg) <= 0) {
      setError("Please enter valid rate per kg");
      return;
    }

    const weight = Number(cylinderWeight);
    const quantity = Number(noOfCylinders);
    const rate = Number(ratePerKg);
    const totalWeight = weight * quantity;
    const totalAmount = totalWeight * rate;

    setLoading(true);
    try {
      await api.post("/plant-refills", {
        supplier: selectedSupplier._id,
        cylinderSize: `${weight}KG`,
        quantity: quantity,
        weightKg: weight,
        ratePerKg: rate,
      });
      
      setSuccess(`✅ Refill recorded: ${quantity} cylinders of ${weight}kg = ${totalWeight}kg total`);
      
      setCylinderWeight("");
      setNoOfCylinders("");
      setRatePerKg("");
      
      loadData();
      
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to record refill");
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;

  const weight = Number(cylinderWeight) || 0;
  const quantity = Number(noOfCylinders) || 0;
  const rate = Number(ratePerKg) || 0;
  const totalWeight = weight * quantity;
  const totalAmount = totalWeight * rate;

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <SectionTitle icon="refresh">Plant Refill (Purchase)</SectionTitle>
        
        <Card>
          <ErrorText>{error}</ErrorText>
          <SuccessText>{success}</SuccessText>

          <Text style={{ color: COLORS.gray, marginBottom: 8, fontWeight: "600" }}>
            Select Supplier:
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {suppliers.map((s) => (
              <Button
                key={s._id}
                title={s.name}
                variant={selectedSupplier?._id === s._id ? "primary" : "secondary"}
                onPress={() => setSelectedSupplier(s)}
                size="small"
              />
            ))}
          </View>
          {selectedSupplier && (
            <View style={{ 
              flexDirection: "row", 
              justifyContent: "space-between",
              marginBottom: 12,
              padding: 10,
              backgroundColor: COLORS.lightGray,
              borderRadius: 8
            }}>
              <Text style={{ color: COLORS.dark, fontWeight: "600" }}>{selectedSupplier.name}</Text>
              <Text style={{ 
                color: selectedSupplier.outstandingBalance > 0 ? COLORS.danger : COLORS.success,
                fontWeight: "600"
              }}>
                O/S: {formatMoney(selectedSupplier.outstandingBalance || 0)}
              </Text>
            </View>
          )}

          <Field 
            label="Weight per Cylinder (kg)"
            value={cylinderWeight} 
            onChangeText={setCylinderWeight}
            placeholder="e.g. 10"
            keyboardType="numeric"
            icon="cube-outline"
          />

          <Field 
            label="Number of Cylinders"
            value={noOfCylinders} 
            onChangeText={setNoOfCylinders} 
            placeholder="e.g. 5"
            keyboardType="numeric"
            icon="hash-outline"
          />
          
          <Field 
            label="Rate per kg (Rs.)"
            value={ratePerKg} 
            onChangeText={setRatePerKg} 
            placeholder="e.g. 10"
            keyboardType="numeric"
            icon="cash-outline"
          />

          {cylinderWeight && noOfCylinders && ratePerKg ? (
            <View style={{ 
              marginTop: 12,
              padding: 16,
              backgroundColor: COLORS.primaryLight,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: COLORS.primary
            }}>
              <Text style={{ fontWeight: "700", color: COLORS.dark, marginBottom: 8 }}>
                📊 Calculation Summary
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ color: COLORS.gray }}>Total Gas:</Text>
                <Text style={{ fontWeight: "600", color: COLORS.dark }}>
                  {weight}kg × {quantity} = {totalWeight}kg
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ color: COLORS.gray }}>Rate:</Text>
                <Text style={{ fontWeight: "600", color: COLORS.dark }}>
                  Rs. {rate}/kg
                </Text>
              </View>
              <View style={{ 
                flexDirection: "row", 
                justifyContent: "space-between",
                marginTop: 8,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: COLORS.border
              }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.dark }}>
                  Total Amount:
                </Text>
                <Text style={{ fontSize: 16, fontWeight: "800", color: COLORS.primary }}>
                  {formatMoney(totalAmount)}
                </Text>
              </View>
            </View>
          ) : null}

          <Button 
            title="Record Refill" 
            onPress={submitRefill} 
            loading={loading}
            icon="refresh"
            style={{ marginTop: 12 }}
          />
        </Card>

        <SectionTitle icon="time">Recent Refills</SectionTitle>
        {refills.length === 0 ? (
          <Card>
            <Text style={{ color: COLORS.gray }}>No refills recorded yet.</Text>
          </Card>
        ) : (
          refills.slice(0, 10).map((r) => (
            <Card key={r._id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontWeight: "700", color: COLORS.dark }}>{r.purchaseNumber}</Text>
                <Badge variant="primary">{r.cylinderSize}</Badge>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                <Text style={{ color: COLORS.dark }}>{r.quantity} cylinders</Text>
                <Text style={{ color: COLORS.gray }}>{new Date(r.purchaseDate).toLocaleDateString()}</Text>
              </View>
              <Text style={{ color: COLORS.gray }}>Total Gas: {r.totalWeightKg} kg</Text>
              <Text style={{ color: COLORS.gray }}>Rate: Rs. {r.ratePerKg}/kg</Text>
              <Text style={{ fontWeight: "700", color: COLORS.dark, marginTop: 4 }}>
                Total: {formatMoney(r.totalAmount)}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
