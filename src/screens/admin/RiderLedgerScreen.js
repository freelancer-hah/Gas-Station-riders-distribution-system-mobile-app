import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, RefreshControl, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { 
  Screen, Card, SectionTitle, ErrorText, 
  COLORS, Button, Badge, Field 
} from "../../components/UI";
import Icon from "react-native-vector-icons/Ionicons";

export default function RiderLedgerScreen({ route }) {
  const { riderId, riderName } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState("all");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/rider-ledger/${riderId}`);
      setData(res.data);
      setError("");
    } catch (err) {
      setError("Failed to load rider ledger");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (riderId) {
        loadData();
      }
    }, [riderId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatMoney = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;
  const formatDate = (date) => new Date(date).toLocaleDateString();

  // Filter transactions
  const getFilteredTransactions = () => {
    if (!data?.transactions) return [];
    if (filterType === "all") return data.transactions;
    return data.transactions.filter(t => t.type === filterType);
  };

  const getTransactionIcon = (type) => {
    switch(type) {
      case 'purchase': return 'arrow-down';
      case 'return_empty': return 'arrow-up';
      case 'payment': return 'cash';
      default: return 'swap';
    }
  };

  const getTransactionColor = (type) => {
    switch(type) {
      case 'purchase': return COLORS.danger;
      case 'return_empty': return COLORS.success;
      case 'payment': return COLORS.primary;
      default: return COLORS.gray;
    }
  };

  const filteredTransactions = getFilteredTransactions();

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: COLORS.gray }}>Loading ledger...</Text>
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

  const { rider, ledger, inventory } = data;

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <SectionTitle icon="person">
          {riderName || rider?.name || "Rider"} Ledger
        </SectionTitle>

        {/* Rider Info */}
        <Card>
          <Text style={{ fontWeight: "800", fontSize: 16, color: COLORS.dark }}>
            {rider?.name || "N/A"}
          </Text>
          <Text style={{ color: COLORS.gray }}>Phone: {rider?.phone || "N/A"}</Text>
        </Card>

        {/* Ledger Summary */}
        <SectionTitle icon="stats-chart">Summary</SectionTitle>
        <Card>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <View style={{ flex: 1, minWidth: 100 }}>
              <Text style={{ color: COLORS.gray, fontSize: 11 }}>Total Received</Text>
              <Text style={{ fontWeight: "700", color: COLORS.dark }}>{ledger?.totalFilledReceived || 0}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 100 }}>
              <Text style={{ color: COLORS.gray, fontSize: 11 }}>Total Sold</Text>
              <Text style={{ fontWeight: "700", color: COLORS.dark }}>{ledger?.totalFilledSold || 0}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 100 }}>
              <Text style={{ color: COLORS.gray, fontSize: 11 }}>Empty Returned</Text>
              <Text style={{ fontWeight: "700", color: COLORS.dark }}>{ledger?.totalEmptyReturned || 0}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 100 }}>
              <Text style={{ color: COLORS.gray, fontSize: 11 }}>Outstanding</Text>
              <Text style={{ 
                fontWeight: "700", 
                color: (ledger?.outstandingBalance || 0) > 0 ? COLORS.danger : COLORS.success 
              }}>
                {formatMoney(ledger?.outstandingBalance || 0)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Current Inventory */}
        <SectionTitle icon="cube">Current Inventory</SectionTitle>
        {inventory?.length === 0 ? (
          <Card>
            <Text style={{ color: COLORS.gray }}>No inventory</Text>
          </Card>
        ) : (
          inventory?.map((item) => (
            <Card key={item._id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontWeight: "700", color: COLORS.dark }}>{item.cylinderSize}</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Badge variant="primary">{item.filledQty} Filled</Badge>
                  <Badge variant="gray">{item.emptyQty} Empty</Badge>
                </View>
              </View>
              <Text style={{ color: COLORS.gray, fontSize: 12 }}>{item.weightKg} kg/cylinder</Text>
            </Card>
          ))
        )}

        {/* Transactions */}
        <SectionTitle icon="list">Transaction History</SectionTitle>
        
        {/* Filter Buttons */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <Button
            title="All"
            variant={filterType === "all" ? "primary" : "secondary"}
            onPress={() => setFilterType("all")}
            size="small"
          />
          <Button
            title="Purchases"
            variant={filterType === "purchase" ? "primary" : "secondary"}
            onPress={() => setFilterType("purchase")}
            size="small"
          />
          <Button
            title="Returns"
            variant={filterType === "return_empty" ? "primary" : "secondary"}
            onPress={() => setFilterType("return_empty")}
            size="small"
          />
          <Button
            title="Payments"
            variant={filterType === "payment" ? "primary" : "secondary"}
            onPress={() => setFilterType("payment")}
            size="small"
          />
        </View>

        {filteredTransactions.length === 0 ? (
          <Card>
            <Text style={{ color: COLORS.gray, textAlign: "center" }}>
              No transactions found
            </Text>
          </Card>
        ) : (
          filteredTransactions.map((t) => (
            <Card key={t._id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Icon 
                    name={getTransactionIcon(t.type)} 
                    size={20} 
                    color={getTransactionColor(t.type)} 
                  />
                  <Text style={{ fontWeight: "700", color: COLORS.dark, textTransform: "capitalize" }}>
                    {t.type.replace("_", " ")}
                  </Text>
                </View>
                <Text style={{ color: COLORS.gray, fontSize: 12 }}>
                  {formatDate(t.transactionDate || t.createdAt)}
                </Text>
              </View>
              
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                <Text style={{ color: COLORS.gray, fontSize: 12 }}>
                  {t.transactionNumber || t._id}
                </Text>
                {t.totalAmount > 0 && (
                  <Text style={{ fontWeight: "700", color: COLORS.primary }}>
                    {formatMoney(t.totalAmount)}
                  </Text>
                )}
              </View>
              
              <Text style={{ color: COLORS.gray, fontSize: 12 }}>
                {t.cylinderSize} {t.filledQty > 0 ? `× ${t.filledQty}` : ''}
                {t.emptyQty > 0 ? ` × ${t.emptyQty} empty` : ''}
              </Text>
              
              {t.notes && (
                <Text style={{ color: COLORS.gray, fontSize: 11, marginTop: 4 }}>
                  📝 {t.notes}
                </Text>
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}