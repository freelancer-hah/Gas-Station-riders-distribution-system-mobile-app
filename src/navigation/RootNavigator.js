// AppNavigator.js
import React from "react";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/Ionicons";
import { useAuth } from "../context/AuthContext";
import { COLORS, Button, Card } from "../components/UI";

// ==================== AUTH SCREENS ====================
import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";

// ==================== ADMIN SCREENS ====================
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import VerifyRidersScreen from "../screens/admin/VerifyRidersScreen";
import ReportsScreen from "../screens/admin/ReportsScreen";
import SellToRiderScreen from "../screens/admin/SellToRiderScreen";
import ReceiveEmptyScreen from "../screens/admin/ReceiveEmptyScreen";
import RidersSummaryScreen from "../screens/admin/RidersSummaryScreen";
import AdminInventoryScreen from "../screens/admin/AdminInventoryScreen";
import RiderDetailScreen from "../screens/admin/RiderDetailScreen";
import RiderLedgerScreen from "../screens/admin/RiderLedgerScreen";
import AdminSaleInvoiceScreen from "../screens/admin/AdminSaleInvoiceScreen";
import AdminSalesReportScreen from "../screens/admin/AdminSalesReportScreen";
import AdminPaymentCollectionScreen from "../screens/admin/AdminPaymentCollectionScreen";
import AdminRecordPaymentScreen from "../screens/admin/AdminRecordPaymentScreen";
import AdminSaleInvoicesScreen from "../screens/admin/AdminSaleInvoicesScreen";

// ==================== RIDER SCREENS ====================
import RiderDashboardScreen from "../screens/rider/RiderDashboardScreen";
import CreateInvoiceScreen from "../screens/rider/CreateInvoiceScreen";
import RecordPaymentScreen from "../screens/rider/RecordPaymentScreen";
import ExpenseScreen from "../screens/rider/ExpenseScreen";
import RiderCustomersScreen from "../screens/rider/RiderCustomersScreen";
import RiderInventoryScreen from "../screens/rider/RiderInventoryScreen";
import PayAdminScreen from "../screens/rider/PayAdminScreen";
import ReturnEmptyScreen from "../screens/rider/ReturnEmptyScreen";
import InvoiceDetailScreen from "../screens/rider/InvoiceDetailScreen";
import RiderInvoicesScreen from "../screens/rider/RiderInvoicesScreen";
// NEW: Rider Payments Screen
import RiderPaymentsScreen from "../screens/rider/RiderPaymentsScreen";

// ==================== SHARED SCREENS ====================
import CustomerLedgerScreen from "../screens/shared/CustomerLedgerScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const headerOptions = {
  headerStyle: { backgroundColor: COLORS.primary },
  headerTintColor: "#fff",
  headerTitleStyle: { fontWeight: "700" },
};

// ==================== AUTH STACK ====================
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

// ==================== PENDING VERIFICATION SCREEN ====================
function PendingVerificationScreen({ logout }) {
  return (
    <View style={styles.pendingContainer}>
      <Card style={styles.pendingCard}>
        <Icon name="time" size={60} color={COLORS.warning} />
        <Text style={styles.pendingTitle}>Pending Verification</Text>
        <Text style={styles.pendingText}>
          Your account is waiting for admin approval.
        </Text>
        <Text style={styles.pendingSubText}>
          You will be notified once verified.
        </Text>
        <Button 
          title="Log Out" 
          variant="secondary" 
          onPress={logout}
          style={{ marginTop: 20 }}
          icon="log-out"
        />
      </Card>
    </View>
  );
}

// ==================== ADMIN STACK ====================
function AdminStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: "Dashboard" }} />
      <Stack.Screen name="Verify" component={VerifyRidersScreen} options={{ title: "Verify Riders" }} />
      <Stack.Screen name="AdminInventory" component={AdminInventoryScreen} options={{ title: "My Inventory" }} />
      <Stack.Screen name="RidersSummary" component={RidersSummaryScreen} options={{ title: "Riders Summary" }} />
      <Stack.Screen name="RiderDetail" component={RiderDetailScreen} options={{ title: "Rider Detail" }} />
      <Stack.Screen name="RiderLedger" component={RiderLedgerScreen} options={{ title: "Rider Ledger" }} />
      <Stack.Screen name="SellToRider" component={SellToRiderScreen} options={{ title: "Sell to Rider" }} />
      <Stack.Screen name="ReceiveEmpty" component={ReceiveEmptyScreen} options={{ title: "Receive Empty Cylinders" }} />
      <Stack.Screen name="AdminRecordPayment" component={AdminRecordPaymentScreen} options={{ title: "Record Payment" }} />
      <Stack.Screen name="AdminSaleInvoice" component={AdminSaleInvoiceScreen} options={{ title: "Sale Invoice" }} />
      <Stack.Screen name="AdminSalesReport" component={AdminSalesReportScreen} options={{ title: "Sales Report" }} />
      <Stack.Screen name="AdminPaymentCollection" component={AdminPaymentCollectionScreen} options={{ title: "Payment Collection" }} />
      <Stack.Screen name="AdminSaleInvoices" component={AdminSaleInvoicesScreen} options={{ title: "All Sale Invoices" }} />
      <Stack.Screen name="CustomerLedger" component={CustomerLedgerScreen} options={{ title: "Customer Ledger" }} />
      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: "Reports" }} />
    </Stack.Navigator>
  );
}

// ==================== RIDER MAIN STACK ====================
function RiderMainStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="RiderTabs" component={RiderTabs} options={{ headerShown: false }} />
      
      {/* Shared Screens - accessible from anywhere */}
      <Stack.Screen name="CustomerLedger" component={CustomerLedgerScreen} options={{ title: "Customer Ledger" }} />
      <Stack.Screen name="CreateInvoice" component={CreateInvoiceScreen} options={{ title: "New Invoice" }} />
      <Stack.Screen name="RecordPayment" component={RecordPaymentScreen} options={{ title: "Record Payment" }} />
      <Stack.Screen name="Expense" component={ExpenseScreen} options={{ title: "Record Expense" }} />
      <Stack.Screen name="Inventory" component={RiderInventoryScreen} options={{ title: "My Inventory" }} />
      <Stack.Screen name="PayAdmin" component={PayAdminScreen} options={{ title: "Pay Admin" }} />
      <Stack.Screen name="ReturnEmpty" component={ReturnEmptyScreen} options={{ title: "Return Empty Cylinders" }} />
      <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} options={{ title: "Invoice Details" }} />
      <Stack.Screen name="RiderInvoices" component={RiderInvoicesScreen} options={{ title: "My Invoices" }} />
      
      {/* NEW: Rider Payments Screen */}
      <Stack.Screen name="RiderPayments" component={RiderPaymentsScreen} options={{ title: "My Collections" }} />
    </Stack.Navigator>
  );
}

// ==================== RIDER TABS ====================
function RiderTabs({ navigation }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Dashboard") iconName = "home";
          else if (route.name === "Sales") iconName = "cart";
          else if (route.name === "Customers") iconName = "people";
          else if (route.name === "More") iconName = "menu";
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardWrapper} 
        options={{ title: "Dashboard" }}
      />
      <Tab.Screen 
        name="Sales" 
        component={SalesWrapper} 
        options={{ title: "Sales" }}
      />
      <Tab.Screen 
        name="Customers" 
        component={CustomersWrapper} 
        options={{ title: "Customers" }}
      />
      <Tab.Screen 
        name="More" 
        component={MoreWrapper} 
        options={{ title: "More" }}
      />
    </Tab.Navigator>
  );
}

// ==================== WRAPPER COMPONENTS ====================
function DashboardWrapper({ navigation }) {
  return <RiderDashboardScreen navigation={navigation} />;
}

function SalesWrapper({ navigation }) {
  return <SalesMainScreen navigation={navigation} />;
}

function CustomersWrapper({ navigation }) {
  return <RiderCustomersScreen navigation={navigation} />;
}

function MoreWrapper({ navigation }) {
  return <MoreMainScreen navigation={navigation} />;
}

// ==================== SALES MAIN SCREEN ====================
function SalesMainScreen({ navigation }) {
  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: COLORS.background }}>
      <Card onPress={() => navigation.navigate("CreateInvoice")}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon name="create" size={32} color={COLORS.primary} />
          <View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.dark }}>Create Invoice</Text>
            <Text style={{ color: COLORS.gray }}>Generate new sales invoice</Text>
          </View>
          <Icon name="chevron-forward" size={20} color={COLORS.gray} style={{ marginLeft: "auto" }} />
        </View>
      </Card>
      <Card onPress={() => navigation.navigate("RecordPayment")}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon name="cash" size={32} color={COLORS.success} />
          <View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.dark }}>Record Payment</Text>
            <Text style={{ color: COLORS.gray }}>Receive customer payment</Text>
          </View>
          <Icon name="chevron-forward" size={20} color={COLORS.gray} style={{ marginLeft: "auto" }} />
        </View>
      </Card>
      <Card onPress={() => navigation.navigate("PayAdmin")}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon name="cash" size={32} color={COLORS.primary} />
          <View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.dark }}>Pay to Admin</Text>
            <Text style={{ color: COLORS.gray }}>Pay your outstanding balance</Text>
          </View>
          <Icon name="chevron-forward" size={20} color={COLORS.gray} style={{ marginLeft: "auto" }} />
        </View>
      </Card>
      <Card onPress={() => navigation.navigate("ReturnEmpty")}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon name="refresh" size={32} color={COLORS.warning} />
          <View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.dark }}>Return Empty</Text>
            <Text style={{ color: COLORS.gray }}>Return empty cylinders to admin</Text>
          </View>
          <Icon name="chevron-forward" size={20} color={COLORS.gray} style={{ marginLeft: "auto" }} />
        </View>
      </Card>
      <Card onPress={() => navigation.navigate("RiderInvoices")}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon name="document-text" size={32} color={COLORS.primary} />
          <View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.dark }}>My Invoices</Text>
            <Text style={{ color: COLORS.gray }}>View all your invoices</Text>
          </View>
          <Icon name="chevron-forward" size={20} color={COLORS.gray} style={{ marginLeft: "auto" }} />
        </View>
      </Card>
      {/* NEW: My Collections */}
      <Card onPress={() => navigation.navigate("RiderPayments")}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon name="cash" size={32} color={COLORS.success} />
          <View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.dark }}>My Collections</Text>
            <Text style={{ color: COLORS.gray }}>View all payments received</Text>
          </View>
          <Icon name="chevron-forward" size={20} color={COLORS.gray} style={{ marginLeft: "auto" }} />
        </View>
      </Card>
    </View>
  );
}

// ==================== MORE MAIN SCREEN ====================
function MoreMainScreen({ navigation }) {
  const { logout } = useAuth();
  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: COLORS.background }}>
      <Card onPress={() => navigation.navigate("Inventory")}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon name="cube" size={24} color={COLORS.primary} />
          <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.dark }}>My Inventory</Text>
          <Icon name="chevron-forward" size={20} color={COLORS.gray} style={{ marginLeft: "auto" }} />
        </View>
      </Card>
      
      <Card onPress={() => navigation.navigate("Expense")}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon name="receipt" size={24} color={COLORS.danger} />
          <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.dark }}>Record Expense</Text>
          <Icon name="chevron-forward" size={20} color={COLORS.gray} style={{ marginLeft: "auto" }} />
        </View>
      </Card>
      
      <Card onPress={() => navigation.navigate("PayAdmin")}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon name="cash" size={24} color={COLORS.primary} />
          <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.dark }}>Pay to Admin</Text>
          <Icon name="chevron-forward" size={20} color={COLORS.gray} style={{ marginLeft: "auto" }} />
        </View>
      </Card>
      
      <Card onPress={() => navigation.navigate("ReturnEmpty")}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon name="refresh" size={24} color={COLORS.warning} />
          <Text style={{ fontSize: 16, fontWeight: "600", color: COLORS.dark }}>Return Empty Cylinders</Text>
          <Icon name="chevron-forward" size={20} color={COLORS.gray} style={{ marginLeft: "auto" }} />
        </View>
      </Card>
      
      <Button 
        title="Log Out" 
        variant="secondary" 
        onPress={logout} 
        style={{ marginTop: 20 }} 
        icon="log-out"
      />
    </View>
  );
}

// ==================== MAIN NAVIGATOR ====================
export default function RootNavigator() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user ? (
        <AuthStack />
      ) : user.role === "admin" ? (
        <AdminStack />
      ) : user.role === "rider" && !user.isActive ? (
        <PendingVerificationScreen logout={logout} />
      ) : (
        <RiderMainStack />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  pendingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  pendingCard: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    padding: 30,
  },
  pendingTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.dark,
    marginTop: 16,
    marginBottom: 8,
  },
  pendingText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: "center",
    marginBottom: 4,
  },
  pendingSubText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: "center",
  },
});