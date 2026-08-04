// screens/admin/SellToRiderScreen.js
import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  RefreshControl,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  Modal,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
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

export default function SellToRiderScreen({ navigation, route }) {
  // ------------------------------------------------------------
  // 1. Rider selection state
  // ------------------------------------------------------------
  const [riders, setRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [riderSelectionDisabled, setRiderSelectionDisabled] = useState(false);

  // ------------------------------------------------------------
  // 2. Form fields
  // ------------------------------------------------------------
  const [cylinderWeight, setCylinderWeight] = useState("");
  const [noOfCylinders, setNoOfCylinders] = useState(1);
  const [ratePerKg, setRatePerKg] = useState("");

  // ------------------------------------------------------------
  // 3. UI state
  // ------------------------------------------------------------
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal & search
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Keyboard height (for responsive design, if needed)
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // ------------------------------------------------------------
  // 4. Auto‑select rider when passed via navigation
  // ------------------------------------------------------------
  useEffect(() => {
    if (route.params?.rider) {
      const rider = route.params.rider;
      setSelectedRider(rider);
      setRiderSelectionDisabled(true);
      setSuccess(`Selling to: ${rider.name}`);
    }
  }, [route.params]);

  // ------------------------------------------------------------
  // 5. Keyboard listeners (optional)
  // ------------------------------------------------------------
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ------------------------------------------------------------
  // 6. Load riders from API
  // ------------------------------------------------------------
  const loadRiders = useCallback(async () => {
    try {
      const res = await api.get("/riders");
      const sorted = (res.data || []).sort((a, b) => a.name.localeCompare(b.name));
      setRiders(sorted);
      setError("");
    } catch (err) {
      setError("Failed to load riders");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRiders();
    }, [loadRiders])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRiders();
    setRefreshing(false);
  };

  // ------------------------------------------------------------
  // 7. Rider selection handlers
  // ------------------------------------------------------------
  const handleRiderSelect = (rider) => {
    setSelectedRider(rider);
    setModalVisible(false);
    setSearchQuery("");
    setError("");
    setSuccess("");
    setRiderSelectionDisabled(false); // when manually selected, allow change later
  };

  const clearRiderSelection = () => {
    setSelectedRider(null);
    setRiderSelectionDisabled(false);
    setSuccess("");
  };

  // ------------------------------------------------------------
  // 8. Quantity controls (only enabled when weight is entered)
  // ------------------------------------------------------------
  const isWeightEntered = !!(cylinderWeight && Number(cylinderWeight) > 0);

  const increaseQuantity = () => {
    if (!isWeightEntered) return;
    setNoOfCylinders((prev) => prev + 1);
  };

  const decreaseQuantity = () => {
    if (!isWeightEntered) return;
    if (noOfCylinders > 1) {
      setNoOfCylinders((prev) => prev - 1);
    }
  };

  // ------------------------------------------------------------
  // 9. Print / PDF generation
  // ------------------------------------------------------------
  const generateInvoiceHTML = (invoice) => {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #0F62FE; border-bottom: 2px solid #0F62FE; padding-bottom: 10px; text-align: center; }
            .header { margin-bottom: 20px; }
            .header p { margin: 4px 0; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #0F62FE; color: white; padding: 8px; text-align: left; }
            td { padding: 6px 8px; border-bottom: 1px solid #ddd; }
            .summary { margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
            .grand-total { font-size: 18px; font-weight: bold; color: #0F62FE; margin-top: 10px; border-top: 2px solid #0F62FE; padding-top: 10px; }
            .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 15px; }
          </style>
        </head>
        <body>
          <h1>GAS CYLINDER MANAGEMENT</h1>
          <p style="text-align:center; color:#666;">Sale Invoice (Admin → Rider)</p>

          <div class="header">
            <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Date:</strong> ${new Date(invoice.createdAt || invoice.invoiceDate || Date.now()).toLocaleString()}</p>
            <p><strong>Rider:</strong> ${invoice.rider?.name || 'N/A'}</p>
            <p><strong>Phone:</strong> ${invoice.rider?.phone || 'N/A'}</p>
          </div>

          <h3>Transaction Details</h3>
          <table>
            <thead>
              <tr>
                <th>Cylinder Size</th>
                <th>Qty</th>
                <th>Weight/Cyl</th>
                <th>Total Wt</th>
                <th>Rate/kg</th>
                <th style="text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${invoice.cylinderSize}</td>
                <td>${invoice.quantity}</td>
                <td>${invoice.weightKg} kg</td>
                <td>${invoice.totalWeightKg} kg</td>
                <td>Rs. ${Number(invoice.ratePerKg).toLocaleString()}</td>
                <td style="text-align:right;">Rs. ${Number(invoice.totalAmount || 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div class="summary">
            <div class="grand-total">
              <span>Total Amount</span>
              <span>Rs. ${Number(invoice.totalAmount || 0).toLocaleString()}</span>
            </div>
            ${invoice.notes ? `<p style="margin-top:10px; color:#666;">Notes: ${invoice.notes}</p>` : ''}
          </div>

          <div class="footer">
            <p>Generated from Gas Cylinder Management System</p>
            <p>© ${new Date().getFullYear()} All Rights Reserved</p>
          </div>
        </body>
      </html>
    `;
  };

  const printInvoiceDirectly = async (invoice) => {
    setPrinting(true);
    try {
      const html = generateInvoiceHTML(invoice);

      if (Platform.OS === "web") {
        const win = window.open("", "_blank");
        win.document.write(html);
        win.document.close();
        win.print();
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: "Sale Invoice",
          });
        } else {
          Alert.alert("Saved", `Invoice saved to ${uri}`);
        }
      }
    } catch (err) {
      console.error("Print error:", err);
      Alert.alert("Error", "Failed to print invoice. Please try again.");
    } finally {
      setPrinting(false);
    }
  };

  // ------------------------------------------------------------
  // 10. Main sell function
  // ------------------------------------------------------------
  const sellToRider = async () => {
    setError("");
    setSuccess("");

    if (!selectedRider) {
      setError("Please select a rider");
      return;
    }
    if (!cylinderWeight || Number(cylinderWeight) <= 0) {
      setError("Please enter valid cylinder weight");
      return;
    }
    if (!ratePerKg || Number(ratePerKg) <= 0) {
      setError("Please enter valid rate per kg");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/admin/sell-to-rider", {
        riderId: selectedRider._id,
        weightKg: Number(cylinderWeight),
        filledQty: noOfCylinders,
        ratePerKg: Number(ratePerKg),
      });

      const invoice = res.data.invoice;

      await printInvoiceDirectly(invoice);

      setSuccess(`✅ Sold ${noOfCylinders} cylinders of ${cylinderWeight}kg to ${selectedRider.name}`);
      setCylinderWeight("");
      setNoOfCylinders(1);
      setRatePerKg("");
      setSelectedRider(null);
      setRiderSelectionDisabled(false); // re‑enable for next sale
      loadRiders();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to sell to rider");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------
  // 11. Helpers
  // ------------------------------------------------------------
  const formatMoney = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;

  const weight = Number(cylinderWeight) || 0;
  const qty = noOfCylinders;
  const rate = Number(ratePerKg) || 0;
  const totalWeight = weight * qty;
  const totalAmount = totalWeight * rate;

  // ------------------------------------------------------------
  // 12. Filter riders for modal
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  // 13. Render main content
  // ------------------------------------------------------------
  const renderContent = () => (
    <>
      <SectionTitle icon="cart">Sell Cylinders to Rider</SectionTitle>

      <Card>
        <ErrorText>{error}</ErrorText>
        <SuccessText>{success}</SuccessText>

        {/* Rider Selection – disabled when pre‑selected */}
        <Text style={{ color: COLORS.gray, marginBottom: 8, fontWeight: "600" }}>
          Select Rider:
        </Text>

        <TouchableOpacity
          style={[
            styles.riderSelector,
            riderSelectionDisabled && { backgroundColor: COLORS.lightGray, opacity: 0.8 }
          ]}
          onPress={() => !riderSelectionDisabled && setModalVisible(true)}
          disabled={riderSelectionDisabled}
        >
          <Text style={styles.riderSelectorText}>
            {selectedRider ? selectedRider.name : "Tap to choose a rider"}
          </Text>
          {!riderSelectionDisabled && <Icon name="chevron-down" size={20} color={COLORS.gray} />}
        </TouchableOpacity>

        {riderSelectionDisabled && (
          <Text style={{ color: COLORS.gray, fontSize: 12, marginTop: 4, marginBottom: 12 }}>
            * Selling to this rider. Tap "Sell to Rider" to proceed.
          </Text>
        )}

        {selectedRider && (
          <View
            style={{
              marginTop: 12,
              padding: 12,
              backgroundColor: COLORS.primaryLight,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontWeight: "600", color: COLORS.dark }}>
              {selectedRider.name}
            </Text>
            <Text style={{ color: COLORS.gray }}>Phone: {selectedRider.phone}</Text>
          </View>
        )}

        <View
          style={{
            padding: 12,
            backgroundColor: COLORS.primaryLight,
            borderRadius: 8,
            marginTop: 12,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontWeight: "700", color: COLORS.primary, marginBottom: 4 }}>
            📦 Enter Cylinder Details
          </Text>
          <Text style={{ color: COLORS.gray, fontSize: 12 }}>
            Admin can sell ANY cylinder size to rider
          </Text>
        </View>

        <Field
          label="Cylinder Weight (kg) *"
          value={cylinderWeight}
          onChangeText={setCylinderWeight}
          placeholder="e.g. 10, 25, 48"
          keyboardType="numeric"
          icon="scale-outline"
        />

        {/* Quantity with + and - buttons – centered */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: COLORS.gray, fontWeight: "600", marginBottom: 6 }}>
            Number of Cylinders *
          </Text>
          <View style={styles.quantityRow}>
            <TouchableOpacity
              onPress={decreaseQuantity}
              disabled={!isWeightEntered || noOfCylinders <= 1}
              style={[
                styles.quantityButton,
                {
                  backgroundColor: isWeightEntered && noOfCylinders > 1 ? COLORS.primary : COLORS.gray,
                  opacity: isWeightEntered && noOfCylinders > 1 ? 1 : 0.5,
                },
              ]}
            >
              <Icon name="remove" size={24} color={COLORS.white} />
            </TouchableOpacity>

            <Text style={styles.quantityNumber}>{noOfCylinders}</Text>

            <TouchableOpacity
              onPress={increaseQuantity}
              disabled={!isWeightEntered}
              style={[
                styles.quantityButton,
                {
                  backgroundColor: isWeightEntered ? COLORS.primary : COLORS.gray,
                  opacity: isWeightEntered ? 1 : 0.5,
                },
              ]}
            >
              <Icon name="add" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ✅ Rate field is now ALWAYS editable – removed the disabling logic */}
        <Field
          label="Rate per kg (Rs.) *"
          value={ratePerKg}
          onChangeText={setRatePerKg}
          placeholder="e.g. 10"
          keyboardType="numeric"
          icon="cash-outline"
        />

        {cylinderWeight && noOfCylinders > 0 && ratePerKg && (
          <View
            style={{
              marginTop: 12,
              padding: 16,
              backgroundColor: COLORS.primaryLight,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: COLORS.primary,
            }}
          >
            <Text style={{ fontWeight: "700", color: COLORS.dark, marginBottom: 8 }}>
              📊 Sale Summary
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ color: COLORS.gray }}>Cylinder:</Text>
              <Text style={{ fontWeight: "600", color: COLORS.dark }}>{weight}kg</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ color: COLORS.gray }}>Total Gas:</Text>
              <Text style={{ fontWeight: "600", color: COLORS.dark }}>
                {weight}kg × {qty} = {totalWeight}kg
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ color: COLORS.gray }}>Rate:</Text>
              <Text style={{ fontWeight: "600", color: COLORS.dark }}>Rs. {rate}/kg</Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 8,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: COLORS.border,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.dark }}>
                Total Amount:
              </Text>
              <Text style={{ fontSize: 16, fontWeight: "800", color: COLORS.primary }}>
                {formatMoney(totalAmount)}
              </Text>
            </View>
          </View>
        )}

        <Button
          title={printing ? "Opening Print Preview..." : "Sell to Rider"}
          onPress={sellToRider}
          loading={loading || printing}
          icon="checkmark"
          style={{ marginTop: 12 }}
        />
      </Card>

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
    </>
  );

  // ------------------------------------------------------------
  // 14. Main return with KeyboardAvoidingView
  // ------------------------------------------------------------
  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={renderContent()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
          style={{ flex: 1 }}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

// ------------------------------------------------------------
// 15. Styles
// ------------------------------------------------------------
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
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.dark,
    minWidth: 40,
    textAlign: "center",
  },
};