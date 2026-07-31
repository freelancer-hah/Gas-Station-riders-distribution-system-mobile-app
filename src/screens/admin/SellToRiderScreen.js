import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { 
  Screen, Card, Field, Button, SectionTitle, 
  ErrorText, SuccessText, COLORS 
} from "../../components/UI";
import Icon from "react-native-vector-icons/Ionicons";

export default function SellToRiderScreen({ navigation }) {
  const [riders, setRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  
  const [cylinderWeight, setCylinderWeight] = useState("");
  const [noOfCylinders, setNoOfCylinders] = useState("");
  const [ratePerKg, setRatePerKg] = useState("");
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadRiders = useCallback(async () => {
    try {
      const res = await api.get("/riders");
      setRiders(res.data || []);
    } catch (err) {
      setError("Failed to load riders");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRiders();
    }, [loadRiders])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRiders();
    setRefreshing(false);
  };

  const sellToRider = async () => {
    setError("");
    setSuccess("");
    
    if (!selectedRider) {
      setError("Please select a rider");
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

    setLoading(true);
    try {
      const res = await api.post("/admin/sell-to-rider", {
        riderId: selectedRider._id,
        weightKg: Number(cylinderWeight),
        filledQty: Number(noOfCylinders),
        ratePerKg: Number(ratePerKg),
      });

      setSuccess(`✅ Sold ${noOfCylinders} cylinders of ${cylinderWeight}kg to ${selectedRider.name}`);
      
      // Clear form
      setCylinderWeight("");
      setNoOfCylinders("");
      setRatePerKg("");
      
      // Refresh riders list
      loadRiders();

      // Go straight to the invoice screen — don't make this depend on the
      // user tapping a button inside an Alert, since that extra step was
      // silently swallowing the invoice for some users.
      if (res.data.invoice) {
        navigation.navigate("AdminSaleInvoice", {
          invoiceData: res.data.invoice,
        });
      } else {
        // Sale went through but the server didn't send back an invoice —
        // surface this clearly instead of doing nothing.
        setError("Sale recorded, but no invoice was returned by the server. Please check Riders Summary for this sale.");
      }
      
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to sell to rider");
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;

  const weight = Number(cylinderWeight) || 0;
  const qty = Number(noOfCylinders) || 0;
  const rate = Number(ratePerKg) || 0;
  const totalWeight = weight * qty;
  const totalAmount = totalWeight * rate;

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <SectionTitle icon="cart">Sell Cylinders to Rider</SectionTitle>
        
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
                onPress={() => setSelectedRider(r)}
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

          <View style={{ 
            padding: 12, 
            backgroundColor: COLORS.primaryLight, 
            borderRadius: 8,
            marginBottom: 12
          }}>
            <Text style={{ fontWeight: "700", color: COLORS.primary, marginBottom: 4 }}>
              📦 Enter Cylinder Details
            </Text>
            <Text style={{ color: COLORS.gray, fontSize: 12 }}>
              Admin can sell ANY cylinder size to rider
            </Text>
          </View>

          <Field 
            label="Cylinder Weight (kg) *" 
            value={cylinderWeight} 
            onChangeText={setCylinderWeight} 
            placeholder="e.g. 10, 25, 48"
            keyboardType="numeric"
            icon="scale-outline"
          />

          <Field 
            label="Number of Cylinders *" 
            value={noOfCylinders} 
            onChangeText={setNoOfCylinders} 
            placeholder="e.g. 5"
            keyboardType="numeric"
            icon="cube"
          />

          <Field 
            label="Rate per kg (Rs.) *" 
            value={ratePerKg} 
            onChangeText={setRatePerKg} 
            placeholder="e.g. 10"
            keyboardType="numeric"
            icon="cash-outline"
          />

          {cylinderWeight && noOfCylinders && ratePerKg && (
            <View style={{ 
              marginTop: 12,
              padding: 16,
              backgroundColor: COLORS.primaryLight,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: COLORS.primary
            }}>
              <Text style={{ fontWeight: "700", color: COLORS.dark, marginBottom: 8 }}>
                📊 Sale Summary
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ color: COLORS.gray }}>Cylinder:</Text>
                <Text style={{ fontWeight: "600", color: COLORS.dark }}>{weight}kg</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ color: COLORS.gray }}>Total Gas:</Text>
                <Text style={{ fontWeight: "600", color: COLORS.dark }}>
                  {weight}kg × {qty} = {totalWeight}kg
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ color: COLORS.gray }}>Rate:</Text>
                <Text style={{ fontWeight: "600", color: COLORS.dark }}>Rs. {rate}/kg</Text>
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
          )}

          <Button 
            title="Sell to Rider" 
            onPress={sellToRider} 
            loading={loading}
            icon="checkmark"
            style={{ marginTop: 12 }}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}