import React, { useEffect, useState } from "react";
import { ScrollView, View, Text } from "react-native";
import api from "../../api/client";
import { Screen, Card, SectionTitle, ErrorText, COLORS, Badge, Button } from "../../components/UI";
import Icon from "react-native-vector-icons/Ionicons";

export default function RiderDetailScreen({ route, navigation }) {
  const { riderId } = route.params || {};
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [riderId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/rider-ledger/${riderId}`);
      setData(res.data);
      setError("");
    } catch (err) {
      setError("Failed to load rider details");
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;
  const formatDate = (date) => new Date(date).toLocaleDateString();

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: COLORS.gray }}>Loading...</Text>
        </View>
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <ErrorText>{error}</ErrorText>
      </Screen>
    );
  }

  const { rider, ledger, inventory, transactions } = data;

  return (
    <Screen>
      <ScrollView>
        <SectionTitle icon="person">
          {rider.name}
        </SectionTitle>

        <Card>
          <Text style={{ color: COLORS.gray }}>Phone: {rider.phone}</Text>
        </Card>

        <SectionTitle icon="stats-chart">Ledger Summary</SectionTitle>
        <Card>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <View style={{ flex: 1, minWidth: 100 }}>
              <Text style={{ color: COLORS.gray, fontSize: 11 }}>Filled Received</Text>
              <Text style={{ fontWeight: "700", color: COLORS.dark }}>{ledger.totalFilledReceived}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 100 }}>
              <Text style={{ color: COLORS.gray, fontSize: 11 }}>Empty Returned</Text>
              <Text style={{ fontWeight: "700", color: COLORS.dark }}>{ledger.totalEmptyReturned}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 100 }}>
              <Text style={{ color: COLORS.gray, fontSize: 11 }}>Sold to Customers</Text>
              <Text style={{ fontWeight: "700", color: COLORS.dark }}>{ledger.totalFilledSold || 0}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 100 }}>
              <Text style={{ color: COLORS.gray, fontSize: 11 }}>Outstanding</Text>
              <Text style={{ 
                fontWeight: "700", 
                color: ledger.outstandingBalance > 0 ? COLORS.danger : COLORS.success 
              }}>
                {formatMoney(ledger.outstandingBalance)}
              </Text>
            </View>
          </View>
        </Card>

        <SectionTitle icon="cube">Current Inventory</SectionTitle>
        {inventory.length === 0 ? (
          <Card>
            <Text style={{ color: COLORS.gray }}>No inventory</Text>
          </Card>
        ) : (
          inventory.map((item) => (
            <Card key={item._id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "700", color: COLORS.dark }}>{item.cylinderSize}</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Badge variant="primary">{item.filledQty} Filled</Badge>
                  <Badge variant="gray">{item.emptyQty} Empty</Badge>
                </View>
              </View>
              <Text style={{ color: COLORS.gray, fontSize: 12 }}>{item.weightKg}kg/cylinder</Text>
            </Card>
          ))
        )}

        <SectionTitle icon="time">Recent Transactions</SectionTitle>
        {transactions.length === 0 ? (
          <Card>
            <Text style={{ color: COLORS.gray }}>No transactions</Text>
          </Card>
        ) : (
          transactions.slice(0, 20).map((t) => (
            <Card key={t._id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {t.type === "purchase" ? (
                    <Icon name="arrow-down" size={20} color={COLORS.danger} />
                  ) : t.type === "return_empty" ? (
                    <Icon name="arrow-up" size={20} color={COLORS.success} />
                  ) : (
                    <Icon name="swap" size={20} color={COLORS.primary} />
                  )}
                  <Text style={{ fontWeight: "600", color: COLORS.dark, textTransform: "capitalize" }}>
                    {t.type.replace("_", " ")}
                  </Text>
                </View>
                <Badge variant={t.type === "purchase" ? "danger" : "success"}>
                  {t.type === "purchase" ? `+${t.filledQty}` : `+${t.emptyQty}`}
                </Badge>
              </View>
              <Text style={{ color: COLORS.gray, fontSize: 12 }}>{t.cylinderSize}</Text>
              {t.totalAmount > 0 && (
                <Text style={{ fontWeight: "600", color: COLORS.dark }}>
                  {formatMoney(t.totalAmount)}
                </Text>
              )}
              <Text style={{ color: COLORS.gray, fontSize: 11 }}>{formatDate(t.transactionDate)}</Text>
              {t.notes && <Text style={{ color: COLORS.gray, fontSize: 11 }}>{t.notes}</Text>}
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}