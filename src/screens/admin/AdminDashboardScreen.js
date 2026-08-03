import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, RefreshControl, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { Screen, SectionTitle, StatBox, Button, Card, COLORS, Badge } from "../../components/UI";
import Icon from "react-native-vector-icons/Ionicons";

export default function AdminDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/dashboard/admin");
      setData(res.data);
    } catch (err) {
      console.error("Error loading dashboard:", err);
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

  const money = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;

  const summary = data?.summary || {};
  const riderStatsData = data?.riderStats || [];

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: COLORS.dark }}>
          Welcome, {user?.name}
        </Text>
        <Text style={{ color: COLORS.gray, marginBottom: 16 }}>Admin Dashboard</Text>

        {/* ===== TODAY SECTION - RIDER BASED ===== */}
        <SectionTitle>Today</SectionTitle>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <StatBox 
            label="Today's Sales (to Riders)" 
            value={money(summary?.todaysSales)} 
          />
          <StatBox 
            label="Today's Collection (from Riders)" 
            value={money(summary?.todaysCollection)} 
          />
          <StatBox 
            label="Riders Daily Expenses" 
            value={money(summary?.dailyExpenses)} 
          />
        </View>

        {/* ===== OVERVIEW SECTION - RIDER BASED ===== */}
        <SectionTitle>Overview</SectionTitle>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <StatBox label="Total Riders" value={summary?.totalRiders ?? "-"} />
          <StatBox 
            label="Monthly Revenue (from Riders)" 
            value={money(summary?.monthlyRevenue)} 
            accent={COLORS.success} 
          />
          <StatBox 
            label="Total Riders Outstanding" 
            value={money(summary?.totalOutstanding)} 
            accent={COLORS.danger} 
          />
          <StatBox 
            label="Total Rider Cylinders" 
            value={summary?.totalCylinders ?? "-"} 
          />
        </View>

        {/* ===== RIDER-WISE TODAY PERFORMANCE ===== */}
        <SectionTitle icon="people">Today's Rider Performance</SectionTitle>
        
        {riderStatsData.length === 0 ? (
          <Card>
            <Text style={{ color: COLORS.gray, textAlign: "center" }}>
              No riders found
            </Text>
          </Card>
        ) : (
          riderStatsData.map((item, index) => (
            <Card key={item.rider.id}>
              <TouchableOpacity 
                onPress={() => navigation.navigate("RiderDetail", { riderId: item.rider.id })}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View>
                    <Text style={{ fontWeight: "800", fontSize: 16, color: COLORS.dark }}>
                      #{index + 1} {item.rider.name}
                    </Text>
                    <Text style={{ color: COLORS.gray, fontSize: 12 }}>{item.rider.phone}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ 
                      fontWeight: "700", 
                      color: (item.today?.sales || 0) > 0 ? COLORS.primary : COLORS.gray 
                    }}>
                      {money(item.today?.sales || 0)}
                    </Text>
                    <Text style={{ fontSize: 10, color: COLORS.gray }}>Admin Sold</Text>
                  </View>
                </View>

                <View style={{ 
                  flexDirection: "row", 
                  justifyContent: "space-between",
                  marginTop: 8,
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: COLORS.border
                }}>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontWeight: "700", color: COLORS.success }}>
                      {money(item.today?.collection || 0)}
                    </Text>
                    <Text style={{ fontSize: 10, color: COLORS.gray }}>Paid to Admin</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontWeight: "700", color: COLORS.danger }}>
                      {money(item.today?.expenses || 0)}
                    </Text>
                    <Text style={{ fontSize: 10, color: COLORS.gray }}>Expenses</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontWeight: "700", color: COLORS.primary }}>
                      {money(item.monthlyRevenue || 0)}
                    </Text>
                    <Text style={{ fontSize: 10, color: COLORS.gray }}>Monthly Revenue</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ fontWeight: "700", color: COLORS.dark }}>
                      {item.inventory?.totalCylinders || 0}
                    </Text>
                    <Text style={{ fontSize: 10, color: COLORS.gray }}>Inventory</Text>
                  </View>
                </View>

                {/* Show inventory items as badges */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                  {item.inventory?.items?.map((inv) => (
                    <Badge 
                      key={inv._id} 
                      variant={inv.filledQty > 0 ? "primary" : "gray"}
                      style={{ paddingHorizontal: 6, paddingVertical: 2 }}
                    >
                      {inv.cylinderSize} {inv.filledQty>0 ? `(${inv.filledQty})` : ''}
                    </Badge>
                  ))}
                  {item.inventory?.items?.length === 0 && (
                    <Badge variant="gray">No inventory</Badge>
                  )}
                </View>
              </TouchableOpacity>
            </Card>
          ))
        )}

        {/* ===== RIDER MANAGEMENT ===== */}
        <SectionTitle>Rider Management</SectionTitle>
        <Button 
          title="View Riders Summary" 
          onPress={() => navigation.navigate("RidersSummary")}
          icon="people"
          style={{ marginTop: 8 }}
        />
        <Button 
          title="Sell Cylinders to Rider" 
          onPress={() => navigation.navigate("SellToRider")} 
          style={{ marginTop: 8 }}
          icon="cart"
        />
        <Button 
          title="Receive Empty Cylinders" 
          onPress={() => navigation.navigate("ReceiveEmpty")} 
          style={{ marginTop: 8 }}
          icon="refresh"
        />
        <Button 
          title="Record Rider Payment" 
          onPress={() => navigation.navigate("AdminRecordPayment")} 
          style={{ marginTop: 8 }}
          icon="cash"
        />
        {/* NEW: Show All Sale Invoices button */}
        <Button 
          title="Show All Sale Invoices (Admin → Riders)" 
          onPress={() => navigation.navigate("AdminSaleInvoices")} 
          style={{ marginTop: 8 }}
          icon="document-text"
        />

        {/* ===== REPORTS & LEDGERS ===== */}
        <SectionTitle>Reports & Ledgers</SectionTitle>
        <Button 
          title="Sales Report" 
          onPress={() => navigation.navigate("AdminSalesReport")}
          icon="bar-chart"
          style={{ marginTop: 8 }}
        />
        <Button 
          title="Payment Collection" 
          onPress={() => navigation.navigate("AdminPaymentCollection")}
          icon="cash"
          style={{ marginTop: 8 }}
        />

        {/* ===== MANAGE ===== */}
        <SectionTitle>Manage</SectionTitle>
        <Button 
          title="Verify Riders" 
          onPress={() => navigation.navigate("Verify")} 
          icon="person-add"
        />
        <Button 
          title="Reports" 
          onPress={() => navigation.navigate("Reports")} 
          style={{ marginTop: 8 }}
          icon="bar-chart"
        />
        <Button 
          title="Log Out" 
          variant="secondary" 
          onPress={logout} 
          style={{ marginTop: 20, marginBottom: 40 }}
          icon="log-out"
        />
      </ScrollView>
    </Screen>
  );
}