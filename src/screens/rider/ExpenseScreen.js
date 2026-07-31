import React, { useState } from "react";
import { ScrollView, View, Text } from "react-native";
import api from "../../api/client";
import { Screen, Card, Field, Button, SectionTitle, ErrorText, COLORS } from "../../components/UI";

const CATEGORIES = ["diesel", "lunch", "salary", "vehicle_maintenance", "other"];

export default function ExpenseScreen() {
  const [category, setCategory] = useState("diesel");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setSuccess("");
    if (!amount) {
      setError("Enter an amount");
      return;
    }
    setLoading(true);
    try {
      await api.post("/expenses", { category, amount: Number(amount), description });
      setSuccess("Expense recorded successfully");
      setAmount("");
      setDescription("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to record expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView>
        <SectionTitle>Record Daily Expense</SectionTitle>
        <Card>
          <ErrorText>{error}</ErrorText>
          {success ? <Text style={{ color: COLORS.success, marginBottom: 10 }}>{success}</Text> : null}

          <Text style={{ color: COLORS.gray, marginBottom: 8, fontWeight: "600" }}>Category:</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {CATEGORIES.map((c) => (
              <Button
                key={c}
                title={c.replace("_", " ")}
                variant={category === c ? "primary" : "secondary"}
                onPress={() => setCategory(c)}
                style={{ paddingHorizontal: 12, paddingVertical: 8 }}
              />
            ))}
          </View>

          <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" />
          <Field label="Description (optional)" value={description} onChangeText={setDescription} />
          <Button title="Record Expense" onPress={submit} loading={loading} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

