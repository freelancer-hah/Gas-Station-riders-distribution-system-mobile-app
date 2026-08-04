// screens/admin/AdminRecordPaymentScreen.js
import React, { useCallback, useState, useRef } from "react";
import {
  ScrollView,
  View,
  Text,
  RefreshControl,
  Alert,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import {
  Screen,
  Card,
  Field,
  Button,
  SectionTitle,
  ErrorText,
  SuccessText,
  COLORS,
} from "../../components/UI";
import Icon from "react-native-vector-icons/Ionicons";

const METHODS = ["cash", "bank_transfer", "jazzcash", "easypaisa", "cheque"];

export default function AdminRecordPaymentScreen() {
  const [riders, setRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [riderLedger, setRiderLedger] = useState(null);
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

  const loadRiders = useCallback(async () => {
    try {
      const res = await api.get("/riders");
      // Sort alphabetically by name
      const sorted = (res.data || []).sort((a, b) => a.name.localeCompare(b.name));
      setRiders(sorted);
    } catch (err) {
      setError("Failed to load riders");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRiders();
    }, [loadRiders])
  );

  const loadRiderLedger = async (riderId) => {
    try {
      const res = await api.get(`/admin/rider-ledger/${riderId}`);
      setRiderLedger(res.data);
    } catch (err) {
      setError("Failed to load rider ledger");
    }
  };

  // Handle rider selection from modal
  const handleRiderSelect = (rider) => {
    setSelectedRider(rider);
    setModalVisible(false);
    setSearchQuery("");
    setAmount("");
    setError("");
    setSuccess("");
    loadRiderLedger(rider._id);
  };

  const clearSelection = () => {
    setSelectedRider(null);
    setRiderLedger(null);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRiders();
    if (selectedRider) {
      await loadRiderLedger(selectedRider._id);
    }
    setRefreshing(false);
  };

  const recordPayment = async () => {
    setError("");
    setSuccess("");

    if (!selectedRider) {
      setError("Please select a rider");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Please enter valid amount");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/admin/record-payment", {
        riderId: selectedRider._id,
        amount: Number(amount),
        method,
        notes,
      });

      setSuccess(
        `✅ Payment of Rs. ${Number(amount).toLocaleString()} recorded from ${selectedRider.name}`
      );
      setAmount("");
      setNotes("");

      loadRiderLedger(selectedRider._id);

      Alert.alert(
        "Payment Recorded",
        `Payment of Rs. ${Number(amount).toLocaleString()} recorded from ${selectedRider.name}\nRemaining Outstanding: Rs. ${res.data.ledger.outstandingBalance.toLocaleString()}`,
        [{ text: "OK" }]
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;

  // Filter riders for modal
  const filteredRiders = riders.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.phone && r.phone.includes(searchQuery))
  );

  const renderRiderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.riderItem}
      onPress={() => handleRiderSelect(item)}
    >
      <Text style={styles.riderName}>{item.name}</Text>
      <Text style={styles.riderPhone}>{item.phone}</Text>
    </TouchableOpacity>
  );

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
        >
          <SectionTitle icon="cash">Record Payment from Rider</SectionTitle>

          <Card>
            <ErrorText>{error}</ErrorText>
            <SuccessText>{success}</SuccessText>

            {/* Rider Selection - opens modal */}
            <Text style={{ color: COLORS.gray, marginBottom: 8, fontWeight: "600" }}>
              Select Rider:
            </Text>

            <TouchableOpacity
              style={styles.riderSelector}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.riderSelectorText}>
                {selectedRider ? selectedRider.name : "Tap to choose a rider"}
              </Text>
              <Icon name="chevron-down" size={20} color={COLORS.gray} />
            </TouchableOpacity>

            {selectedRider && riderLedger && (
              <View
                style={{
                  padding: 12,
                  backgroundColor: COLORS.lightGray,
                  borderRadius: 8,
                  marginBottom: 12,
                  marginTop: 12,
                }}
              >
                <Text style={{ fontWeight: "600", color: COLORS.dark }}>{selectedRider.name}</Text>
                <Text style={{ color: COLORS.gray }}>Phone: {selectedRider.phone}</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                  <Text style={{ color: COLORS.gray }}>Total Purchased:</Text>
                  <Text style={{ fontWeight: "600", color: COLORS.dark }}>
                    {formatMoney(riderLedger?.ledger?.totalPurchased || 0)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: COLORS.gray }}>Total Paid:</Text>
                  <Text style={{ fontWeight: "600", color: COLORS.success }}>
                    {formatMoney(riderLedger?.ledger?.totalPaid || 0)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: COLORS.gray }}>Outstanding:</Text>
                  <Text
                    style={{
                      fontWeight: "700",
                      color:
                        (riderLedger?.ledger?.outstandingBalance || 0) > 0 ? COLORS.danger : COLORS.success,
                    }}
                  >
                    {formatMoney(riderLedger?.ledger?.outstandingBalance || 0)}
                  </Text>
                </View>
              </View>
            )}

            <Field
              label="Amount (Rs.)"
              value={amount}
              onChangeText={setAmount}
              placeholder="Enter amount"
              keyboardType="numeric"
              icon="cash-outline"
            />

            <Text style={{ color: COLORS.gray, marginBottom: 8, fontWeight: "600", marginTop: 8 }}>
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

            <Field
              label="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Payment reference"
              icon="document-text"
            />

            <Button
              title="Record Payment"
              onPress={recordPayment}
              loading={loading}
              icon="checkmark"
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal for selecting rider */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Rider</Text>
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
            data={filteredRiders}
            keyExtractor={(item) => item._id}
            renderItem={renderRiderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No riders found</Text>
            }
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </Modal>
    </Screen>
  );
}

const styles = {
  riderSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border || "#ddd",
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: COLORS.white,
  },
  riderSelectorText: {
    fontSize: 16,
    color: COLORS.dark,
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
    borderColor: COLORS.border || "#ddd",
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
  riderItem: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || "#eee",
  },
  riderName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  riderPhone: {
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