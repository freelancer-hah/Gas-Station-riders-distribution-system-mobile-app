import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import api from "../../api/client";
import { 
  Screen, Card, Button, SectionTitle, 
  StatBox, ErrorText, COLORS 
} from "../../components/UI";

export default function ReportsScreen() {
  const [reports, setReports] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/reports/summary");
      setReports(res.data);
    } catch (err) {
      setError("Failed to load reports");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const generateReport = async (type) => {
    setGenerating(true);
    setError("");
    try {
      // Fetch report as JSON — no blob/arraybuffer (not supported in Hermes)
      const res = await api.get(`/reports/export/${type}`);
      const data = res.data;

      // Convert to CSV
      let csv = "";
      if (Array.isArray(data) && data.length > 0) {
        csv = Object.keys(data[0]).join(",") + "\n";
        csv += data
          .map((row) =>
            Object.values(row)
              .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
              .join(",")
          )
          .join("\n");
      } else {
        csv = JSON.stringify(data, null, 2);
      }

      const fileUri =
        FileSystem.documentDirectory + `report_${type}_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: `${type} Report`,
        });
      } else {
        setError("Sharing is not available on this device.");
      }
    } catch (err) {
      console.error("Export error:", err);
      setError(
        err?.response?.data?.message || "Failed to export report"
      );
    } finally {
      setGenerating(false);
    }
  };

  const money = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;

  if (!reports) {
    return (
      <Screen>
        <Text style={{ color: COLORS.gray }}>Loading reports...</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ErrorText>{error}</ErrorText>

        <SectionTitle icon="stats-chart">Overview</SectionTitle>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <StatBox label="Total Riders" value={reports.totalRiders} icon="people" />
          <StatBox label="Total Customers" value={reports.totalCustomers} icon="person" />
          <StatBox label="Total Suppliers" value={reports.totalSuppliers} icon="business" />
          <StatBox label="Total Invoices" value={reports.totalInvoices} icon="receipt" />
        </View>

        <SectionTitle icon="cash">Financial Summary</SectionTitle>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <StatBox label="Total Revenue" value={money(reports.totalRevenue)} accent={COLORS.success} icon="trending-up" />
          <StatBox label="Total Expenses" value={money(reports.totalExpenses)} accent={COLORS.danger} icon="trending-down" />
          <StatBox label="Customer Outstanding" value={money(reports.customerOutstanding)} accent={COLORS.danger} icon="alert-circle" />
          <StatBox label="Supplier Outstanding" value={money(reports.supplierOutstanding)} accent={COLORS.danger} icon="alert-circle" />
        </View>

        <SectionTitle icon="document">Export Reports</SectionTitle>
        <Card>
          <Button 
            title="Generate Sales Report" 
            onPress={() => generateReport('sales')}
            loading={generating}
            icon="download"
            style={{ marginBottom: 10 }}
          />
          <Button 
            title="Generate Expense Report" 
            onPress={() => generateReport('expenses')}
            loading={generating}
            icon="download"
            variant="secondary"
            style={{ marginBottom: 10 }}
          />
          <Button 
            title="Generate Outstanding Report" 
            onPress={() => generateReport('outstanding')}
            loading={generating}
            icon="download"
            variant="secondary"
          />
        </Card>

        <SectionTitle icon="trophy">Top Performers</SectionTitle>
        <Card>
          <Text style={{ fontWeight: "700", color: COLORS.dark }}>Top Rider (Sales)</Text>
          <Text style={{ color: COLORS.gray, marginTop: 4 }}>
            {reports.topRider?.name || "N/A"} - {money(reports.topRider?.sales || 0)}
          </Text>
          <View style={{ borderBottomWidth: 1, borderBottomColor: COLORS.border, marginVertical: 8 }} />
          <Text style={{ fontWeight: "700", color: COLORS.dark }}>Top Customer</Text>
          <Text style={{ color: COLORS.gray, marginTop: 4 }}>
            {reports.topCustomer?.name || "N/A"} - {money(reports.topCustomer?.totalPurchases || 0)}
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
