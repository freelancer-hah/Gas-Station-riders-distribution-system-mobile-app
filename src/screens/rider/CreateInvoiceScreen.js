import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableWithoutFeedback,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
} from "react-native";
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
  Badge,
} from "../../components/UI";
import Icon from "react-native-vector-icons/Ionicons";

export default function CreateInvoiceScreen({ navigation }) {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  const [inventory, setInventory] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [cylinderSize, setCylinderSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [ratePerKg, setRatePerKg] = useState("");
  const [items, setItems] = useState([]);
  const [amountPaid, setAmountPaid] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(true);

  // Keyboard height tracking
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingInventory(true);
    setError("");
    try {
      const custRes = await api.get("/customers");
      setCustomers(custRes.data || []);
      setFilteredCustomers(custRes.data || []);

      const invRes = await api.get("/inventory/rider/me");
      setInventory(invRes.data || []);
    } catch (err) {
      console.error("Error loading data:", err);
      if (err.code === "ERR_NETWORK") {
        setError("Cannot connect to server. Make sure backend is running.");
      } else {
        setError(err?.response?.data?.message || "Failed to load data");
      }
    } finally {
      setLoadingInventory(false);
    }
  };

  const availableInventory = inventory.filter((item) => (item.filledQty || 0) > 0);

  const getInventoryItem = (size) => {
    return inventory.find((i) => i.cylinderSize.toLowerCase() === size.toLowerCase());
  };

  const handleCylinderSelect = (size) => {
    setCylinderSize(size);
    const item = getInventoryItem(size);
    if (item && item.ratePerKg > 0) {
      setRatePerKg(item.ratePerKg.toString());
    }
    setQuantity(1);
  };

  // Customer search handler
  const handleCustomerSearch = (text) => {
    setCustomerSearch(text);
    if (text.trim().length > 0) {
      const filtered = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(text.toLowerCase()) ||
          c.phone.includes(text)
      );
      setFilteredCustomers(filtered);
      setShowCustomerDropdown(true);
    } else {
      setFilteredCustomers(customers);
      setShowCustomerDropdown(false);
    }
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
    setError("");
    setSuccess("");
    Keyboard.dismiss();
  };

  const clearCustomerSelection = () => {
    setSelectedCustomer(null);
    setCustomerSearch("");
    setFilteredCustomers(customers);
    setShowCustomerDropdown(false);
  };

  // Quantity controls
  const increaseQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const addItem = () => {
    setError("");

    const invItem = getInventoryItem(cylinderSize);
    if (!invItem) {
      setError("Cylinder size not found in your inventory");
      return;
    }

    if (invItem.filledQty < quantity) {
      setError(`Insufficient stock. Available: ${invItem.filledQty}`);
      return;
    }

    if (!ratePerKg || Number(ratePerKg) <= 0) {
      setError("Please enter valid rate per kg");
      return;
    }

    const qty = quantity;
    const rate = Number(ratePerKg);
    const weightPerCylinder = invItem.weightKg || 0;
    const totalWeightKg = weightPerCylinder * qty;
    const lineTotal = totalWeightKg * rate;

    const existingIndex = items.findIndex((i) => i.cylinderSize === invItem.cylinderSize);
    if (existingIndex >= 0) {
      const updatedItems = [...items];
      const existing = updatedItems[existingIndex];
      const newQty = existing.quantity + qty;
      const newTotalWeight = weightPerCylinder * newQty;
      updatedItems[existingIndex] = {
        ...existing,
        quantity: newQty,
        totalWeightKg: newTotalWeight,
        lineTotal: newTotalWeight * rate,
        ratePerKg: rate,
      };
      setItems(updatedItems);
    } else {
      setItems([
        ...items,
        {
          cylinderSize: invItem.cylinderSize,
          weightKg: weightPerCylinder,
          quantity: qty,
          ratePerKg: rate,
          totalWeightKg,
          lineTotal,
        },
      ]);
    }

    setQuantity(1);
    setCylinderSize("");
    setRatePerKg("");
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const subTotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const previousBalance = selectedCustomer?.outstandingBalance || 0;
  const grandTotal = subTotal + previousBalance;

  // Helper to generate Invoice HTML (same as detail screen)
  const generateInvoiceHTML = (invoice) => {
    const itemsHtml = invoice.items.map(item => `
      <tr>
        <td>${item.cylinderSize}</td>
        <td>${item.quantity}</td>
        <td>${item.weightKg} kg</td>
        <td>Rs. ${item.ratePerKg}/kg</td>
        <td style="text-align:right;">Rs. ${Number(item.lineTotal || 0).toLocaleString()}</td>
      </tr>
    `).join('');

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
            .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; color: white; background: ${invoice.status === 'paid' ? '#24A148' : invoice.status === 'partial' ? '#FF9F1C' : '#DA1E28'}; }
          </style>
        </head>
        <body>
          <h1>GAS CYLINDER MANAGEMENT</h1>
          <p style="text-align:center; color:#666;">Sales Invoice</p>

          <div class="header">
            <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Date:</strong> ${new Date(invoice.invoiceDate || invoice.createdAt).toLocaleString()}</p>
            <p><strong>Status:</strong> <span class="badge">${invoice.status?.toUpperCase() || 'UNPAID'}</span></p>
            <p><strong>Customer:</strong> ${invoice.customer?.name || 'N/A'}</p>
            <p><strong>Phone:</strong> ${invoice.customer?.phone || 'N/A'}</p>
            <p><strong>Rider:</strong> ${invoice.rider?.name || 'N/A'}</p>
          </div>

          <h3>Items</h3>
          <table>
            <thead>
              <tr>
                <th>Size</th>
                <th>Qty</th>
                <th>Weight</th>
                <th>Rate</th>
                <th style="text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-item"><span>Total Gas</span><span>${invoice.items?.reduce((sum, i) => sum + (i.weightKg * i.quantity), 0)} kg</span></div>
            <div class="summary-item"><span>Sub Total</span><span>Rs. ${Number(invoice.subTotal || 0).toLocaleString()}</span></div>
            <div class="summary-item"><span>Previous Balance</span><span style="color:#DA1E28;">Rs. ${Number(invoice.previousBalance || 0).toLocaleString()}</span></div>
            <div class="summary-item"><span>Amount Paid</span><span style="color:#24A148;">Rs. ${Number(invoice.amountPaid || 0).toLocaleString()}</span></div>
            <div class="grand-total"><span>Grand Total</span><span>Rs. ${Number(invoice.grandTotal || 0).toLocaleString()}</span></div>
            <div class="summary-item"><span>Remaining Balance</span><span style="color:${invoice.remainingBalance > 0 ? '#DA1E28' : '#24A148'}; font-weight:bold;">Rs. ${Number(invoice.remainingBalance || 0).toLocaleString()}</span></div>
          </div>

          <div class="footer">
            <p>Generated from Gas Cylinder Management System</p>
            <p>© ${new Date().getFullYear()} All Rights Reserved</p>
          </div>
        </body>
      </html>
    `;
  };

  // 🔥 DIRECT PRINT FUNCTION (Called immediately after generation)
  const printInvoiceDirectly = async (invoice) => {
    setPrinting(true);
    try {
      const html = generateInvoiceHTML(invoice);

      if (Platform.OS === "web") {
        // Web: Direct print dialog
        const win = window.open('', '_blank');
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
            dialogTitle: "Invoice",
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

  // 🔥 UPDATED SUBMIT: Generate -> Direct Print -> Clear Form (No Navigation)
  const submitInvoice = async () => {
    setError("");
    setSuccess("");

    if (!selectedCustomer) {
      setError("Please select a customer");
      return;
    }
    if (items.length === 0) {
      setError("Add at least one cylinder item");
      return;
    }

    for (const item of items) {
      if (!item.cylinderSize || !item.weightKg || !item.quantity || !item.ratePerKg) {
        setError("Invalid item data. Please re-add items.");
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        customer: selectedCustomer._id,
        items: items.map((item) => ({
          cylinderSize: item.cylinderSize,
          weightKg: item.weightKg,
          quantity: item.quantity,
          ratePerKg: item.ratePerKg,
        })),
        amountPaid: Number(amountPaid || 0),
      };

      const res = await api.post("/invoices", payload);
      const invoice = res.data.invoice;

      // ✅ Directly print the invoice (no navigation)
      await printInvoiceDirectly(invoice);

      // Clear form after printing
      setItems([]);
      setAmountPaid("");
      setSelectedCustomer(null);
      setCustomerSearch("");
      setShowCustomerDropdown(false);
      
      loadData();
      setSuccess("✅ Invoice created and print dialog opened!");
      
    } catch (err) {
      console.error("❌ Invoice submission error:", err.response?.data || err.message);
      setError(err?.response?.data?.message || "Failed to create invoice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;

  const invItem = getInventoryItem(cylinderSize);
  const weight = invItem?.weightKg || 0;
  const qty = quantity;
  const rate = Number(ratePerKg) || 0;
  const totalWeight = weight * qty;
  const previewTotal = totalWeight * rate;

  // Render the main content (UI remains exactly the same)
  const renderContent = () => (
    <>
      <SectionTitle icon="people">Select Customer</SectionTitle>
      <Card>
        <ErrorText>{error}</ErrorText>
        <SuccessText>{success}</SuccessText>

        {/* Customer Search with Dropdown */}
        <Text style={{ color: COLORS.gray, marginBottom: 8, fontWeight: "600" }}>
          Search Customer:
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
              value={customerSearch}
              onChangeText={handleCustomerSearch}
              onFocus={() => {
                if (customerSearch.trim().length > 0) {
                  setShowCustomerDropdown(true);
                }
              }}
            />
            {customerSearch.length > 0 && (
              <TouchableWithoutFeedback onPress={clearCustomerSelection}>
                <Icon name="close-circle" size={20} color={COLORS.gray} />
              </TouchableWithoutFeedback>
            )}
          </View>

          {/* Dropdown list */}
          {showCustomerDropdown && (
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
              {loadingCustomers ? (
                <View style={{ padding: 20, alignItems: "center", backgroundColor: COLORS.white }}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : filteredCustomers.length === 0 ? (
                <View style={{ padding: 16, alignItems: "center", backgroundColor: COLORS.white }}>
                  <Text style={{ color: COLORS.gray }}>No customers found</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredCustomers}
                  keyExtractor={(item) => item._id}
                  keyboardShouldPersistTaps="handled"
                  style={{ backgroundColor: COLORS.white }}
                  renderItem={({ item }) => (
                    <TouchableWithoutFeedback onPress={() => selectCustomer(item)}>
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

        {/* Hide rest of form when dropdown is open */}
        {!showCustomerDropdown && (
          <>
            {selectedCustomer && (
              <View
                style={{
                  marginTop: 12,
                  padding: 12,
                  backgroundColor: COLORS.primaryLight,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontWeight: "600", color: COLORS.dark }}>{selectedCustomer.name}</Text>
                <Text style={{ color: COLORS.gray }}>Phone: {selectedCustomer.phone}</Text>
                <Text style={{ color: COLORS.gray }}>
                  Previous balance: {formatMoney(selectedCustomer.outstandingBalance || 0)}
                </Text>
              </View>
            )}

            <SectionTitle icon="cube">My Inventory</SectionTitle>

            {loadingInventory ? (
              <Card>
                <Text style={{ color: COLORS.gray }}>Loading inventory...</Text>
              </Card>
            ) : availableInventory.length === 0 ? (
              <Card>
                <View style={{ alignItems: "center", padding: 16 }}>
                  <Icon name="cube-outline" size={32} color={COLORS.gray} />
                  <Text style={{ color: COLORS.gray, marginTop: 8, textAlign: "center" }}>
                    No inventory available. Contact admin to assign cylinders.
                  </Text>
                </View>
              </Card>
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {availableInventory.map((item) => (
                  <TouchableWithoutFeedback
                    key={item._id}
                    onPress={() => handleCylinderSelect(item.cylinderSize)}
                  >
                    <View
                      style={{
                        padding: 10,
                        backgroundColor:
                          cylinderSize === item.cylinderSize ? COLORS.primary : COLORS.lightGray,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor:
                          cylinderSize === item.cylinderSize ? COLORS.primary : COLORS.border,
                        minWidth: 80,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: "600",
                          color: cylinderSize === item.cylinderSize ? COLORS.white : COLORS.dark,
                        }}
                      >
                        {item.cylinderSize}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: cylinderSize === item.cylinderSize ? COLORS.white : COLORS.gray,
                        }}
                      >
                        Stock: {item.filledQty}
                      </Text>
                      <Text
                        style={{
                          fontSize: 10,
                          color: cylinderSize === item.cylinderSize ? COLORS.white : COLORS.gray,
                          marginTop: 2,
                        }}
                      >
                        {item.weightKg || 0}kg/cyl
                      </Text>
                      {item.ratePerKg > 0 && (
                        <Text
                          style={{
                            fontSize: 10,
                            color: cylinderSize === item.cylinderSize ? COLORS.white : COLORS.gray,
                            marginTop: 2,
                          }}
                        >
                          Rate: Rs.{item.ratePerKg}/kg
                        </Text>
                      )}
                    </View>
                  </TouchableWithoutFeedback>
                ))}
              </View>
            )}

            <SectionTitle icon="add-circle">Add Cylinder Item</SectionTitle>
            <Card>
              <Field
                label="Cylinder Size"
                value={cylinderSize}
                onChangeText={setCylinderSize}
                placeholder="Select from inventory above"
                icon="cube-outline"
              />
              {cylinderSize && getInventoryItem(cylinderSize) && (
                <>
                  <Text style={{ color: COLORS.gray, marginBottom: 4, fontSize: 12 }}>
                    Available: {getInventoryItem(cylinderSize).filledQty} cylinders
                  </Text>
                  <Text style={{ color: COLORS.gray, marginBottom: 8, fontSize: 12 }}>
                    Weight: {getInventoryItem(cylinderSize).weightKg} kg per cylinder
                  </Text>
                </>
              )}

              {/* Quantity with + and - buttons */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: COLORS.gray, fontWeight: "600", marginBottom: 6 }}>
                  Number of Cylinders
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                  <TouchableWithoutFeedback onPress={decreaseQuantity} disabled={quantity <= 1}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: quantity > 1 ? COLORS.primary : COLORS.gray,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: quantity > 1 ? 1 : 0.5,
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
                    {quantity}
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
                label="Rate per kg (Rs.)"
                value={ratePerKg}
                onChangeText={setRatePerKg}
                placeholder="Auto-filled from purchase"
                keyboardType="numeric"
                icon="cash-outline"
              />

              {qty > 0 && ratePerKg && cylinderSize && getInventoryItem(cylinderSize) ? (
                <View
                  style={{
                    marginTop: 8,
                    padding: 12,
                    backgroundColor: COLORS.primaryLight,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontSize: 12, color: COLORS.gray }}>
                    Calculation: {weight}kg × {qty} = {totalWeight}kg × Rs.{rate}/kg
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.primary }}>
                    Total: {formatMoney(previewTotal)}
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.gray, marginTop: 4 }}>
                    Total Gas: {totalWeight} kg
                  </Text>
                </View>
              ) : null}

              <Button
                title="Add Item"
                variant="secondary"
                onPress={addItem}
                icon="add"
                style={{ marginTop: 8 }}
              />
            </Card>

            {items.length > 0 && (
              <>
                <SectionTitle icon="list">Invoice Items</SectionTitle>
                {items.map((it, idx) => (
                  <Card key={idx}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontWeight: "800", color: COLORS.dark }}>{it.cylinderSize}</Text>
                      <Badge variant="primary">x{it.quantity}</Badge>
                    </View>
                    <Text style={{ color: COLORS.gray, marginTop: 2 }}>
                      Total weight: {it.totalWeightKg} kg | Rate: Rs.{it.ratePerKg}/kg
                    </Text>
                    <Text style={{ fontWeight: "600", color: COLORS.dark }}>
                      Line total: {formatMoney(it.lineTotal)}
                    </Text>
                    <Button
                      title="Remove"
                      variant="danger"
                      onPress={() => removeItem(idx)}
                      style={{ marginTop: 8 }}
                      size="small"
                      icon="close"
                    />
                  </Card>
                ))}

                <Card>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ color: COLORS.gray }}>Sub Total</Text>
                    <Text style={{ fontWeight: "600", color: COLORS.dark }}>{formatMoney(subTotal)}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ color: COLORS.gray }}>Previous Balance</Text>
                    <Text style={{ fontWeight: "600", color: COLORS.danger }}>{formatMoney(previousBalance)}</Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: COLORS.border,
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: "800", color: COLORS.dark }}>
                      Grand Total
                    </Text>
                    <Text style={{ fontSize: 16, fontWeight: "800", color: COLORS.primary }}>
                      {formatMoney(grandTotal)}
                    </Text>
                  </View>
                  <Field
                    label="Amount Paid Now (optional)"
                    value={amountPaid}
                    onChangeText={setAmountPaid}
                    keyboardType="numeric"
                    icon="cash-outline"
                    style={{ marginTop: 8 }}
                  />
                </Card>

                {/* 🔥 Generate button - ab ye print preview direct kholega */}
                <Button
                  title={printing ? "Opening Print Preview..." : "Generate Invoice"}
                  onPress={submitInvoice}
                  loading={loading || printing}
                  icon="checkmark"
                  style={{ marginBottom: 20 }}
                />
              </>
            )}
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
          refreshControl={null} // no refresh needed, we have loadData on mount
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
          style={{ flex: 1 }}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}