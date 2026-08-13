// screens/rider/RiderCustomersScreen.js
import React, { useCallback, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import {
  Screen,
  Card,
  SectionTitle,
  Button,
  Field,
  ErrorText,
  SuccessText,
  COLORS,
} from "../../components/UI";
import Icon from "react-native-vector-icons/Ionicons";

export default function RiderCustomersScreen({ navigation }) {
  const [customers, setCustomers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerBusiness, setCustomerBusiness] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCreditLimit, setCustomerCreditLimit] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  // State for action popup
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data);
    } catch (err) {
      // ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      navigation.setOptions({
        headerRight: () => null
      });
    }, [load, navigation])
  );

  const formatMoney = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.businessName && c.businessName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addCustomer = async () => {
    setModalError("");
    setModalSuccess("");
    if (!customerName) {
      setModalError("Customer name is required");
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

  // Quick add customer from search
  const quickAddCustomer = async () => {
    if (!searchQuery.trim()) {
      Alert.alert("Error", "Please enter a customer name");
      return;
    }

    // Check if customer already exists
    const existingCustomer = customers.find(
      c => c.name.toLowerCase() === searchQuery.toLowerCase().trim()
    );

    if (existingCustomer) {
      Alert.alert("Already Exists", `Customer "${searchQuery}" already exists!`);
      return;
    }

    Alert.alert(
      "Add Customer",
      `Add "${searchQuery.trim()}" as a new customer?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Add Customer",
          onPress: async () => {
            try {
              await api.post("/customers", {
                name: searchQuery.trim(),
                businessName: "",
                phone: "",
                address: "",
                creditLimit: 0,
              });
              Alert.alert("Success", `Customer "${searchQuery.trim()}" added successfully!`);
              setSearchQuery("");
              load();
            } catch (err) {
              Alert.alert("Error", err?.response?.data?.message || "Failed to add customer");
            }
          }
        }
      ]
    );
  };

  // Handle customer tap – show action popup
  const handleCustomerPress = (customer) => {
    setSelectedCustomer(customer);
    setActionModalVisible(true);
  };

  // Actions
  const handleCreateSale = () => {
    setActionModalVisible(false);
    if (selectedCustomer) {
      navigation.navigate("CreateInvoice", { customerId: selectedCustomer._id });
    }
  };

  const handleRecordPayment = () => {
    setActionModalVisible(false);
    if (selectedCustomer) {
      navigation.navigate("RecordPayment", { customerId: selectedCustomer._id });
    }
  };

  const handleViewLedger = () => {
    setActionModalVisible(false);
    if (selectedCustomer) {
      navigation.navigate("CustomerLedger", {
        customerId: selectedCustomer._id,
        customerName: selectedCustomer.name,
      });
    }
  };

  return (
    <Screen style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <View style={styles.header}>
          <SectionTitle style={{ marginBottom: 0 }}>My Customers</SectionTitle>
          <Button
            title="Add Customer"
            variant="primary"
            onPress={() => setModalVisible(true)}
            size="small"
            icon="person-add"
          />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color={COLORS.gray} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customer by name or phone..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Icon name="close-circle" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          )}
        </View>

        {customers.length === 0 && (
          <Text style={{ color: COLORS.gray, textAlign: "center", marginTop: 20 }}>
            No customers assigned to you yet.
          </Text>
        )}

        {customers.length > 0 && filteredCustomers.length === 0 && searchQuery.length > 0 && (
          <View style={styles.noResultContainer}>
            <Icon name="search-outline" size={40} color={COLORS.gray} />
            <Text style={styles.noResultText}>
              No customer found with name "{searchQuery}"
            </Text>
            <TouchableOpacity
              style={styles.quickAddButton}
              onPress={quickAddCustomer}
            >
              <Icon name="person-add" size={20} color="#fff" />
              <Text style={styles.quickAddButtonText}>
                Add "{searchQuery}" as customer
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {customers.length > 0 && filteredCustomers.length === 0 && searchQuery.length === 0 && (
          <Text style={{ color: COLORS.gray, textAlign: "center", marginTop: 20 }}>
            No matching customers found.
          </Text>
        )}

        {filteredCustomers.map((c) => (
          <TouchableOpacity
            key={c._id}
            activeOpacity={0.7}
            onPress={() => handleCustomerPress(c)}
          >
            <Card style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ fontWeight: "800", fontSize: 16, color: COLORS.dark }}>{c.name}</Text>
                  {c.businessName ? <Text style={{ color: COLORS.gray, fontSize: 13 }}>{c.businessName}</Text> : null}
                  <Text style={{ color: COLORS.gray, marginTop: 2 }}>{c.phone}</Text>
                </View>
                <Text
                  style={{
                    fontWeight: "700",
                    color: c.outstandingBalance > 0 ? COLORS.danger : COLORS.success,
                  }}
                >
                  {formatMoney(c.outstandingBalance)}
                </Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Add Customer Modal (unchanged) */}
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
              label="Phone Number (optional)"
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

      {/* ====== ACTION POPUP MODAL ====== */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={actionModalVisible}
        onRequestClose={() => setActionModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setActionModalVisible(false)}>
          <View style={styles.actionOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.actionModal}>
                <Text style={styles.actionTitle}>
                  {selectedCustomer?.name}
                </Text>
                <Text style={styles.actionSubtitle}>
                  Outstanding: {formatMoney(selectedCustomer?.outstandingBalance || 0)}
                </Text>

                <View style={styles.actionButtons}>
                  <Button
                    title="💰 Create Sale"
                    variant="primary"
                    onPress={handleCreateSale}
                    icon="create"
                    style={styles.actionBtn}
                  />
                  <Button
                    title="💳 Record Payment"
                    variant="secondary"
                    onPress={handleRecordPayment}
                    icon="cash"
                    style={styles.actionBtn}
                  />
                  <Button
                    title="📋 View Ledger"
                    variant="secondary"
                    onPress={handleViewLedger}
                    icon="list"
                    style={styles.actionBtn}
                  />
                  <Button
                    title="Cancel"
                    variant="secondary"
                    onPress={() => setActionModalVisible(false)}
                    style={styles.actionCancelBtn}
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
  headerRightBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 12,
  },
  headerRightBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border || "#e0e0e0",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
    paddingVertical: 4,
  },
  noResultContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginTop: 10,
  },
  noResultText: {
    color: COLORS.gray,
    fontSize: 16,
    marginTop: 12,
    marginBottom: 20,
    textAlign: "center",
  },
  quickAddButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  quickAddButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
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

  // Action popup styles
  actionOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  actionModal: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 350,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.dark,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 20,
  },
  actionButtons: {
    width: "100%",
    gap: 10,
  },
  actionBtn: {
    width: "100%",
  },
  actionCancelBtn: {
    width: "100%",
    marginTop: 4,
  },
});