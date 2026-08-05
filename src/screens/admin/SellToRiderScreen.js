import React, { useCallback, useState, useEffect } from "react";
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
import { CYLINDER_SIZES, getWeightBySize } from "../../constants/cylinderSizes";

export default function SellToRiderScreen({ navigation, route }) {
  // Rider selection
  const [riders, setRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [riderModalVisible, setRiderModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Cart & Form state
  const [cart, setCart] = useState([]);
  const [formSize, setFormSize] = useState(null);
  const [formQty, setFormQty] = useState(1); 
  const [formRate, setFormRate] = useState("");
  const [sizeModalVisible, setSizeModalVisible] = useState(false);

  // UI state
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load riders
  const loadRiders = useCallback(async () => {
    try {
      const res = await api.get("/riders");
      setRiders((res.data || []).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      setError("Failed to load riders");
    }
  }, []);

  useFocusEffect(useCallback(() => { loadRiders(); }, [loadRiders]));

  useEffect(() => {
    if (route.params?.rider) {
      setSelectedRider(route.params.rider);
    }
  }, [route.params]);

  // ================== QUANTITY CONTROLS ==================
  const increaseQuantity = () => {
    setFormQty((prev) => prev + 1);
  };

  const decreaseQuantity = () => {
    setFormQty((prev) => Math.max(1, prev - 1));
  };

  // ================== DUPLICATE CHECK ==================
  const isSizeAlreadyInCart = (size) => {
    return cart.some(item => item.cylinderSize === size);
  };

  // Add item to cart
  const addToCart = () => {
    setError("");
    if (!formSize) {
      setError("Please select a cylinder size");
      return;
    }
    if (isSizeAlreadyInCart(formSize)) {
      setError(`"${formSize}" is already in cart. Remove it first.`);
      return;
    }

    const qty = formQty;
    if (qty <= 0) {
      setError("Invalid quantity");
      return;
    }
    const rate = Number(formRate);
    if (!rate || rate <= 0) {
      setError("Please enter valid rate per kg");
      return;
    }

    const weight = getWeightBySize(formSize);
    const totalWeight = weight * qty;
    const lineTotal = totalWeight * rate;

    const newItem = {
      cylinderSize: formSize,
      weightKg: weight,
      filledQty: qty,
      ratePerKg: rate,
      totalWeightKg: totalWeight,
      lineTotal: lineTotal,
    };

    setCart([...cart, newItem]);
    setFormSize(null);
    setFormQty(1); // Reset to 1
    setFormRate("");
  };

  const removeFromCart = (index) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
  };

  const clearCart = () => {
    setCart([]);
    setError("");
    setSuccess("");
  };

  // Print PDF
  const printInvoiceDirectly = async (invoice) => {
    setPrinting(true);
    try {
      let rows = invoice.items.map(item => `
        <tr>
          <td>${item.cylinderSize}</td>
          <td>${item.quantity}</td>
          <td>${item.weightKg} kg</td>
          <td>${item.totalWeightKg} kg</td>
          <td>Rs. ${item.ratePerKg.toLocaleString()}</td>
          <td style="text-align:right;">Rs. ${item.lineTotal.toLocaleString()}</td>
        </tr>
      `).join("");

      const html = `
        <html><head><style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #0F62FE; border-bottom: 2px solid #0F62FE; padding-bottom: 10px; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #0F62FE; color: white; padding: 8px; text-align: left; }
          td { padding: 6px 8px; border-bottom: 1px solid #ddd; }
          .grand-total { font-size: 18px; font-weight: bold; color: #0F62FE; margin-top: 10px; border-top: 2px solid #0F62FE; padding-top: 10px; }
        </style></head>
        <body>
          <h1>GAS CYLINDER MANAGEMENT</h1>
          <p style="text-align:center;">Sale Invoice (Admin → Rider)</p>
          <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
          <p><strong>Date:</strong> ${new Date(invoice.invoiceDate || Date.now()).toLocaleString()}</p>
          <p><strong>Rider:</strong> ${invoice.rider?.name || 'N/A'}</p>
          <table>
            <thead><tr><th>Cylinder Size</th><th>Qty</th><th>Wt/Cyl</th><th>Total Wt</th><th>Rate/kg</th><th>Total</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="grand-total">Total Amount: Rs. ${invoice.totalAmount.toLocaleString()}</div>
        </body></html>
      `;

      if (Platform.OS === "web") {
        const win = window.open("", "_blank");
        win.document.write(html);
        win.document.close();
        win.print();
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Sale Invoice" });
        } else {
          Alert.alert("Saved", `Invoice saved to ${uri}`);
        }
      }
    } catch (err) {
      console.error("Print error:", err);
      Alert.alert("Error", "Failed to print invoice");
    } finally {
      setPrinting(false);
    }
  };

  // Final Sell
  const sellToRider = async () => {
    setError("");
    setSuccess("");

    if (!selectedRider) {
      setError("Please select a rider");
      return;
    }
    if (cart.length === 0) {
      setError("Cart is empty. Add items to sell.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/admin/sell-to-rider", {
        riderId: selectedRider._id,
        items: cart,
      });

      const invoice = res.data.invoice;
      await printInvoiceDirectly(invoice);

      setSuccess(`✅ Sold ${cart.length} different items to ${selectedRider.name}`);
      clearCart();
      loadRiders();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to sell to rider");
    } finally {
      setLoading(false);
    }
  };

  // Helpers
  const formatMoney = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;
  const totalCartAmount = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalCartQty = cart.reduce((sum, item) => sum + item.filledQty, 0);

  const filteredRiders = riders.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.phone && r.phone.includes(searchQuery))
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
          ListHeaderComponent={
            <>
              <SectionTitle icon="cart">Sell Cylinders to Rider</SectionTitle>
              <Card>
                <ErrorText>{error}</ErrorText>
                <SuccessText>{success}</SuccessText>

                <Text style={{ color: COLORS.gray, fontWeight: "600" }}>Select Rider:</Text>
                <TouchableOpacity
                  style={styles.riderSelector}
                  onPress={() => setRiderModalVisible(true)}
                >
                  <Text style={styles.selectorText}>{selectedRider ? selectedRider.name : "Tap to choose"}</Text>
                  <Icon name="chevron-down" size={20} color={COLORS.gray} />
                </TouchableOpacity>

                {/* Add Item Form */}
                <Text style={{ color: COLORS.gray, fontWeight: "600", marginTop: 12 }}>Add Item to Cart</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setSizeModalVisible(true)}
                >
                  <Text style={styles.selectorText}>{formSize ? formSize : "Select Cylinder Size"}</Text>
                  <Icon name="chevron-down" size={20} color={COLORS.gray} />
                </TouchableOpacity>

                {/* ================== QUANTITY WITH + / - BUTTONS (Rectangular Box) ================== */}
                <View style={{ marginBottom: 12, marginTop: 8 }}>
                  <Text style={{ color: COLORS.gray, fontWeight: "600", marginBottom: 6 }}>
                    Quantity *
                  </Text>
                  {/* 🔥 Background Box around the whole + - 1 row */}
                  <View style={styles.quantityRow}>
                    <TouchableOpacity
                      onPress={decreaseQuantity}
                      disabled={formQty <= 1}
                      style={[
                        styles.quantityButton,
                        {
                          backgroundColor: formQty > 1 ? COLORS.primary : COLORS.gray,
                          opacity: formQty > 1 ? 1 : 0.5,
                        },
                      ]}
                    >
                      <Icon name="remove" size={24} color={COLORS.white} />
                    </TouchableOpacity>

                    <Text style={styles.quantityNumber}>{formQty}</Text>

                    <TouchableOpacity
                      onPress={increaseQuantity}
                      style={[
                        styles.quantityButton,
                        { backgroundColor: COLORS.primary, opacity: 1 },
                      ]}
                    >
                      <Icon name="add" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Rate field */}
                <Field
                  label="Rate per kg (Rs.) *"
                  value={formRate}
                  onChangeText={setFormRate}
                  placeholder="e.g. 63"
                  keyboardType="numeric"
                  icon="cash-outline"
                />

                <Button title="Add to Cart" onPress={addToCart} icon="add" variant="secondary" size="small" />
              </Card>

              {/* Cart Items */}
              <SectionTitle icon="list">{cart.length} Items in Cart</SectionTitle>
              {cart.map((item, idx) => (
                <Card key={idx}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View>
                      <Text style={{ fontWeight: "700", color: COLORS.dark }}>{item.cylinderSize}</Text>
                      <Text style={{ color: COLORS.gray }}>Qty: {item.filledQty} | Rate: Rs. {item.ratePerKg}/kg</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontWeight: "700", color: COLORS.primary }}>{formatMoney(item.lineTotal)}</Text>
                      <TouchableOpacity onPress={() => removeFromCart(idx)}>
                        <Text style={{ color: COLORS.danger, fontSize: 12 }}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              ))}

              {cart.length > 0 && (
                <Card>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View>
                      <Text style={{ color: COLORS.gray }}>Total Cylinders</Text>
                      <Text style={{ fontWeight: "800", color: COLORS.dark, fontSize: 18 }}>{totalCartQty}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ color: COLORS.gray }}>Grand Total</Text>
                      <Text style={{ fontWeight: "800", color: COLORS.primary, fontSize: 20 }}>{formatMoney(totalCartAmount)}</Text>
                    </View>
                  </View>
                  <Button
                    title={printing ? "Printing..." : "Sell to Rider"}
                    onPress={sellToRider}
                    loading={loading || printing}
                    icon="checkmark"
                    style={{ marginTop: 12 }}
                    disabled={cart.length === 0}
                  />
                </Card>
              )}
            </>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadRiders} />}
        />
      </KeyboardAvoidingView>

      {/* Rider Modal */}
      <Modal visible={riderModalVisible} transparent={false} onRequestClose={() => setRiderModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Rider</Text>
            <TouchableOpacity onPress={() => setRiderModalVisible(false)}>
              <Icon name="close" size={28} color={COLORS.dark} />
            </TouchableOpacity>
          </View>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color={COLORS.gray} />
            <TextInput style={styles.searchInput} placeholder="Search..." value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <FlatList
            data={filteredRiders}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.riderItem}
                onPress={() => {
                  setSelectedRider(item);
                  setRiderModalVisible(false);
                  setSearchQuery("");
                }}
              >
                <Text style={styles.riderName}>{item.name}</Text>
                <Text style={styles.riderPhone}>{item.phone}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Size Modal */}
      <Modal visible={sizeModalVisible} transparent={true} onRequestClose={() => setSizeModalVisible(false)}>
        <View style={styles.sizeModalOverlay}>
          <View style={styles.sizeModalContent}>
            <Text style={styles.modalTitle}>Select Cylinder Size</Text>
            <FlatList
              data={CYLINDER_SIZES}
              keyExtractor={(item) => item.label}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.sizeItem}
                  onPress={() => {
                    setFormSize(item.label);
                    setSizeModalVisible(false);
                  }}
                >
                  <Text style={styles.sizeLabel}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
            <Button title="Cancel" variant="secondary" onPress={() => setSizeModalVisible(false)} style={{ marginTop: 12 }} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

// ==========================================================
// ✅ UPDATED STYLES (Background Box around the whole row)
// ==========================================================
const styles = {
  riderSelector: { flexDirection: "row", justifyContent: "space-between", padding: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.white },
  selector: { flexDirection: "row", justifyContent: "space-between", padding: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.white, marginTop: 8 },
  selectorText: { fontSize: 16, color: COLORS.dark },
  modalContainer: { flex: 1, backgroundColor: COLORS.white, paddingTop: 40, paddingHorizontal: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: COLORS.dark },
  searchContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, marginBottom: 16 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 16, marginLeft: 8 },
  riderItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  riderName: { fontSize: 16, fontWeight: "600" },
  riderPhone: { fontSize: 14, color: COLORS.gray },
  sizeModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  sizeModalContent: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24, width: "100%", maxWidth: 400, maxHeight: "80%" },
  sizeItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sizeLabel: { fontSize: 16, fontWeight: "600" },
  
  // 👇 BACKGROUND BOX AROUND THE WHOLE + - 1 ROW
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    backgroundColor: COLORS.lightGray,  // 🔥 Background color
    borderWidth: 1,                     // 🔥 Border thickness
    borderColor: COLORS.border,         // 🔥 Border color
    borderRadius: 8,                    // 🔥 Rounded corners (Rectangle shape)
    paddingHorizontal: 24,              // 🔥 Padding inside the box
    paddingVertical: 8,                 // 🔥 Padding inside the box
    alignSelf: 'center',                // 🔥 Center the whole box horizontally
  },
  
  // 👇 BUTTONS (RECTANGULAR shape)
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 6,   // Rectangle shape for the buttons
    alignItems: "center",
    justifyContent: "center",
  },
  
  quantityNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.dark,
    minWidth: 30,
    textAlign: "center",
  },
};