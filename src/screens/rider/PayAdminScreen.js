import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, RefreshControl, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { 
  Screen, Card, Field, Button, SectionTitle, 
  ErrorText, SuccessText, COLORS, Badge 
} from "../../components/UI";
import Icon from "react-native-vector-icons/Ionicons";

const METHODS = ["cash", "bank_transfer", "jazzcash", "easypaisa", "cheque"];

export default function PayAdminScreen() {
  const [riderData, setRiderData] = useState(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await api.get("/riders/my-balance");
      setRiderData(res.data);
    } catch (err) {
      setError("Failed to load your balance");
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

  const submitPayment = async () => {
    setError("");
    setSuccess("");
    
    if (!amount || Number(amount) <= 0) {
      setError("Please enter valid amount");
      return;
    }
    
    if (Number(amount) > (riderData?.outstandingBalance || 0)) {
      Alert.alert(
        "Amount Exceeds Outstanding",
        `Your outstanding balance is ${formatMoney(riderData?.outstandingBalance || 0)}. Do you want to continue?`,
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
      const res = await api.post("/riders/pay-admin", {
        amount: Number(amount),
        method,
        notes,
      });
      
      setSuccess(`✅ Payment of ${formatMoney(Number(amount))} recorded successfully`);
      setAmount("");
      setNotes("");
      
      loadData();
      
      Alert.alert(
        "Payment Recorded",
        `Payment of ${formatMoney(Number(amount))} recorded.\nRemaining Outstanding: ${formatMoney(res.data.remainingOutstanding)}`,
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
        <SectionTitle icon="cash">Pay to Admin</SectionTitle>
        
        <Card>
          <ErrorText>{error}</ErrorText>
          <SuccessText>{success}</SuccessText>

          <View style={{ 
            padding: 16, 
            backgroundColor: COLORS.primaryLight, 
            borderRadius: 8,
            marginBottom: 16,
            alignItems: "center"
          }}>
            <Text style={{ color: COLORS.gray, fontSize: 12 }}>Your Outstanding Balance</Text>
            <Text style={{ 
              fontSize: 28, 
              fontWeight: "800", 
              color: (riderData?.outstandingBalance || 0) > 0 ? COLORS.danger : COLORS.success 
            }}>
              {formatMoney(riderData?.outstandingBalance || 0)}
            </Text>
            <Text style={{ color: COLORS.gray, fontSize: 11, marginTop: 4 }}>
              Total Purchased: {formatMoney(riderData?.totalPurchased || 0)}
            </Text>
            <Text style={{ color: COLORS.gray, fontSize: 11 }}>
              Total Paid: {formatMoney(riderData?.totalPaid || 0)}
            </Text>
          </View>

          <Field 
            label="Amount to Pay (Rs.)" 
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
            placeholder="Payment reference or notes"
            icon="document-text"
          />

          <Button 
            title="Pay Now" 
            onPress={submitPayment} 
            loading={loading}
            icon="checkmark"
          />
        </Card>

        <SectionTitle icon="time">Payment History</SectionTitle>
        {riderData?.payments?.length === 0 ? (
          <Card>
            <Text style={{ color: COLORS.gray, textAlign: "center" }}>
              No payment history yet.
            </Text>
          </Card>
        ) : (
          (riderData?.payments || []).slice(0, 10).map((p, idx) => (
            <Card key={idx}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "600", color: COLORS.dark }}>
                  {formatMoney(p.totalAmount || p.amount || 0)}
                </Text>
                <Badge variant="primary">{p.method || "cash"}</Badge>
              </View>
              <Text style={{ color: COLORS.gray, fontSize: 12 }}>
                {new Date(p.createdAt || p.transactionDate).toLocaleDateString()}
              </Text>
              {p.notes && (
                <Text style={{ color: COLORS.gray, fontSize: 12 }}>{p.notes}</Text>
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}