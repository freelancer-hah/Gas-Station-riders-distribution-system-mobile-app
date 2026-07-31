import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, RefreshControl, Modal, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { 
  Screen, SectionTitle, StatBox, Card, Button, 
  Field, ErrorText, SuccessText, COLORS 
} from "../../components/UI";
import Icon from "react-native-vector-icons/Ionicons";

export default function RiderDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Add Customer Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerBusiness, setCustomerBusiness] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCreditLimit, setCustomerCreditLimit] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/dashboard/rider");
      setData(res.data);
    } catch (err) {
      // keep last known data
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

  // Add Customer Function
  const addCustomer = async () => {
    setModalError("");
    setModalSuccess("");
    
    if (!customerName || !customerPhone) {
      setModalError("Name and phone are required");
      return;
    }
    
    setModalLoading(true);
    try {
      await api.post("/customers", {
        name: customerName,
        businessName: customerBusiness,
        phone: customerPhone,
        address: customerAddress,
        creditLimit: Number(customerCreditLimit || 0),
      });
      
      setModalSuccess(`Customer "${customerName}" added successfully!`);
      setCustomerName("");
      setCustomerBusiness("");
      setCustomerPhone("");
      setCustomerAddress("");
      setCustomerCreditLimit("");
      
      load();
      
      setTimeout(() => {
        setModalVisible(false);
        setModalSuccess("");
      }, 2000);
      
    } catch (err) {
      setModalError(err?.response?.data?.message || "Failed to add customer");
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hi, {user?.name}</Text>
            <Text style={styles.subGreeting}>Rider Dashboard</Text>
          </View>
          <Button 
            title="Add Customer" 
            variant="primary" 
            onPress={() => setModalVisible(true)}
            size="small"
            icon="person-add"
          />
        </View>

        <SectionTitle>Today</SectionTitle>
        <View style={styles.statsRow}>
          <StatBox label="Today's Deliveries" value={data?.todaysDeliveries ?? "-"} />
          <StatBox label="Sales Summary" value={money(data?.salesSummary)} />
          <StatBox label="Payment Collection" value={money(data?.paymentCollection)} accent={COLORS.success} />
          <StatBox label="Expense Summary" value={money(data?.expenseSummary)} />
          <StatBox label="Remaining Inventory" value={data?.remainingInventory ?? "-"} />
        </View>

        <SectionTitle>My Assigned Inventory</SectionTitle>
        {(data?.assignedInventory || []).length === 0 && (
          <Text style={{ color: COLORS.gray }}>No inventory assigned yet. Contact admin.</Text>
        )}
        {(data?.assignedInventory || []).map((item) => (
          <Card key={item._id}>
            <Text style={{ fontWeight: "800", color: COLORS.dark }}>{item.cylinderSize}</Text>
            <View style={{ flexDirection: "row", gap: 16, marginTop: 4 }}>
              <Text style={{ color: COLORS.dark }}>Filled: {item.filledQty}</Text>
              <Text style={{ color: COLORS.dark }}>Empty: {item.emptyQty}</Text>
            </View>
          </Card>
        ))}

        <SectionTitle>Actions</SectionTitle>
        <Button 
          title="Create Sales Invoice" 
          onPress={() => navigation.navigate("CreateInvoice")}
          icon="create"
        />
        <Button 
          title="Record Customer Payment" 
          onPress={() => navigation.navigate("RecordPayment")} 
          style={{ marginTop: 8 }}
          icon="cash"
        />
        <Button 
          title="Pay to Admin" 
          onPress={() => navigation.navigate("PayAdmin")} 
          style={{ marginTop: 8 }}
          icon="cash"
          variant="primary"
        />
        <Button 
          title="Return Empty Cylinders" 
          onPress={() => navigation.navigate("ReturnEmpty")} 
          style={{ marginTop: 8 }}
          icon="refresh"
          variant="secondary"
        />
        <Button 
          title="Record Expense" 
          onPress={() => navigation.navigate("Expense")} 
          style={{ marginTop: 8 }}
          icon="receipt"
        />
        <Button 
          title="My Customers" 
          onPress={() => navigation.navigate("Customers")} 
          style={{ marginTop: 8 }}
          icon="people"
        />
        <Button 
          title="Log Out" 
          variant="secondary" 
          onPress={logout} 
          style={{ marginTop: 20, marginBottom: 40 }}
          icon="log-out"
        />
      </ScrollView>

      {/* Add Customer Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setModalError("");
          setModalSuccess("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Customer</Text>
              <Button 
                title="✕" 
                variant="secondary" 
                onPress={() => {
                  setModalVisible(false);
                  setModalError("");
                  setModalSuccess("");
                }}
                size="small"
                style={styles.modalCloseButton}
              />
            </View>

            <ErrorText>{modalError}</ErrorText>
            <SuccessText>{modalSuccess}</SuccessText>

            <Field
              label="Customer Name *"
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Enter customer name"
              icon="person-outline"
            />
            <Field
              label="Business Name (optional)"
              value={customerBusiness}
              onChangeText={setCustomerBusiness}
              placeholder="Enter business name"
              icon="business-outline"
            />
            <Field
              label="Phone Number *"
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="03xxxxxxxxx"
              keyboardType="phone-pad"
              icon="call-outline"
            />
            <Field
              label="Address (optional)"
              value={customerAddress}
              onChangeText={setCustomerAddress}
              placeholder="Enter address"
              icon="location-outline"
            />
            <Field
              label="Credit Limit (optional)"
              value={customerCreditLimit}
              onChangeText={setCustomerCreditLimit}
              placeholder="0"
              keyboardType="numeric"
              icon="card-outline"
            />

            <View style={styles.modalButtons}>
              <Button 
                title="Cancel" 
                variant="secondary" 
                onPress={() => {
                  setModalVisible(false);
                  setModalError("");
                  setModalSuccess("");
                }}
                style={styles.modalButton}
              />
              <Button 
                title="Add Customer" 
                variant="primary" 
                onPress={addCustomer}
                loading={modalLoading}
                style={styles.modalButton}
                icon="checkmark"
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.dark,
  },
  subGreeting: {
    color: COLORS.gray,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.dark,
  },
  modalCloseButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 40,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
  },
});