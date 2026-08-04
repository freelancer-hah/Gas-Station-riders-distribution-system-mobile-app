// screens/rider/RiderPaymentsScreen.js
import React, { useState, useCallback } from "react";
import { ScrollView, View, Text, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { Screen, Card, SectionTitle, ErrorText, COLORS, Badge } from "../../components/UI";

export default function RiderPaymentsScreen() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get("/payments", { params: { type: "customer" } });
      setPayments(res.data);
      setError("");
    } catch (err) {
      console.error("Error loading payments:", err);
      setError(err?.response?.data?.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPayments();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  };

  const formatMoney = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;
  const formatDate = (date) => new Date(date).toLocaleString();

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: COLORS.gray }}>Loading payments...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <SectionTitle icon="cash">My Collections (Payments Received)</SectionTitle>
        <ErrorText>{error}</ErrorText>

        {payments.length === 0 ? (
          <Card>
            <Text style={{ color: COLORS.gray, textAlign: "center" }}>
              No customer payments collected yet.
            </Text>
          </Card>
        ) : (
          payments.map((p) => (
            <Card key={p._id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontWeight: "800", color: COLORS.dark }}>
                  {p.customer?.name || "Unknown Customer"}
                </Text>
                <Badge variant="primary">{p.method?.replace("_", " ") || "cash"}</Badge>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.success }}>
                  {formatMoney(p.amount)}
                </Text>
                <Text style={{ color: COLORS.gray, fontSize: 12 }}>{formatDate(p.paymentDate)}</Text>
              </View>
              {p.notes && <Text style={{ color: COLORS.gray, fontSize: 12, marginTop: 4 }}>{p.notes}</Text>}
              {p.invoice && (
                <Text style={{ color: COLORS.gray, fontSize: 11, marginTop: 2 }}>
                  Invoice: {p.invoice.invoiceNumber || p.invoice._id}
                </Text>
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}