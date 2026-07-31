import React, { useState, useCallback } from "react";
import { ScrollView, View, Text, RefreshControl, Modal, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { 
  Screen, Card, SectionTitle, StatBox, 
  ErrorText, COLORS, Button, Field, Badge 
} from "../../components/UI";
import Icon from "react-native-vector-icons/Ionicons";

export default function AdminSalesReportScreen() {
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [showFilter, setShowFilter] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/admin/sales-report";
      const params = [];
      if (fromDate) params.push(`from=${fromDate}`);
      if (toDate) params.push(`to=${toDate}`);
      if (params.length > 0) url += `?${params.join('&')}`;
      
      const res = await api.get(url);
      setSales(res.data.sales || []);
      setSummary(res.data.summary);
      setError("");
    } catch (err) {
      console.error("Error loading sales report:", err);
      setError("Failed to load sales report");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

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

  const applyFilter = () => {
    setShowFilter(false);
    loadData();
  };

  const resetFilter = () => {
    setFromDate("");
    setToDate("");
    setShowFilter(false);
  };

  const formatMoney = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;
  const formatDate = (date) => new Date(date).toLocaleDateString();

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <SectionTitle icon="bar-chart">Sales Report</SectionTitle>
          <Button 
            title="Filter" 
            variant="secondary" 
            onPress={() => setShowFilter(true)}
            size="small"
            icon="filter"
          />
        </View>

<ErrorText>{error}</ErrorText>
        {summary && (
          <Card>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              <View style={{ flex: 1, minWidth: 100 }}>
                <Text style={{ color: COLORS.gray, fontSize: 11 }}>Total Sales</Text>
                <Text style={{ fontWeight: "700", color: COLORS.primary, fontSize: 18 }}>
                  {formatMoney(summary.totalAmount)}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 100 }}>
                <Text style={{ color: COLORS.gray, fontSize: 11 }}>Total Transactions</Text>
                <Text style={{ fontWeight: "700", color: COLORS.dark, fontSize: 18 }}>
                  {summary.totalTransactions || 0}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 100 }}>
                <Text style={{ color: COLORS.gray, fontSize: 11 }}>Total Cylinders</Text>
                <Text style={{ fontWeight: "700", color: COLORS.dark, fontSize: 18 }}>
                  {summary.totalCylinders || 0}
                </Text>
              </View>
            </View>
            {(fromDate || toDate) && (
              <Text style={{ color: COLORS.gray, fontSize: 11, marginTop: 8 }}>
                Filtered: {fromDate || "Start"} to {toDate || "End"}
              </Text>
            )}
          </Card>
        )}

        <SectionTitle icon="list">Transactions</SectionTitle>
        
        {loading ? (
          <Card>
            <Text style={{ color: COLORS.gray }}>Loading...</Text>
          </Card>
        ) : sales.length === 0 ? (
          <Card>
            <View style={{ alignItems: "center", padding: 20 }}>
              <Icon name="cart-outline" size={48} color={COLORS.gray} />
              <Text style={{ color: COLORS.gray, marginTop: 12, textAlign: "center" }}>
                No sales transactions found
              </Text>
            </View>
          </Card>
        ) : (
          sales.map((item, index) => (
            <Card key={item._id || index}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ fontWeight: "700", color: COLORS.dark }}>
                    {item.cylinderSize || "N/A"}
                  </Text>
                  <Text style={{ color: COLORS.gray, fontSize: 12 }}>
                    {item.rider?.name || "Rider"} × {item.filledQty || 0}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontWeight: "700", color: COLORS.primary }}>
                    {formatMoney(item.totalAmount || 0)}
                  </Text>
                  <Text style={{ color: COLORS.gray, fontSize: 11 }}>
                    {formatDate(item.createdAt || item.transactionDate)}
                  </Text>
                </View>
              </View>
              {item.notes && (
                <Text style={{ color: COLORS.gray, fontSize: 11, marginTop: 4 }}>
                  📝 {item.notes}
                </Text>
              )}
            </Card>
          ))
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={showFilter} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter by Date</Text>
            
            <Field
              label="From Date"
              value={fromDate}
              onChangeText={setFromDate}
              placeholder="YYYY-MM-DD"
              icon="calendar"
            />
            <Field
              label="To Date"
              value={toDate}
              onChangeText={setToDate}
              placeholder="YYYY-MM-DD"
              icon="calendar"
            />
            
            <View style={styles.modalButtons}>
              <Button title="Reset" variant="secondary" onPress={resetFilter} style={styles.modalButton} />
              <Button title="Apply" variant="primary" onPress={applyFilter} style={styles.modalButton} />
              <Button title="Close" variant="secondary" onPress={() => setShowFilter(false)} style={styles.modalButton} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.dark,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
  },
});