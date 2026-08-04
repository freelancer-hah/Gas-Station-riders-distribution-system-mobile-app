// screens/admin/AdminDashboardScreen.js
import React, { useCallback, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  RefreshControl,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import {
  Screen,
  SectionTitle,
  StatBox,
  Button,
  Card,
  COLORS,
  Badge,
} from "../../components/UI";
import Icon from "react-native-vector-icons/Ionicons";

export default function AdminDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);

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

  return (
    <Screen>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hi, {user?.name}</Text>
            <Text style={styles.subGreeting}>Admin Dashboard</Text>
          </View>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setPopupVisible(true)}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
        </View>

        {/* Today Stats */}
        <SectionTitle>Today</SectionTitle>
        <View style={styles.statsGrid}>
          <StatBox
            label="Sales to Riders"
            value={money(summary?.todaysSales)}
            containerStyle={styles.statBox}
          />
          <StatBox
            label="Collection from Riders"
            value={money(summary?.todaysCollection)}
            accent={COLORS.success}
            containerStyle={styles.statBox}
          />
          <StatBox
            label="Riders Expenses"
            value={money(summary?.dailyExpenses)}
            containerStyle={styles.statBox}
          />
        </View>

        {/* Overview Stats */}
        <SectionTitle>Overview</SectionTitle>
        <View style={styles.statsGrid}>
          <StatBox
            label="Total Riders"
            value={summary?.totalRiders ?? "-"}
            containerStyle={styles.statBox}
          />
          <StatBox
            label="Monthly Revenue"
            value={money(summary?.monthlyRevenue)}
            accent={COLORS.success}
            containerStyle={styles.statBox}
          />
          <StatBox
            label="Outstanding"
            value={money(summary?.totalOutstanding)}
            accent={COLORS.danger}
            containerStyle={styles.statBox}
          />
          <StatBox
            label="Total Cylinders"
            value={summary?.totalCylinders ?? "-"}
            containerStyle={styles.statBox}
          />
        </View>

        {/* Quick Actions */}
        <SectionTitle>Quick Actions</SectionTitle>
        <View style={styles.quickActions}>
          <Button
            title="Sell to Rider"
            onPress={() => navigation.navigate("SellToRider")}
            icon="cart"
            style={styles.quickActionButton}
          />
          <Button
            title="Receive Empty"
            onPress={() => navigation.navigate("ReceiveEmpty")}
            icon="refresh"
            variant="secondary"
            style={styles.quickActionButton}
          />
        </View>

        {/* ===== REPLACED RIDER PERFORMANCE WITH "MY COLLECTIONS" CARD ===== */}
        <Card
          style={styles.collectionsCard}
          onPress={() => navigation.navigate("AdminPaymentCollection")}
        >
          <View style={styles.collectionsContent}>
            <Icon name="cash" size={36} color={COLORS.primary} />
            <View style={styles.collectionsText}>
              <Text style={styles.collectionsTitle}>My Collections</Text>
              <Text style={styles.collectionsSubtitle}>
                View all payments received from riders
              </Text>
            </View>
            <Icon name="chevron-forward" size={24} color={COLORS.gray} />
          </View>
        </Card>

        {/* Footer */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            Last updated: {new Date().toLocaleString()}
          </Text>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshIcon}>
            <Text style={styles.refreshIconText}>🔄</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ===== MODAL ===== */}
      <Modal
        animationType="slide"
        transparent
        visible={popupVisible}
        onRequestClose={() => setPopupVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Admin Actions</Text>
              <TouchableOpacity
                onPress={() => setPopupVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <SectionTitle>Rider Management</SectionTitle>
              <Button
                title="View Riders Summary"
                onPress={() => {
                  setPopupVisible(false);
                  navigation.navigate("RidersSummary");
                }}
                icon="people"
                style={styles.modalButton}
              />
              <Button
                title="Sell Cylinders to Rider"
                onPress={() => {
                  setPopupVisible(false);
                  navigation.navigate("SellToRider");
                }}
                icon="cart"
                style={styles.modalButton}
              />
              <Button
                title="Receive Empty Cylinders"
                onPress={() => {
                  setPopupVisible(false);
                  navigation.navigate("ReceiveEmpty");
                }}
                icon="refresh"
                style={styles.modalButton}
              />
              <Button
                title="Record Rider Payment"
                onPress={() => {
                  setPopupVisible(false);
                  navigation.navigate("AdminRecordPayment");
                }}
                icon="cash"
                style={styles.modalButton}
              />

              <SectionTitle>Reports & Ledgers</SectionTitle>
              <Button
                title="Show All Sale Invoices"
                onPress={() => {
                  setPopupVisible(false);
                  navigation.navigate("AdminSaleInvoices");
                }}
                icon="document-text"
                style={styles.modalButton}
              />
              <Button
                title="Sales Report"
                onPress={() => {
                  setPopupVisible(false);
                  navigation.navigate("AdminSalesReport");
                }}
                icon="bar-chart"
                style={styles.modalButton}
              />
              <Button
                title="My Collections"
                onPress={() => {
                  setPopupVisible(false);
                  navigation.navigate("AdminPaymentCollection");
                }}
                icon="cash"
                style={styles.modalButton}
              />

              <SectionTitle>Manage</SectionTitle>
              <Button
                title="Verify Riders"
                onPress={() => {
                  setPopupVisible(false);
                  navigation.navigate("Verify");
                }}
                icon="person-add"
                style={styles.modalButton}
              />
              <Button
                title="Log Out"
                variant="secondary"
                onPress={() => {
                  setPopupVisible(false);
                  logout();
                }}
                icon="log-out"
                style={[styles.modalButton, styles.logoutButton]}
              />
              <View style={styles.modalBottomSpacer} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 8,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.dark,
  },
  subGreeting: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 2,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  menuIcon: {
    fontSize: 24,
    color: COLORS.dark,
    fontWeight: "300",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginHorizontal: -4,
  },
  statBox: {
    width: "48%",
    marginHorizontal: 4,
    marginBottom: 14,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    minWidth: 0,
  },
  collectionsCard: {
    marginVertical: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  collectionsContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  collectionsText: {
    flex: 1,
    marginLeft: 16,
  },
  collectionsTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.dark,
  },
  collectionsSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  refreshIcon: {
    padding: 4,
  },
  refreshIconText: {
    fontSize: 18,
    color: COLORS.primary,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 0,
    maxHeight: "92%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gray,
    alignSelf: "center",
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.dark,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseIcon: {
    fontSize: 22,
    color: COLORS.gray,
    fontWeight: "400",
  },
  modalScrollContent: {
    paddingBottom: 16,
  },
  modalBottomSpacer: {
    height: 30,
  },
  modalButton: {
    marginBottom: 10,
    borderRadius: 10,
  },
  logoutButton: {
    marginTop: 8,
    marginBottom: 8,
  },
});