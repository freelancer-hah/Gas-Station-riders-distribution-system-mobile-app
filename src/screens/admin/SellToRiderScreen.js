import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  RefreshControl,
  TouchableWithoutFeedback,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
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

export default function SellToRiderScreen({ navigation }) {
  const [riders, setRiders] = useState([]);
  const [filteredRiders, setFilteredRiders] = useState([]);
  const [riderSearch, setRiderSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingRiders, setLoadingRiders] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  const [selectedRider, setSelectedRider] = useState(null);

  const [cylinderWeight, setCylinderWeight] = useState("");
  const [noOfCylinders, setNoOfCylinders] = useState(1);
  const [ratePerKg, setRatePerKg] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Keyboard height track karne ke liye
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  const loadRiders = useCallback(async () => {
    setLoadingRiders(true);
    try {
      const res = await api.get("/riders");
      setRiders(res.data || []);
      setFilteredRiders(res.data || []);
      setError("");
    } catch (err) {
      setError("Failed to load riders");
    } finally {
      setLoadingRiders(false);
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

  // Rider search handler
  const handleRiderSearch = (text) => {
    setRiderSearch(text);
    if (text.trim().length > 0) {
      const filtered = riders.filter(
        (r) =>
          r.name.toLowerCase().includes(text.toLowerCase()) ||
          r.phone.includes(text)
      );
      setFilteredRiders(filtered);
      setShowDropdown(true);
    } else {
      setFilteredRiders(riders);
      setShowDropdown(false);
    }
  };

  const selectRider = (rider) => {
    setSelectedRider(rider);
    setRiderSearch(rider.name);
    setShowDropdown(false);
    setError("");
    setSuccess("");
    Keyboard.dismiss();
  };

  const clearRiderSelection = () => {
    setSelectedRider(null);
    setRiderSearch("");
    setFilteredRiders(riders);
    setShowDropdown(false);
  };

  // Quantity controls
  const increaseQuantity = () => {
    setNoOfCylinders((prev) => prev + 1);
  };

  const decreaseQuantity = () => {
    if (noOfCylinders > 1) {
      setNoOfCylinders((prev) => prev - 1);
    }
  };

  // Helper to generate Invoice HTML (Admin → Rider)
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
            .summary-item { display: flex; justify-content: space-between; margin-bottom: 4px; }
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

  // 🔥 Direct Print Function (No navigation)
  const printInvoiceDirectly = async (invoice) => {
    setPrinting(true);
    try {
      const html = generateInvoiceHTML(invoice);

      if (Platform.OS === "web") {
        // Web: Direct print dialog
        const win = window.open("", "_blank");
        win.document.write(html);
        win.document.close();
        win.print();
      } else {
        // Native: Generate PDF and share (device print option available)
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

  // 🔥 Updated: Sell -> Direct Print -> Clear Form
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

      // ✅ Directly print the invoice (no navigation)
      await printInvoiceDirectly(invoice);

      // Clear form
      setSuccess(`✅ Sold ${noOfCylinders} cylinders of ${cylinderWeight}kg to ${selectedRider.name}`);
      setCylinderWeight("");
      setNoOfCylinders(1);
      setRatePerKg("");
      setSelectedRider(null);
      setRiderSearch("");
      setFilteredRiders(riders);
      setShowDropdown(false);

      loadRiders();

    } catch (err) {
      setError(err?.response?.data?.message || "Failed to sell to rider");
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;

  const weight = Number(cylinderWeight) || 0;
  const qty = noOfCylinders;
  const rate = Number(ratePerKg) || 0;
  const totalWeight = weight * qty;
  const totalAmount = totalWeight * rate;

  // Render the main content
  const renderContent = () => (
    <>
      <SectionTitle icon="cart">Sell Cylinders to Rider</SectionTitle>

      <Card>
        <ErrorText>{error}</ErrorText>
        <SuccessText>{success}</SuccessText>

        {/* Rider Search with Dropdown */}
        <Text style={{ color: COLORS.gray, marginBottom: 8, fontWeight: "600" }}>
          Search Rider:
        </Text>

        <View style={{ position: "relative", zIndex: 50 }} ref={dropdownRef}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: COLORS.white,
              borderRadius: 8,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Icon name="search" size={20} color={COLORS.gray} />
            <TextInput
              ref={searchRef}
              style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 16 }}
              placeholder="Search by name or phone..."
              placeholderTextColor={COLORS.gray}
              value={riderSearch}
              onChangeText={handleRiderSearch}
              onFocus={() => {
                if (riderSearch.trim().length > 0) {
                  setShowDropdown(true);
                }
              }}
            />
            {riderSearch.length > 0 && (
              <TouchableWithoutFeedback onPress={clearRiderSelection}>
                <Icon name="close-circle" size={20} color={COLORS.gray} />
              </TouchableWithoutFeedback>
            )}
          </View>

          {/* Dropdown list */}
          {showDropdown && (
            <View
              style={{
                position: "absolute",
                top: 55,
                left: 0,
                right: 0,
                backgroundColor: COLORS.white,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: COLORS.border,
                maxHeight: keyboardHeight > 0 ? 150 : 200,
                overflow: "hidden",
                zIndex: 999,
                elevation: 15,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
              }}
            >
              {loadingRiders ? (
                <View style={{ padding: 20, alignItems: "center", backgroundColor: COLORS.white }}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : filteredRiders.length === 0 ? (
                <View style={{ padding: 16, alignItems: "center", backgroundColor: COLORS.white }}>
                  <Text style={{ color: COLORS.gray }}>No riders found</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredRiders}
                  keyExtractor={(item) => item._id}
                  keyboardShouldPersistTaps="handled"
                  style={{ backgroundColor: COLORS.white }}
                  renderItem={({ item }) => (
                    <TouchableWithoutFeedback onPress={() => selectRider(item)}>
                      <View
                        style={{
                          padding: 12,
                          borderBottomWidth: 1,
                          borderBottomColor: COLORS.border,
                          backgroundColor: COLORS.white,
                        }}
                      >
                        <Text style={{ fontWeight: "600", color: COLORS.dark }}>{item.name}</Text>
                        <Text style={{ color: COLORS.gray, fontSize: 12 }}>{item.phone}</Text>
                      </View>
                    </TouchableWithoutFeedback>
                  )}
                />
              )}
            </View>
          )}
        </View>

        {/* Dropdown khula ho to ye pura form chupa rehta hai */}
        {!showDropdown && (
          <>
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

            {/* Quantity with + and - buttons */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: COLORS.gray, fontWeight: "600", marginBottom: 6 }}>
                Number of Cylinders *
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                <TouchableWithoutFeedback onPress={decreaseQuantity} disabled={noOfCylinders <= 1}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: noOfCylinders > 1 ? COLORS.primary : COLORS.gray,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: noOfCylinders > 1 ? 1 : 0.5,
                    }}
                  >
                    <Icon name="remove" size={24} color={COLORS.white} />
                  </View>
                </TouchableWithoutFeedback>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "700",
                    color: COLORS.dark,
                    minWidth: 40,
                    textAlign: "center",
                  }}
                >
                  {noOfCylinders}
                </Text>
                <TouchableWithoutFeedback onPress={increaseQuantity}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: COLORS.primary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="add" size={24} color={COLORS.white} />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </View>

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

            {/* 🔥 Updated Button - ab ye direct print preview kholega */}
            <Button
              title={printing ? "Opening Print Preview..." : "Sell to Rider"}
              onPress={sellToRider}
              loading={loading || printing}
              icon="checkmark"
              style={{ marginTop: 12 }}
            />
          </>
        )}
      </Card>
    </>
  );

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