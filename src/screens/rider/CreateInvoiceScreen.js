// screens/rider/CreateInvoiceScreen.js
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableWithoutFeedback,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  Modal,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useRoute } from "@react-navigation/native";
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

const PAYMENT_METHODS = ["cash", "bank_transfer", "jazzcash", "easypaisa", "cheque"];

export default function CreateInvoiceScreen({ navigation }) {
  const route = useRoute();
  const { customerId } = route.params || {};

  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSelectionDisabled, setCustomerSelectionDisabled] = useState(false);

  const [inventory, setInventory] = useState([]);

  const [cylinderSize, setCylinderSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [ratePerKg, setRatePerKg] = useState("");
  const [items, setItems] = useState([]);

  // Payment state
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentCollected, setPaymentCollected] = useState(false);

  // Modal visibility
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [confirmationModalVisible, setConfirmationModalVisible] = useState(false);
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(true);

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Keyboard listeners
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

  // Auto-select customer if customerId is passed
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

  const loadData = async () => {
    setLoadingInventory(true);
    setError("");
    try {
      const custRes = await api.get("/customers");
      setCustomers(custRes.data || []);

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

  // Customer selection from modal
  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setCustomerModalVisible(false);
    setCustomerSearchQuery("");
    setError("");
    setSuccess("");
    if (!customerId) {
      setCustomerSelectionDisabled(false);
    }
  };

  const clearCustomerSelection = () => {
    if (customerId) return;
    setSelectedCustomer(null);
    setCustomerSelectionDisabled(false);
    setSuccess("");
  };

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
    setPaymentCollected(false);
    setPaymentAmount("");
  };

  const removeItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
    setPaymentCollected(false);
    setPaymentAmount("");
  };

  const subTotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const previousBalance = selectedCustomer?.outstandingBalance || 0;
  const grandTotal = subTotal + previousBalance;
  const remainingAfterPayment = grandTotal - (Number(paymentAmount) || 0);

  // Payment modal handlers
  const openPaymentModal = () => {
    if (items.length === 0) {
      setError("Add items first before collecting payment");
      return;
    }
    setPaymentModalVisible(true);
  };

  const confirmPayment = () => {
    const amount = Number(paymentAmount) || 0;
    if (amount > 0 && amount > grandTotal) {
      Alert.alert(
        "Overpayment",
        `Payment amount (${paymentAmount}) exceeds grand total (${grandTotal}). Do you want to continue?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Continue",
            onPress: () => {
              setPaymentCollected(true);
              setPaymentModalVisible(false);
              setConfirmationModalVisible(true);
            },
          },
        ]
      );
    } else {
      if (amount > 0) {
        setPaymentCollected(true);
      } else {
        setPaymentCollected(false);
      }
      setPaymentModalVisible(false);
      setConfirmationModalVisible(true);
    }
  };

  const resetPayment = () => {
    setPaymentAmount("");
    setPaymentMethod("cash");
    setPaymentNotes("");
    setPaymentCollected(false);
  };

  const generateInvoiceHTML = (invoice, payment) => {
    const itemsHtml = invoice.items
      .map(
        (item) => `
      <tr>
        <td>${item.cylinderSize}</td>
        <td>${item.quantity}</td>
        <td>${item.weightKg} kg</td>
        <td>Rs. ${item.ratePerKg}/kg</td>
        <td style="text-align:right;">Rs. ${Number(item.lineTotal || 0).toLocaleString()}</td>
      </tr>
    `
      )
      .join("");

    const paymentHtml = payment
      ? `
        <div style="margin-top: 8px; padding: 8px; background: #e8f8e8; border-radius: 6px;">
          <p style="margin: 2px 0; color: #24A148;">
            <strong>Payment Received:</strong> Rs. ${Number(payment.amount).toLocaleString()}
            via ${payment.method.replace(/_/g, " ")}
            on ${new Date(payment.paymentDate).toLocaleString()}
          </p>
          ${payment.notes ? `<p style="margin: 2px 0; color: #666;">${payment.notes}</p>` : ""}
        </div>
      `
      : "";

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
            .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; color: white; background: ${
              invoice.status === "paid"
                ? "#24A148"
                : invoice.status === "partial"
                ? "#FF9F1C"
                : "#DA1E28"
            }; }
          </style>
        </head>
        <body>
          <h1>GAS CYLINDER MANAGEMENT</h1>
          <p style="text-align:center; color:#666;">Sales Invoice</p>

          <div class="header">
            <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Date:</strong> ${new Date(
              invoice.invoiceDate || invoice.createdAt
            ).toLocaleString()}</p>
            <p><strong>Status:</strong> <span class="badge">${(
              invoice.status?.toUpperCase() || "UNPAID"
            )}</span></p>
            <p><strong>Customer:</strong> ${invoice.customer?.name || "N/A"}</p>
            <p><strong>Phone:</strong> ${invoice.customer?.phone || "N/A"}</p>
            <p><strong>Rider:</strong> ${invoice.rider?.name || "N/A"}</p>
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
            <div class="summary-item"><span>Total Gas</span><span>${invoice.items?.reduce(
              (sum, i) => sum + i.weightKg * i.quantity,
              0
            )} kg</span></div>
            <div class="summary-item"><span>Sub Total</span><span>Rs. ${Number(
              invoice.subTotal || 0
            ).toLocaleString()}</span></div>
            <div class="summary-item"><span>Previous Balance</span><span style="color:#DA1E28;">Rs. ${Number(
              invoice.previousBalance || 0
            ).toLocaleString()}</span></div>
            <div class="summary-item"><span>Amount Paid</span><span style="color:#24A148;">Rs. ${Number(
              invoice.amountPaid || 0
            ).toLocaleString()}</span></div>
            ${paymentHtml}
            <div class="grand-total"><span>Grand Total</span><span>Rs. ${Number(
              invoice.grandTotal || 0
            ).toLocaleString()}</span></div>
            <div class="summary-item"><span>Remaining Balance</span><span style="color:${
              invoice.remainingBalance > 0 ? "#DA1E28" : "#24A148"
            }; font-weight:bold;">Rs. ${Number(
              invoice.remainingBalance || 0
            ).toLocaleString()}</span></div>
          </div>

          <div class="footer">
            <p>Generated from Gas Cylinder Management System</p>
            <p>© ${new Date().getFullYear()} All Rights Reserved</p>
          </div>
        </body>
      </html>
    `;
  };

  const printInvoiceDirectly = async (invoice, payment) => {
    setPrinting(true);
    try {
      const html = generateInvoiceHTML(invoice, payment);

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

    const paidAmount = paymentCollected ? Number(paymentAmount) || 0 : 0;

    setConfirmationModalVisible(false);

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
        amountPaid: paidAmount,
        paymentMethod: paymentMethod,
        paymentNotes: paymentNotes,
      };

      const res = await api.post("/invoices", payload);
      const invoice = res.data.invoice;
      const payment = res.data.payment;

      await printInvoiceDirectly(invoice, payment);

      setItems([]);
      setPaymentAmount("");
      setPaymentMethod("cash");
      setPaymentNotes("");
      setPaymentCollected(false);
      setSelectedCustomer(null);
      setCustomerSelectionDisabled(false);

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

  const isCustomerFrozen = !!customerId;

  // Filter customers for modal
  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    c.phone.includes(customerSearchQuery)
  );

  const renderCustomerItem = ({ item }) => (
    <TouchableOpacity
      style={styles.customerItem}
      onPress={() => handleCustomerSelect(item)}
    >
      <Text style={styles.customerName}>{item.name}</Text>
      <Text style={styles.customerPhone}>{item.phone}</Text>
    </TouchableOpacity>
  );

  const renderContent = () => (
    <>
      <SectionTitle icon="people">Select Customer</SectionTitle>
      <Card>
        <ErrorText>{error}</ErrorText>
        <SuccessText>{success}</SuccessText>

        <Text style={{ color: COLORS.gray, marginBottom: 8, fontWeight: "600" }}>
          {isCustomerFrozen ? "Customer (frozen)" : "Select Customer:"}
        </Text>

        <TouchableOpacity
          style={[
            styles.customerSelector,
            isCustomerFrozen && { backgroundColor: COLORS.lightGray, opacity: 0.8 },
          ]}
          onPress={() => !isCustomerFrozen && setCustomerModalVisible(true)}
          disabled={isCustomerFrozen}
        >
          <Text style={styles.customerSelectorText}>
            {selectedCustomer ? selectedCustomer.name : "Tap to choose a customer"}
          </Text>
          {!isCustomerFrozen && <Icon name="chevron-down" size={20} color={COLORS.gray} />}
        </TouchableOpacity>

        {isCustomerFrozen && selectedCustomer && (
          <Text style={{ color: COLORS.gray, fontSize: 12, marginTop: 4, marginBottom: 12 }}>
            * Customer is locked for this invoice.
          </Text>
        )}

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

          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: COLORS.gray, fontWeight: "600", marginBottom: 6 }}>
              Number of Cylinders
            </Text>
            {/* ====== UPDATED: Rectangle background around quantity controls ====== */}
            <View style={styles.qtyContainer}>
              <TouchableWithoutFeedback
                onPress={decreaseQuantity}
                disabled={!cylinderSize || quantity <= 1}
              >
                <View
                  style={[
                    styles.qtyBtn,
                    { opacity: cylinderSize && quantity > 1 ? 1 : 0.5 },
                  ]}
                >
                  <Icon name="remove" size={24} color={COLORS.white} />
                </View>
              </TouchableWithoutFeedback>

              <Text style={styles.qtyNumber}>{quantity}</Text>

              <TouchableWithoutFeedback
                onPress={increaseQuantity}
                disabled={!cylinderSize}
              >
                <View
                  style={[
                    styles.qtyBtn,
                    { opacity: cylinderSize ? 1 : 0.5 },
                  ]}
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
            editable={false}
            style={{ fontSize: 18, fontWeight: "600", color: COLORS.dark }}
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
            disabled={!cylinderSize}
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

            {/* Summary and Collect Payment */}
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

              {/* Payment Collection Status */}
              {paymentCollected && (
                <View style={{ marginTop: 12, padding: 12, backgroundColor: COLORS.successLight, borderRadius: 8 }}>
                  <Text style={{ color: COLORS.success, fontWeight: "700" }}>
                    ✅ Payment Collected: {formatMoney(paymentAmount)}
                  </Text>
                  <Text style={{ color: COLORS.gray, fontSize: 12 }}>
                    Method: {paymentMethod.replace("_", " ")}
                    {paymentNotes ? ` | Notes: ${paymentNotes}` : ""}
                  </Text>
                  <Text style={{ color: COLORS.gray, fontSize: 12 }}>
                    Remaining: {formatMoney(remainingAfterPayment)}
                  </Text>
                  <Button
                    title="Change Payment"
                    variant="secondary"
                    size="small"
                    onPress={() => {
                      resetPayment();
                      openPaymentModal();
                    }}
                    style={{ marginTop: 8 }}
                  />
                </View>
              )}

              <View style={{ marginTop: 12, flexDirection: "row", gap: 10 }}>
                <Button
                  title="Collect Payment"
                  variant="primary"
                  onPress={openPaymentModal}
                  icon="cash"
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          </>
        )}
      </Card>

      {/* ====== PAYMENT COLLECTION MODAL ====== */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={paymentModalVisible}
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Collect Payment</Text>
              <TouchableWithoutFeedback onPress={() => setPaymentModalVisible(false)}>
                <Icon name="close" size={28} color={COLORS.gray} />
              </TouchableWithoutFeedback>
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Grand Total</Text>
              <Text style={styles.summaryValue}>{formatMoney(grandTotal)}</Text>
              {paymentCollected && (
                <>
                  <Text style={styles.summaryLabel}>Already Collected</Text>
                  <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                    {formatMoney(paymentAmount)}
                  </Text>
                </>
              )}
              <Text style={styles.summaryLabel}>Remaining to Pay</Text>
              <Text style={[styles.summaryValue, { color: COLORS.danger }]}>
                {formatMoney(paymentCollected ? remainingAfterPayment : grandTotal)}
              </Text>
            </View>

            <Field
              label="Amount to Pay (Rs.)"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="numeric"
              placeholder="Enter amount (0 for unpaid)"
              icon="cash-outline"
            />

            <Text style={{ color: COLORS.gray, marginBottom: 8, fontWeight: "600", marginTop: 8 }}>
              Payment Method:
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {PAYMENT_METHODS.map((m) => (
                <Button
                  key={m}
                  title={m.replace("_", " ")}
                  variant={paymentMethod === m ? "primary" : "secondary"}
                  onPress={() => setPaymentMethod(m)}
                  size="small"
                  style={{ paddingHorizontal: 10, paddingVertical: 6 }}
                />
              ))}
            </View>

            <Field
              label="Notes (optional)"
              value={paymentNotes}
              onChangeText={setPaymentNotes}
              placeholder="Payment reference or notes"
              icon="document-text"
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setPaymentModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Confirm Payment"
                variant="primary"
                onPress={confirmPayment}
                style={{ flex: 2 }}
                icon="checkmark"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ====== CONFIRMATION MODAL ====== */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={confirmationModalVisible}
        onRequestClose={() => setConfirmationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Invoice</Text>
              <TouchableWithoutFeedback onPress={() => setConfirmationModalVisible(false)}>
                <Icon name="close" size={28} color={COLORS.gray} />
              </TouchableWithoutFeedback>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Customer</Text>
                <Text style={styles.summaryValue}>{selectedCustomer?.name}</Text>
                <Text style={styles.summaryLabel}>Items</Text>
                <Text style={styles.summaryValue}>{items.length} item(s)</Text>
                <View style={{ marginTop: 8 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={styles.summaryLabel}>Sub Total</Text>
                    <Text style={styles.summaryValue}>{formatMoney(subTotal)}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={styles.summaryLabel}>Previous Balance</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.danger }]}>{formatMoney(previousBalance)}</Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 4 }}>
                    <Text style={[styles.summaryLabel, { fontWeight: "bold" }]}>Grand Total</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.primary }]}>{formatMoney(grandTotal)}</Text>
                  </View>
                  {paymentCollected && (
                    <>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                        <Text style={styles.summaryLabel}>Payment Collected</Text>
                        <Text style={[styles.summaryValue, { color: COLORS.success }]}>{formatMoney(paymentAmount)}</Text>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={styles.summaryLabel}>Remaining</Text>
                        <Text style={[styles.summaryValue, { color: COLORS.danger }]}>{formatMoney(remainingAfterPayment)}</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>

              <View style={{ marginTop: 16 }}>
                <Button
                  title={printing ? "Opening..." : "Generate Invoice"}
                  variant="primary"
                  onPress={submitInvoice}
                  loading={printing || loading}
                  icon="checkmark"
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ====== CUSTOMER SELECTION MODAL ====== */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={customerModalVisible}
        onRequestClose={() => setCustomerModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Customer</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: COLORS.primary,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 6,
                }}
                onPress={() => {
                  setCustomerModalVisible(false);
                  navigation.navigate("Customers");
                }}
              >
                <Icon name="person-add" size={16} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "700", marginLeft: 4, fontSize: 13 }}>
                  + Add Customer
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCustomerModalVisible(false)}>
                <Icon name="close" size={28} color={COLORS.dark} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color={COLORS.gray} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or phone..."
              value={customerSearchQuery}
              onChangeText={setCustomerSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {customerSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setCustomerSearchQuery("")}>
                <Icon name="close-circle" size={20} color={COLORS.gray} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredCustomers}
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
    </>
  );

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
          style={{ flex: 1 }}
        >
          {renderContent()}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Customer Selector
  customerSelector: {
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
  customerSelectorText: {
    fontSize: 16,
    color: COLORS.dark,
  },
  // Customer Modal
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
  customerItem: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || "#eee",
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
  // Payment & Confirmation modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
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
  summaryBox: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  summaryLabel: {
    color: COLORS.gray,
    fontSize: 12,
    marginTop: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },

  // ====== NEW: Rectangle container for quantity controls ======
  qtyContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.lightGray,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: 'center',
    gap: 20,
  },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.dark,
    minWidth: 40,
    textAlign: "center",
  },
});