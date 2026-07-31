import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, RefreshControl, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { 
  Screen, Card, Field, Button, SectionTitle, 
  ErrorText, SuccessText, COLORS 
} from "../../components/UI";
import Icon from "react-native-vector-icons/Ionicons";

const METHODS = ["cash", "bank_transfer", "jazzcash", "easypaisa", "cheque"];

export default function AdminRecordPaymentScreen() {
  const [riders, setRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [riderLedger, setRiderLedger] = useState(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
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

  const loadRiderLedger = async (riderId) => {
    try {
      const res = await api.get(`/admin/rider-ledger/${riderId}`);
      setRiderLedger(res.data);
    } catch (err) {
      setError("Failed to load rider ledger");
    }
  };

  const handleRiderSelect = (rider) => {
    setSelectedRider(rider);
    setAmount("");
    setError("");
    setSuccess("");
    loadRiderLedger(rider._id);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRiders();
    if (selectedRider) {
      await loadRiderLedger(selectedRider._id);
    }
    setRefreshing(false);
  };

  const recordPayment = async () => {
    setError("");
    setSuccess("");
    
    if (!selectedRider) {
      setError("Please select a rider");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Please enter valid amount");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/admin/record-payment", {
        riderId: selectedRider._id,
        amount: Number(amount),
        method,
        notes,
      });

      setSuccess(`✅ Payment of Rs. ${Number(amount).toLocaleString()} recorded from ${selectedRider.name}`);
      setAmount("");
      setNotes("");
      
      loadRiderLedger(selectedRider._id);
      
      Alert.alert(
        "Payment Recorded",
        `Payment of Rs. ${Number(amount).toLocaleString()} recorded from ${selectedRider.name}\nRemaining Outstanding: Rs. ${res.data.ledger.outstandingBalance.toLocaleString()}`,
        [{ text: "OK" }]
      );
      
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <SectionTitle icon="cash">Record Payment from Rider</SectionTitle>
        
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

          {selectedRider && riderLedger && (
            <View style={{ 
              padding: 12, 
              backgroundColor: COLORS.lightGray, 
              borderRadius: 8,
              marginBottom: 12
            }}>
              <Text style={{ fontWeight: "600", color: COLORS.dark }}>{selectedRider.name}</Text>
              <Text style={{ color: COLORS.gray }}>Phone: {selectedRider.phone}</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                <Text style={{ color: COLORS.gray }}>Total Purchased:</Text>
                <Text style={{ fontWeight: "600", color: COLORS.dark }}>
                  {formatMoney(riderLedger?.ledger?.totalPurchased || 0)}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: COLORS.gray }}>Total Paid:</Text>
                <Text style={{ fontWeight: "600", color: COLORS.success }}>
                  {formatMoney(riderLedger?.ledger?.totalPaid || 0)}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: COLORS.gray }}>Outstanding:</Text>
                <Text style={{ 
                  fontWeight: "700", 
                  color: (riderLedger?.ledger?.outstandingBalance || 0) > 0 ? COLORS.danger : COLORS.success 
                }}>
                  {formatMoney(riderLedger?.ledger?.outstandingBalance || 0)}
                </Text>
              </View>
            </View>
          )}

          <Field 
            label="Amount (Rs.)" 
            value={amount} 
            onChangeText={setAmount} 
            placeholder="Enter amount"
            keyboardType="numeric"
            icon="cash-outline"
          />

          <Text style={{ color: COLORS.gray, marginBottom: 8, fontWeight: "600", marginTop: 8 }}>
            Payment Method:
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {METHODS.map((m) => (
              <Button
                key={m}
                title={m.replace("_", " ")}
                variant={method === m ? "primary" : "secondary"}
                onPress={() => setMethod(m)}
                size="small"
                style={{ paddingHorizontal: 10, paddingVertical: 6 }}
              />
            ))}
          </View>

          <Field 
            label="Notes (optional)" 
            value={notes} 
            onChangeText={setNotes} 
            placeholder="Payment reference"
            icon="document-text"
          />

          <Button 
            title="Record Payment" 
            onPress={recordPayment} 
            loading={loading}
            icon="checkmark"
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}