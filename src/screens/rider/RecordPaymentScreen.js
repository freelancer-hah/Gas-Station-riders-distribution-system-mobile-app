import React, { useEffect, useState } from "react";
import { ScrollView, View, Text } from "react-native";
import api from "../../api/client";
import { Screen, Card, Field, Button, SectionTitle, ErrorText, COLORS } from "../../components/UI";

const METHODS = ["cash", "bank_transfer", "jazzcash", "easypaisa", "cheque"];

export default function RecordPaymentScreen() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/customers");
        setCustomers(res.data);
      } catch (err) {
        setError("Failed to load customers");
      }
    })();
  }, []);

  const submit = async () => {
    setError("");
    setSuccess("");
    if (!selectedCustomer || !amount) {
      setError("Select a customer and enter an amount");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/payments/customer", {
        customerId: selectedCustomer._id,
        amount: Number(amount),
        method,
        notes,
      });
      setSuccess(`Payment recorded. New outstanding: Rs. ${Number(res.data.customerOutstanding).toLocaleString()}`);
      setAmount("");
      setNotes("");
      setSelectedCustomer({ ...selectedCustomer, outstandingBalance: res.data.customerOutstanding });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView>
        <SectionTitle>Receive Customer Payment</SectionTitle>
        <Card>
          <ErrorText>{error}</ErrorText>
          {success ? <Text style={{ color: COLORS.success, marginBottom: 10 }}>{success}</Text> : null}

          <Text style={{ color: COLORS.gray, marginBottom: 8, fontWeight: "600" }}>Select Customer:</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {customers.map((c) => (
              <Button
                key={c._id}
                title={c.name}
                variant={selectedCustomer?._id === c._id ? "primary" : "secondary"}
                onPress={() => setSelectedCustomer(c)}
                style={{ paddingHorizontal: 14, paddingVertical: 8 }}
              />
            ))}
          </View>
          {selectedCustomer && (
            <Text style={{ marginBottom: 12, color: COLORS.gray }}>
              Current outstanding: Rs. {Number(selectedCustomer.outstandingBalance || 0).toLocaleString()}
            </Text>
          )}

          <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" />

          <Text style={{ color: COLORS.gray, marginBottom: 8, fontWeight: "600" }}>Payment Method:</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {METHODS.map((m) => (
              <Button
                key={m}
                title={m.replace("_", " ")}
                variant={method === m ? "primary" : "secondary"}
                onPress={() => setMethod(m)}
                style={{ paddingHorizontal: 12, paddingVertical: 8 }}
              />
            ))}
          </View>

          <Field label="Notes (optional)" value={notes} onChangeText={setNotes} />
          <Button title="Record Payment" onPress={submit} loading={loading} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

