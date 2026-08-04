// screens/rider/RiderDashboardScreen.js
import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  RefreshControl,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import {
  Screen,
  SectionTitle,
  StatBox,
  Card,
  Button,
  COLORS,
  Badge,
  Field,
  ErrorText,
  SuccessText,
} from "../../components/UI";
import Icon from "react-native-vector-icons/Ionicons";

const PAYMENT_METHODS = ["cash", "bank_transfer", "jazzcash", "easypaisa", "cheque"];

export default function RiderDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [showInventory, setShowInventory] = useState(false);

  // Quick Sale State
  const [quickSaleVisible, setQuickSaleVisible] = useState(false);
  const [quickSaleInventory, setQuickSaleInventory] = useState([]);
  const [selectedCylinder, setSelectedCylinder] = useState(null);
  const [quickSaleQty, setQuickSaleQty] = useState(1);
  const [quickSaleCustomer, setQuickSaleCustomer] = useState(null);
  const [quickSaleCart, setQuickSaleCart] = useState([]);
  const [quickSaleCustomerModalVisible, setQuickSaleCustomerModalVisible] = useState(false);
  const [quickSaleCustomerSearch, setQuickSaleCustomerSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [quickSaleError, setQuickSaleError] = useState("");
  const [quickSaleSuccess, setQuickSaleSuccess] = useState("");
  const [quickSaleLoading, setQuickSaleLoading] = useState(false);
  const [quickSalePrinting, setQuickSalePrinting] = useState(false);

  // Payment state for Quick Sale
  const [quickSalePaymentAmount, setQuickSalePaymentAmount] = useState("");
  const [quickSalePaymentMethod, setQuickSalePaymentMethod] = useState("cash");
  const [quickSalePaymentNotes, setQuickSalePaymentNotes] = useState("");
  const [quickSalePaymentCollected, setQuickSalePaymentCollected] = useState(false);
  const [quickSaleConfirmModalVisible, setQuickSaleConfirmModalVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/dashboard/rider");
      setData(res.data);
    } catch (err) {
      // keep last known data
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const res = await api.get("/customers");
      const sorted = (res.data || []).sort((a, b) => a.name.localeCompare(b.name));
      setCustomers(sorted);
      setFilteredCustomers(sorted);
    } catch (err) {
      console.error("Failed to load customers:", err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      loadCustomers();
    }, [load, loadCustomers])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const money = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;

  // ========== QUICK SALE FUNCTIONS ==========
  const openQuickSale = (cylinder) => {
    // Use the full inventory list from data
    const inventoryList = data?.assignedInventory || [];
    setQuickSaleInventory(inventoryList);
    setSelectedCylinder(cylinder);
    setQuickSaleQty(1);
    setQuickSaleCustomer(null);
    setQuickSaleError("");
    setQuickSaleSuccess("");
    setQuickSaleCart([]);
    setQuickSalePaymentCollected(false);
    setQuickSalePaymentAmount("");
    setQuickSaleVisible(true);
  };

  const closeQuickSale = () => {
    setQuickSaleVisible(false);
    setSelectedCylinder(null);
    setQuickSaleCart([]);
    setQuickSaleCustomer(null);
    setQuickSalePaymentCollected(false);
    setQuickSaleInventory([]);
  };

  const selectCylinderForQuickSale = (cylinder) => {
    setSelectedCylinder(cylinder);
    setQuickSaleQty(1);
    setQuickSaleError("");
  };

  const increaseQty = () => {
    if (selectedCylinder && quickSaleQty < selectedCylinder.filledQty) {
      setQuickSaleQty((prev) => prev + 1);
    } else {
      Alert.alert("Max Quantity", `Only ${selectedCylinder?.filledQty || 0} cylinders available.`);
    }
  };

  const decreaseQty = () => {
    if (quickSaleQty > 1) {
      setQuickSaleQty((prev) => prev - 1);
    }
  };

  const addToCart = () => {
    if (!selectedCylinder) {
      setQuickSaleError("Please select a cylinder first.");
      return;
    }
    if (!quickSaleCustomer) {
      setQuickSaleError("Please select a customer first.");
      return;
    }
    if (quickSaleQty <= 0) {
      setQuickSaleError("Quantity must be at least 1.");
      return;
    }

    const existingIndex = quickSaleCart.findIndex(
      (item) => item.cylinderSize === selectedCylinder.cylinderSize
    );
    if (existingIndex >= 0) {
      const updatedCart = [...quickSaleCart];
      const existing = updatedCart[existingIndex];
      const newQty = existing.quantity + quickSaleQty;
      if (newQty > selectedCylinder.filledQty) {
        setQuickSaleError(`Only ${selectedCylinder.filledQty} cylinders available.`);
        return;
      }
      existing.quantity = newQty;
      existing.totalWeightKg = existing.weightKg * newQty;
      existing.lineTotal = existing.totalWeightKg * existing.ratePerKg;
      setQuickSaleCart(updatedCart);
    } else {
      const weightKg = selectedCylinder.weightKg || 0;
      const ratePerKg = selectedCylinder.ratePerKg || 0;
      const totalWeightKg = weightKg * quickSaleQty;
      const lineTotal = totalWeightKg * ratePerKg;
      setQuickSaleCart([
        ...quickSaleCart,
        {
          cylinderSize: selectedCylinder.cylinderSize,
          weightKg: weightKg,
          quantity: quickSaleQty,
          ratePerKg: ratePerKg,
          totalWeightKg,
          lineTotal,
        },
      ]);
    }

    setQuickSaleQty(1);
    setQuickSaleError("");
    setQuickSaleSuccess(`Added ${quickSaleQty} x ${selectedCylinder.cylinderSize} to cart.`);
  };

  const removeFromCart = (index) => {
    const updated = [...quickSaleCart];
    updated.splice(index, 1);
    setQuickSaleCart(updated);
    setQuickSaleSuccess("");
  };

  // Customer selection for quick sale
  const handleQuickSaleCustomerSelect = (customer) => {
    setQuickSaleCustomer(customer);
    setQuickSaleCustomerModalVisible(false);
    setQuickSaleCustomerSearch("");
    setQuickSaleError("");
  };

  const filteredQuickSaleCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(quickSaleCustomerSearch.toLowerCase()) ||
    c.phone.includes(quickSaleCustomerSearch)
  );

  const renderQuickSaleCustomerItem = ({ item }) => (
    <TouchableOpacity
      style={styles.quickCustomerItem}
      onPress={() => handleQuickSaleCustomerSelect(item)}
    >
      <Text style={styles.quickCustomerName}>{item.name}</Text>
      <Text style={styles.quickCustomerPhone}>{item.phone}</Text>
    </TouchableOpacity>
  );

  // Generate invoice HTML (same as CreateInvoiceScreen)
  const generateInvoiceHTML = (invoice, payment) => {
    // ... (same as before – include full function)
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
    setQuickSalePrinting(true);
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
      setQuickSalePrinting(false);
    }
  };

  const handleQuickSaleSubmit = async () => {
    setQuickSaleError("");
    setQuickSaleSuccess("");

    if (quickSaleCart.length === 0) {
      setQuickSaleError("Cart is empty. Add items first.");
      return;
    }
    if (!quickSaleCustomer) {
      setQuickSaleError("Please select a customer.");
      return;
    }

    const items = quickSaleCart.map((item) => ({
      cylinderSize: item.cylinderSize,
      weightKg: item.weightKg,
      quantity: item.quantity,
      ratePerKg: item.ratePerKg,
    }));

    const paidAmount = quickSalePaymentCollected ? Number(quickSalePaymentAmount) || 0 : 0;

    setQuickSaleLoading(true);
    try {
      const payload = {
        customer: quickSaleCustomer._id,
        items: items,
        amountPaid: paidAmount,
        paymentMethod: quickSalePaymentMethod,
        paymentNotes: quickSalePaymentNotes,
      };

      const res = await api.post("/invoices", payload);
      const invoice = res.data.invoice;
      const payment = res.data.payment;

      await printInvoiceDirectly(invoice, payment);

      // Clear everything
      setQuickSaleCart([]);
      setQuickSaleCustomer(null);
      setQuickSalePaymentCollected(false);
      setQuickSalePaymentAmount("");
      setQuickSalePaymentMethod("cash");
      setQuickSalePaymentNotes("");
      setQuickSaleVisible(false);
      setQuickSaleConfirmModalVisible(false);

      load();

      Alert.alert("Success", `Invoice ${invoice.invoiceNumber} created successfully!`);
    } catch (err) {
      console.error("Quick sale error:", err);
      setQuickSaleError(err?.response?.data?.message || "Failed to create invoice.");
    } finally {
      setQuickSaleLoading(false);
    }
  };

  const openPaymentModal = () => {
    if (quickSaleCart.length === 0) {
      setQuickSaleError("Cart is empty.");
      return;
    }
    if (!quickSaleCustomer) {
      setQuickSaleError("Please select a customer.");
      return;
    }
    setQuickSalePaymentCollected(false);
    setQuickSalePaymentAmount("");
    setQuickSaleConfirmModalVisible(true);
  };

  const confirmPayment = () => {
    const amount = Number(quickSalePaymentAmount) || 0;
    const subTotal = quickSaleCart.reduce((sum, i) => sum + i.lineTotal, 0);
    const previousBalance = quickSaleCustomer?.outstandingBalance || 0;
    const grandTotal = subTotal + previousBalance;

    if (amount > 0 && amount > grandTotal) {
      Alert.alert(
        "Overpayment",
        `Payment amount (${amount}) exceeds grand total (${grandTotal}). Do you want to continue?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Continue",
            onPress: () => {
              setQuickSalePaymentCollected(amount > 0);
              setQuickSaleConfirmModalVisible(false);
              handleQuickSaleSubmit();
            },
          },
        ]
      );
    } else {
      setQuickSalePaymentCollected(amount > 0);
      setQuickSaleConfirmModalVisible(false);
      handleQuickSaleSubmit();
    }
  };

  // ========== RENDER ==========
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
            <Text style={styles.subGreeting}>Rider Dashboard</Text>
          </View>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setPopupVisible(true)}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
        </View>

        <SectionTitle>Today</SectionTitle>
        <View style={styles.statsGrid}>
          <StatBox
            label="Today's Deliveries"
            value={data?.todaysDeliveries ?? "-"}
            containerStyle={styles.statBox}
          />
          <StatBox
            label="Sales Summary"
            value={money(data?.salesSummary)}
            containerStyle={styles.statBox}
          />
          <StatBox
            label="Payment Collection"
            value={money(data?.paymentCollection)}
            accent={COLORS.success}
            containerStyle={styles.statBox}
          />
          <StatBox
            label="Expense Summary"
            value={money(data?.expenseSummary)}
            containerStyle={styles.statBox}
          />
          <StatBox
            label="Remaining Inventory"
            value={data?.remainingInventory ?? "-"}
            containerStyle={styles.statBox}
          />
        </View>

        {/* Quick Actions */}
        <SectionTitle>Quick Actions</SectionTitle>
        <View style={styles.quickActions}>
          <Button
            title="Create Invoice"
            onPress={() => navigation.navigate("CreateInvoice")}
            icon="create"
            style={styles.quickActionButton}
          />
          <Button
            title="Record Payment"
            onPress={() => navigation.navigate("RecordPayment")}
            icon="cash"
            variant="secondary"
            style={styles.quickActionButton}
          />
        </View>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            Last updated: {new Date().toLocaleString()}
          </Text>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshIcon}>
            <Text style={styles.refreshIconText}>🔄</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ====== MAIN MODAL ====== */}
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
              <Text style={styles.modalTitle}>More Options</Text>
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
              <View style={styles.inventoryHeader}>
                <SectionTitle>My Assigned Inventory</SectionTitle>
                <TouchableOpacity
                  onPress={() => setShowInventory(!showInventory)}
                  style={styles.inventoryToggle}
                >
                  <Text style={styles.inventoryToggleText}>
                    {showInventory ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>

              {showInventory && (
                (data?.assignedInventory || []).length === 0 ? (
                  <Text style={styles.emptyText}>No inventory assigned yet. Contact admin.</Text>
                ) : (
                  <View style={styles.inventoryList}>
                    {(data?.assignedInventory || []).map((item) => (
                      <TouchableOpacity
                        key={item._id}
                        style={styles.inventoryCard}
                        onPress={() => {
                          setPopupVisible(false);
                          openQuickSale(item);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.inventoryItemRow}>
                          <Text style={styles.inventorySize}>{item.cylinderSize}</Text>
                          <View style={styles.inventoryStats}>
                            <Text style={styles.inventoryText}>Filled: {item.filledQty}</Text>
                            <Text style={styles.inventoryText}>Empty: {item.emptyQty}</Text>
                            <Icon name="chevron-forward" size={20} color={COLORS.primary} />
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )
              )}

              <SectionTitle>Actions</SectionTitle>
              <View style={styles.actionGrid}>
                <Button
                  title="Create Sales Invoice"
                  onPress={() => {
                    setPopupVisible(false);
                    navigation.navigate("CreateInvoice");
                  }}
                  icon="create"
                  style={styles.actionButton}
                />
                <Button
                  title="Record Customer Payment"
                  onPress={() => {
                    setPopupVisible(false);
                    navigation.navigate("RecordPayment");
                  }}
                  icon="cash"
                  style={styles.actionButton}
                />
                <Button
                  title="Pay to Admin"
                  onPress={() => {
                    setPopupVisible(false);
                    navigation.navigate("PayAdmin");
                  }}
                  icon="cash"
                  variant="primary"
                  style={styles.actionButton}
                />
                <Button
                  title="Return Empty Cylinders"
                  onPress={() => {
                    setPopupVisible(false);
                    navigation.navigate("ReturnEmpty");
                  }}
                  icon="refresh"
                  variant="secondary"
                  style={styles.actionButton}
                />
                <Button
                  title="Record Expense"
                  onPress={() => {
                    setPopupVisible(false);
                    navigation.navigate("Expense");
                  }}
                  icon="receipt"
                  style={styles.actionButton}
                />
                <Button
                  title="My Customers"
                  onPress={() => {
                    setPopupVisible(false);
                    navigation.navigate("Customers");
                  }}
                  icon="people"
                  style={styles.actionButton}
                />
                <Button
                  title="My Invoices"
                  onPress={() => {
                    setPopupVisible(false);
                    navigation.navigate("RiderInvoices");
                  }}
                  icon="document-text"
                  style={styles.actionButton}
                />
                <Button
                  title="My Collections"
                  onPress={() => {
                    setPopupVisible(false);
                    navigation.navigate("RiderPayments");
                  }}
                  icon="cash"
                  style={styles.actionButton}
                />
                <Button
                  title="Log Out"
                  variant="secondary"
                  onPress={() => {
                    setPopupVisible(false);
                    logout();
                  }}
                  icon="log-out"
                  style={[styles.actionButton, styles.logoutButton]}
                />
              </View>
              <View style={styles.modalBottomSpacer} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ====== QUICK SALE MODAL ====== */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={quickSaleVisible}
        onRequestClose={closeQuickSale}
      >
        <View style={styles.quickSaleContainer}>
          <View style={styles.quickSaleHeader}>
            <Text style={styles.quickSaleTitle}>Quick Sale</Text>
            <TouchableOpacity onPress={closeQuickSale}>
              <Icon name="close" size={28} color={COLORS.dark} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <ErrorText>{quickSaleError}</ErrorText>
            {quickSaleSuccess ? <SuccessText>{quickSaleSuccess}</SuccessText> : null}

            {/* Select Customer */}
            <TouchableOpacity
              style={styles.quickCustomerSelector}
              onPress={() => setQuickSaleCustomerModalVisible(true)}
            >
              <Text style={styles.quickCustomerSelectorText}>
                {quickSaleCustomer
                  ? quickSaleCustomer.name
                  : "Tap to select customer"}
              </Text>
              <Icon name="chevron-down" size={20} color={COLORS.gray} />
            </TouchableOpacity>

            {/* Inventory Grid */}
            <Text style={{ color: COLORS.gray, fontWeight: "600", marginVertical: 8 }}>
              Select Cylinder:
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {quickSaleInventory.map((item) => (
                <TouchableOpacity
                  key={item._id}
                  onPress={() => selectCylinderForQuickSale(item)}
                  style={[
                    styles.quickCylinderChip,
                    selectedCylinder?._id === item._id && styles.quickCylinderChipActive,
                    item.filledQty <= 0 && styles.quickCylinderChipDisabled,
                  ]}
                  disabled={item.filledQty <= 0}
                >
                  <Text
                    style={[
                      styles.quickCylinderChipText,
                      selectedCylinder?._id === item._id && styles.quickCylinderChipTextActive,
                      item.filledQty <= 0 && styles.quickCylinderChipTextDisabled,
                    ]}
                  >
                    {item.cylinderSize} ({item.filledQty})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedCylinder && (
              <Card style={styles.quickCylinderCard}>
                <Text style={styles.quickCylinderSize}>{selectedCylinder.cylinderSize}</Text>
                <Text style={styles.quickCylinderStock}>
                  Available: {selectedCylinder.filledQty} cylinders
                </Text>
                <Text style={styles.quickCylinderStock}>
                  {selectedCylinder.weightKg} kg/cylinder · Rs.{selectedCylinder.ratePerKg}/kg
                </Text>

                {/* Quantity */}
                <View style={styles.quickQtyRow}>
                  <TouchableOpacity
                    onPress={decreaseQty}
                    disabled={quickSaleQty <= 1}
                    style={[
                      styles.quickQtyBtn,
                      { opacity: quickSaleQty > 1 ? 1 : 0.5 },
                    ]}
                  >
                    <Icon name="remove" size={24} color={COLORS.white} />
                  </TouchableOpacity>
                  <Text style={styles.quickQtyText}>{quickSaleQty}</Text>
                  <TouchableOpacity
                    onPress={increaseQty}
                    style={styles.quickQtyBtn}
                  >
                    <Icon name="add" size={24} color={COLORS.white} />
                  </TouchableOpacity>
                </View>

                <Button
                  title="Add to Cart"
                  variant="primary"
                  onPress={addToCart}
                  icon="add"
                  style={{ marginTop: 12 }}
                />
              </Card>
            )}

            {/* Cart */}
            {quickSaleCart.length > 0 && (
              <>
                <SectionTitle icon="cart">Cart</SectionTitle>
                {quickSaleCart.map((item, idx) => (
                  <Card key={idx} style={styles.quickCartItem}>
                    <View style={styles.quickCartRow}>
                      <View>
                        <Text style={styles.quickCartSize}>{item.cylinderSize}</Text>
                        <Text style={styles.quickCartDetails}>
                          {item.quantity} × {item.weightKg}kg @ Rs.{item.ratePerKg}/kg
                        </Text>
                        <Text style={styles.quickCartTotal}>{money(item.lineTotal)}</Text>
                      </View>
                      <TouchableOpacity onPress={() => removeFromCart(idx)}>
                        <Icon name="close-circle" size={24} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))}

                {/* Cart Summary */}
                <Card style={styles.quickCartSummary}>
                  <View style={styles.quickSummaryRow}>
                    <Text style={styles.quickSummaryLabel}>Sub Total</Text>
                    <Text style={styles.quickSummaryValue}>
                      {money(quickSaleCart.reduce((s, i) => s + i.lineTotal, 0))}
                    </Text>
                  </View>
                  <View style={styles.quickSummaryRow}>
                    <Text style={styles.quickSummaryLabel}>Previous Balance</Text>
                    <Text style={[styles.quickSummaryValue, { color: COLORS.danger }]}>
                      {money(quickSaleCustomer?.outstandingBalance || 0)}
                    </Text>
                  </View>
                  <View style={styles.quickSummaryRow}>
                    <Text style={styles.quickSummaryLabel}>Grand Total</Text>
                    <Text style={[styles.quickSummaryValue, { color: COLORS.primary, fontWeight: "bold" }]}>
                      {money(
                        quickSaleCart.reduce((s, i) => s + i.lineTotal, 0) +
                        (quickSaleCustomer?.outstandingBalance || 0)
                      )}
                    </Text>
                  </View>
                </Card>

                <Button
                  title="Sell Now"
                  variant="primary"
                  onPress={openPaymentModal}
                  icon="checkmark"
                  style={{ marginVertical: 12 }}
                  loading={quickSaleLoading || quickSalePrinting}
                />
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* ====== CUSTOMER SELECTOR MODAL ====== */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={quickSaleCustomerModalVisible}
        onRequestClose={() => setQuickSaleCustomerModalVisible(false)}
      >
        <View style={styles.quickModalContainer}>
          <View style={styles.quickModalHeader}>
            <Text style={styles.quickModalTitle}>Select Customer</Text>
            <TouchableOpacity onPress={() => setQuickSaleCustomerModalVisible(false)}>
              <Icon name="close" size={28} color={COLORS.dark} />
            </TouchableOpacity>
          </View>

          <View style={styles.quickSearchContainer}>
            <Icon name="search" size={20} color={COLORS.gray} />
            <TextInput
              style={styles.quickSearchInput}
              placeholder="Search by name or phone..."
              value={quickSaleCustomerSearch}
              onChangeText={setQuickSaleCustomerSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {quickSaleCustomerSearch.length > 0 && (
              <TouchableOpacity onPress={() => setQuickSaleCustomerSearch("")}>
                <Icon name="close-circle" size={20} color={COLORS.gray} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredQuickSaleCustomers}
            keyExtractor={(item) => item._id}
            renderItem={renderQuickSaleCustomerItem}
            contentContainerStyle={styles.quickListContent}
            ListEmptyComponent={
              <Text style={styles.quickEmptyText}>No customers found</Text>
            }
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </Modal>

      {/* ====== PAYMENT CONFIRMATION MODAL ====== */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={quickSaleConfirmModalVisible}
        onRequestClose={() => setQuickSaleConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Payment</Text>
              <TouchableWithoutFeedback onPress={() => setQuickSaleConfirmModalVisible(false)}>
                <Icon name="close" size={28} color={COLORS.gray} />
              </TouchableWithoutFeedback>
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Customer</Text>
              <Text style={styles.summaryValue}>{quickSaleCustomer?.name}</Text>
              <Text style={styles.summaryLabel}>Total Items</Text>
              <Text style={styles.summaryValue}>{quickSaleCart.length}</Text>
              <View style={{ marginTop: 8 }}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Sub Total</Text>
                  <Text style={styles.summaryValue}>
                    {money(quickSaleCart.reduce((s, i) => s + i.lineTotal, 0))}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Previous Balance</Text>
                  <Text style={[styles.summaryValue, { color: COLORS.danger }]}>
                    {money(quickSaleCustomer?.outstandingBalance || 0)}
                  </Text>
                </View>
                <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 }]}>
                  <Text style={[styles.summaryLabel, { fontWeight: "bold" }]}>Grand Total</Text>
                  <Text style={[styles.summaryValue, { color: COLORS.primary, fontWeight: "bold" }]}>
                    {money(
                      quickSaleCart.reduce((s, i) => s + i.lineTotal, 0) +
                      (quickSaleCustomer?.outstandingBalance || 0)
                    )}
                  </Text>
                </View>
              </View>
            </View>

            <Field
              label="Amount Paid (Rs.)"
              value={quickSalePaymentAmount}
              onChangeText={setQuickSalePaymentAmount}
              keyboardType="numeric"
              placeholder="0 (unpaid)"
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
                  variant={quickSalePaymentMethod === m ? "primary" : "secondary"}
                  onPress={() => setQuickSalePaymentMethod(m)}
                  size="small"
                  style={{ paddingHorizontal: 10, paddingVertical: 6 }}
                />
              ))}
            </View>

            <Field
              label="Notes (optional)"
              value={quickSalePaymentNotes}
              onChangeText={setQuickSalePaymentNotes}
              placeholder="Payment reference"
              icon="document-text"
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setQuickSaleConfirmModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Confirm & Sell"
                variant="primary"
                onPress={confirmPayment}
                loading={quickSaleLoading}
                style={{ flex: 2 }}
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
  // ... (all previous styles, plus new ones for quick sale)
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
  },
  quickActionButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 10,
    paddingVertical: 12,
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
  inventoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  inventoryToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.lightGray,
    borderRadius: 6,
  },
  inventoryToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  emptyText: {
    color: COLORS.gray,
    fontSize: 14,
    marginBottom: 16,
    fontStyle: "italic",
  },
  inventoryList: {
    marginBottom: 8,
  },
  inventoryCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  inventoryItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inventorySize: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.dark,
  },
  inventoryStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  inventoryText: {
    fontSize: 16,
    color: COLORS.dark,
  },
  actionGrid: {
    marginTop: 4,
  },
  actionButton: {
    marginBottom: 10,
    borderRadius: 10,
  },
  logoutButton: {
    marginTop: 8,
    marginBottom: 8,
  },

  // Quick Sale styles
  quickSaleContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  quickSaleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  quickSaleTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.dark,
  },
  quickCustomerSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    marginBottom: 12,
  },
  quickCustomerSelectorText: {
    fontSize: 16,
    color: COLORS.dark,
  },
  quickCylinderChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickCylinderChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickCylinderChipDisabled: {
    opacity: 0.4,
  },
  quickCylinderChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  quickCylinderChipTextActive: {
    color: COLORS.white,
  },
  quickCylinderChipTextDisabled: {
    color: COLORS.gray,
  },
  quickCylinderCard: {
    padding: 16,
    marginBottom: 12,
  },
  quickCylinderSize: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.dark,
  },
  quickCylinderStock: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 2,
  },
  quickQtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
    gap: 16,
  },
  quickQtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  quickQtyText: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.dark,
    minWidth: 40,
    textAlign: "center",
  },
  quickCartItem: {
    padding: 12,
    marginBottom: 8,
  },
  quickCartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quickCartSize: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
  quickCartDetails: {
    fontSize: 13,
    color: COLORS.gray,
  },
  quickCartTotal: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primary,
  },
  quickCartSummary: {
    padding: 16,
    marginVertical: 8,
  },
  quickSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  quickSummaryLabel: {
    color: COLORS.gray,
  },
  quickSummaryValue: {
    fontWeight: "600",
    color: COLORS.dark,
  },

  // Customer Selector Modal
  quickModalContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  quickModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  quickModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.dark,
  },
  quickSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: COLORS.white,
    marginBottom: 16,
  },
  quickSearchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.dark,
    marginLeft: 8,
  },
  quickListContent: {
    paddingBottom: 20,
  },
  quickCustomerItem: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  quickCustomerName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
  },
  quickCustomerPhone: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 2,
  },
  quickEmptyText: {
    textAlign: "center",
    color: COLORS.gray,
    fontSize: 16,
    marginTop: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
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
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },
});