import React, { useState } from "react";
import { ScrollView, View, Text, RefreshControl, TouchableOpacity, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { Screen, Card, SectionTitle, ErrorText, Button, Badge, COLORS } from "../../components/UI";

export default function AdminSaleInvoicesScreen({ navigation }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/sale-invoices");
      setInvoices(res.data);
      setError("");
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to load invoices";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadInvoices();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  };

  const formatMoney = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;
  const formatDate = (date) => new Date(date).toLocaleString();

  if (loading) {
    return (
      <Screen style={{ justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <SectionTitle icon="document-text">All Sale Invoices (Admin → Riders)</SectionTitle>
        <ErrorText>{error}</ErrorText>

        {invoices.length === 0 ? (
          <Card>
            <Text style={{ color: COLORS.gray, textAlign: "center" }}>No sale invoices found.</Text>
          </Card>
        ) : (
          invoices.map((inv) => (
            <Card key={inv._id}>
              <TouchableOpacity 
                onPress={() => navigation.navigate("AdminSaleInvoice", { invoiceId: inv._id })}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View>
                    <Text style={{ fontWeight: "800", color: COLORS.dark }}>
                      #{inv.invoiceNumber}
                    </Text>
                    <Text style={{ color: COLORS.gray, fontSize: 12 }}>
                      Rider: {inv.rider?.name || "N/A"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontWeight: "700", color: COLORS.primary }}>
                      {formatMoney(inv.totalAmount)}
                    </Text>
                    <Text style={{ fontSize: 10, color: COLORS.gray }}>
                      {formatDate(inv.createdAt || inv.invoiceDate)}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                  <Text style={{ fontSize: 14, color: COLORS.dark }}>{inv.cylinderSize}</Text>
                  <Text style={{ fontSize: 14, color: COLORS.dark }}>× {inv.quantity}</Text>
                  <Text style={{ fontSize: 14, color: COLORS.dark }}>{inv.weightKg}kg/cyl</Text>
                </View>
                <Button
                  title="View Details"
                  variant="secondary"
                  size="small"
                  icon="eye"
                  onPress={() => navigation.navigate("AdminSaleInvoice", { invoiceId: inv._id })}
                  style={{ marginTop: 8 }}
                />
              </TouchableOpacity>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}