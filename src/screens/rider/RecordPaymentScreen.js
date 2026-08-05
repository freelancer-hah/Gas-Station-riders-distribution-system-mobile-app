// screens/rider/RecordPaymentScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  FlatList,
  RefreshControl,
  Keyboard,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import api from "../../api/client";
import { Screen, Card, Field, Button, SectionTitle, ErrorText, COLORS } from "../../components/UI";
import Icon from "react-native-vector-icons/Ionicons";

const METHODS = ["cash", "bank_transfer", "jazzcash", "easypaisa", "cheque"];

export default function RecordPaymentScreen({ navigation }) {
  const route = useRoute();
  const { customerId } = route.params || {};

  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSelectionDisabled, setCustomerSelectionDisabled] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal & search state
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load customers and pre‑select if customerId is provided
  useEffect(() => {
    loadCustomers();
  }, []);

  // Auto‑select customer if customerId is passed
  useEffect(() => {
    if (customerId) {
      const loadCustomer = async () => {
        try {
          const res = await api.get(`/customers/${customerId}`);
          const customer = res.data;
          setSelectedCustomer(customer);
          setCustomerSelectionDisabled(true);
          setError("");
          setSuccess(`Customer: ${customer.name}`);
        } catch (err) {
          setError("Failed to load customer. Please search manually.");
        }
      };
      loadCustomer();
    }
  }, [customerId]);

  const loadCustomers = async () => {
    try {
      const res = await api.get("/customers");
      const sorted = res.data.sort((a, b) => a.name.localeCompare(b.name));
      setCustomers(sorted);
      setFilteredCustomers(sorted);
    } catch (err) {
      setError("Failed to load customers");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCustomers();
    setRefreshing(false);
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setModalVisible(false);
    setSearchQuery("");
    setError("");
    setSuccess("");
    Keyboard.dismiss();
  };

  const clearSelection = () => {
    if (customerId) return; // frozen
    setSelectedCustomer(null);
    setCustomerSelectionDisabled(false);
    setSuccess("");
  };

  const submit = async () => {
    setError("");
    setSuccess("");
    if (!selectedCustomer || !amount) {
      setError("Select a customer and enter an amount");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/payments/customer", {
        customerId: selectedCustomer._id,
        amount: Number(amount),
        method,
        notes,
      });
      setSuccess(
        `Payment recorded. New outstanding: Rs. ${Number(
          res.data.customerOutstanding
        ).toLocaleString()}`
      );
      setAmount("");
      setNotes("");
      setSelectedCustomer({
        ...selectedCustomer,
        outstandingBalance: res.data.customerOutstanding,
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  // Filter customers based on search query
  const filteredList = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery))
  );

  const renderCustomerItem = ({ item }) => (
    <TouchableOpacity style={styles.customerItem} onPress={() => selectCustomer(item)}>
      <Text style={styles.customerName}>{item.name}</Text>
      <Text style={styles.customerPhone}>{item.phone}</Text>
    </TouchableOpacity>
  );

  const isFrozen = !!customerId;

  return (
    <Screen>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={{ paddingBottom: 20 }}>
          <SectionTitle>Receive Customer Payment</SectionTitle>
          <Card>
            <ErrorText>{error}</ErrorText>
            {success ? (
              <Text style={{ color: COLORS.success, marginBottom: 10 }}>{success}</Text>
            ) : null}

            <Text style={{ color: COLORS.gray, marginBottom: 8, fontWeight: "600" }}>
              {isFrozen ? "Customer (frozen)" : "Select Customer:"}
            </Text>

            {/* Customer Selector */}
            <TouchableOpacity
              style={[
                styles.selector,
                isFrozen && { backgroundColor: COLORS.lightGray, opacity: 0.8 },
              ]}
              onPress={() => !isFrozen && setModalVisible(true)}
              disabled={isFrozen}
            >
              <Text style={styles.selectorText}>
                {selectedCustomer ? selectedCustomer.name : "Tap to choose a customer"}
              </Text>
              {!isFrozen && <Icon name="chevron-down" size={20} color={COLORS.gray} />}
            </TouchableOpacity>

            {isFrozen && selectedCustomer && (
              <Text style={{ color: COLORS.gray, fontSize: 12, marginTop: 4, marginBottom: 12 }}>
                * Customer is locked for this payment.
              </Text>
            )}

            {selectedCustomer && (
              <View style={styles.selectedCustomerInfo}>
                <Text style={{ fontWeight: "600", color: COLORS.dark }}>{selectedCustomer.name}</Text>
                <Text style={{ color: COLORS.gray }}>Phone: {selectedCustomer.phone}</Text>
                <Text style={{ color: COLORS.gray }}>
                  Current outstanding: Rs.{" "}
                  {Number(selectedCustomer.outstandingBalance || 0).toLocaleString()}
                </Text>
                {!isFrozen && (
                  <TouchableOpacity onPress={clearSelection} style={styles.clearButton}>
                    <Text style={{ color: COLORS.danger, fontSize: 12 }}>Change selection</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <Field
              label="Amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />

            <Text style={{ color: COLORS.gray, marginBottom: 8, fontWeight: "600", marginTop: 12 }}>
              Payment Method:
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {METHODS.map((m) => (
                <Button
                  key={m}
                  title={m.replace("_", " ")}
                  variant={method === m ? "primary" : "secondary"}
                  onPress={() => setMethod(m)}
                  size="small"
                  style={{ paddingHorizontal: 10, paddingVertical: 6 }}
                />
              ))}
            </View>

            <Field label="Notes (optional)" value={notes} onChangeText={setNotes} />
            <Button title="Record Payment" onPress={submit} loading={loading} />
          </Card>
        </View>
      </ScrollView>

      {/* Modal for selecting customer */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Customer</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon name="close" size={28} color={COLORS.dark} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color={COLORS.gray} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or phone..."
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

          <FlatList
            data={filteredList}
            keyExtractor={(item) => item._id}
            renderItem={renderCustomerItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No customers found</Text>
            }
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </Modal>
    </Screen>
  );
}

const styles = {
  selector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: COLORS.white,
  },
  selectorText: {
    fontSize: 16,
    color: COLORS.dark,
  },
  selectedCustomerInfo: {
    padding: 12,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    marginBottom: 12,
  },
  clearButton: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingTop: 40,
    paddingHorizontal: 16,
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: COLORS.white,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.dark,
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
  customerItem: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  customerPhone: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 2,
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.gray,
    fontSize: 16,
    marginTop: 20,
  },
};