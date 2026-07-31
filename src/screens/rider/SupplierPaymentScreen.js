import React, { useCallback, useState, useEffect } from "react";
import { ScrollView, View, Text, RefreshControl, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { 
  Screen, Card, Field, Button, SectionTitle, 
  ErrorText, SuccessText, COLORS, Badge 
} from "../../components/UI";
import { Ionicons as Icon } from "@expo/vector-icons";

const METHODS = ["cash", "bank_transfer", "jazzcash", "easypaisa", "cheque"];

export default function SupplierPaymentScreen({ navigation }) {
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await api.get("/suppliers");
      setSuppliers(res.data);
    } catch (err) {
      setError("Failed to load suppliers");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSuppliers();
    }, [loadSuppliers])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSuppliers();
    setRefreshing(false);
  };

  const submitPayment = async () => {
    setError("");
    setSuccess("");
    
    if (!selectedSupplier) {
      setError("Please select a supplier");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Please enter valid amount");
      return;
    }
    
    // Check if amount exceeds outstanding
    if (Number(amount) > selectedSupplier.outstandingBalance) {
      Alert.alert(
        "Amount Exceeds Outstanding",
        `Outstanding balance is ${formatMoney(selectedSupplier.outstandingBalance)}. Do you want to continue?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Continue", onPress: processPayment }
        ]
      );
    } else {
      processPayment();
    }
  };

  const processPayment = async () => {
    setLoading(true);
    try {
      const res = await api.post("/payments/supplier", {
        supplierId: selectedSupplier._id,
        amount: Number(amount),
        method,
        notes,
      });
      
      setSuccess(`✅ Payment of ${formatMoney(Number(amount))} recorded to ${selectedSupplier.name}`);
      setAmount("");
      setNotes("");
      
      // Update selected supplier's outstanding
      setSelectedSupplier({
        ...selectedSupplier,
        outstandingBalance: res.data.supplierOutstanding
      });
      
      // Refresh suppliers list
      loadSuppliers();
      
      Alert.alert(
        "Payment Recorded",
        `Payment of ${formatMoney(Number(amount))} recorded to ${selectedSupplier.name}\nRemaining Outstanding: ${formatMoney(res.data.supplierOutstanding)}`,
        [{ text: "OK" }]
      );
      
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;

  const goToLedger = () => {
    if (!selectedSupplier) {
      setError("Please select a supplier first");
      return;
    }
    navigation.navigate("SupplierLedger", { 
      supplierId: selectedSupplier._id, 
      supplierName: selectedSupplier.name 
    });
  };

  return (
    <Screen>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <SectionTitle icon="cash">Pay Supplier</SectionTitle>
        
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
              marginBottom: 12,
              padding: 10,
              backgroundColor: COLORS.lightGray,
              borderRadius: 8
            }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "600", color: COLORS.dark }}>
                  {selectedSupplier.name}
                </Text>
                <Text style={{ 
                  fontWeight: "700", 
                  color: selectedSupplier.outstandingBalance > 0 ? COLORS.danger : COLORS.success 
                }}>
                  O/S: {formatMoney(selectedSupplier.outstandingBalance || 0)}
                </Text>
              </View>
              {selectedSupplier.contactPerson && (
                <Text style={{ color: COLORS.gray, fontSize: 12 }}>
                  Contact: {selectedSupplier.contactPerson}
                </Text>
              )}
              <Text style={{ color: COLORS.gray, fontSize: 12 }}>
                Phone: {selectedSupplier.phone}
              </Text>
              
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <Button 
                  title="View Ledger" 
                  variant="secondary" 
                  onPress={goToLedger}
                  size="small"
                  icon="document-text"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}

          <Field 
            label="Amount (Rs.)" 
            value={amount} 
            onChangeText={setAmount} 
            placeholder="Enter amount to pay"
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
            placeholder="Payment reference or notes"
            icon="document-text"
          />

          <Button 
            title="Record Payment" 
            onPress={submitPayment} 
            loading={loading}
            icon="checkmark"
          />
        </Card>

        <SectionTitle icon="list">Recent Supplier Payments</SectionTitle>
        {/* You can add a list of recent payments here if needed */}
        <Card>
          <Text style={{ color: COLORS.gray, textAlign: "center" }}>
            Select a supplier above to view their ledger
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
