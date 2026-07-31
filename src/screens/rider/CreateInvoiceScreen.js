import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, Alert, Modal } from "react-native";
import api from "../../api/client";
import { 
  Screen, Card, Field, Button, SectionTitle, 
  ErrorText, SuccessText, COLORS, Badge 
} from "../../components/UI";
import Icon from "react-native-vector-icons/Ionicons";

export default function CreateInvoiceScreen({ navigation }) {
  const [customers, setCustomers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [cylinderSize, setCylinderSize] = useState("");
  const [quantity, setQuantity] = useState("");
  const [ratePerKg, setRatePerKg] = useState("");
  const [items, setItems] = useState([]);
  const [amountPaid, setAmountPaid] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [lastCreatedInvoice, setLastCreatedInvoice] = useState(null);

  // NEW: controls the invoice preview modal
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingInventory(true);
    setError("");
    try {
      const custRes = await api.get("/customers");
      setCustomers(custRes.data || []);
      
      const invRes = await api.get("/inventory/rider/me");
      setInventory(invRes.data || []);
      
      console.log("✅ Inventory loaded:", invRes.data);
    } catch (err) {
      console.error("Error loading data:", err);
      if (err.code === 'ERR_NETWORK') {
        setError("Cannot connect to server. Make sure backend is running.");
      } else {
        setError(err?.response?.data?.message || "Failed to load data");
      }
    } finally {
      setLoadingInventory(false);
    }
  };

  const availableInventory = inventory.filter(item => (item.filledQty || 0) > 0);

  const getInventoryItem = (size) => {
    return inventory.find(i => i.cylinderSize.toLowerCase() === size.toLowerCase());
  };

  const handleCylinderSelect = (size) => {
    setCylinderSize(size);
    const item = getInventoryItem(size);
    if (item && item.ratePerKg > 0) {
      setRatePerKg(item.ratePerKg.toString());
      console.log(`✅ Auto-filled rate: ${item.ratePerKg} per kg`);
    }
  };

  const addItem = () => {
    setError("");
    
    const invItem = getInventoryItem(cylinderSize);
    if (!invItem) {
      setError("Cylinder size not found in your inventory");
      return;
    }
    
    if (invItem.filledQty < Number(quantity)) {
      setError(`Insufficient stock. Available: ${invItem.filledQty}`);
      return;
    }
    
    if (!quantity || Number(quantity) <= 0) {
      setError("Please enter valid quantity");
      return;
    }
    if (!ratePerKg || Number(ratePerKg) <= 0) {
      setError("Please enter valid rate per kg");
      return;
    }
    
    const qty = Number(quantity);
    const rate = Number(ratePerKg);
    const weightPerCylinder = invItem.weightKg || 0;
    const totalWeightKg = weightPerCylinder * qty;
    const lineTotal = totalWeightKg * rate;
    
    const existingIndex = items.findIndex(i => i.cylinderSize === invItem.cylinderSize);
    if (existingIndex >= 0) {
      const updatedItems = [...items];
      const existing = updatedItems[existingIndex];
      const newQty = existing.quantity + qty;
      const newTotalWeight = (weightPerCylinder * newQty);
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
          lineTotal 
        },
      ]);
    }
    
    setCylinderSize("");
    setQuantity("");
    setRatePerKg("");
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const subTotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const previousBalance = selectedCustomer?.outstandingBalance || 0;
  const grandTotal = subTotal + previousBalance;

  const viewInvoice = () => {
    if (lastCreatedInvoice) {
      navigation.navigate("InvoiceDetail", { 
        invoiceId: lastCreatedInvoice._id 
      });
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
    
    setLoading(true);
    try {
      const payload = {
        customer: selectedCustomer._id,
        items: items.map(item => ({
          cylinderSize: item.cylinderSize,
          weightKg: item.weightKg,
          quantity: item.quantity,
          ratePerKg: item.ratePerKg,
        })),
        amountPaid: Number(amountPaid || 0),
      };
      
      console.log("📤 Sending invoice payload:", payload);
      
      const res = await api.post("/invoices", payload);
      
      const invoice = res.data.invoice;
      setLastCreatedInvoice(invoice);

      // NEW: open the preview modal immediately instead of only showing an Alert
      setShowPreview(true);
      
      setSuccess(`✅ Invoice ${invoice.invoiceNumber} created successfully!`);
      setItems([]);
      setAmountPaid("");
      setSelectedCustomer(null);
      
      loadData();
      
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
  const qty = Number(quantity) || 0;
  const rate = Number(ratePerKg) || 0;
  const totalWeight = weight * qty;
  const previewTotal = totalWeight * rate;

  return (
    <Screen>
      <ScrollView>
        <SectionTitle icon="people">Select Customer</SectionTitle>
        <Card>
          <ErrorText>{error}</ErrorText>
          <SuccessText>{success}</SuccessText>
          
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {customers.map((c) => (
              <Button
                key={c._id}
                title={c.name}
                variant={selectedCustomer?._id === c._id ? "primary" : "secondary"}
                onPress={() => setSelectedCustomer(c)}
                size="small"
              />
            ))}
          </View>
          {selectedCustomer && (
            <View style={{ 
              marginTop: 10, 
              padding: 10, 
              backgroundColor: COLORS.lightGray, 
              borderRadius: 8 
            }}>
              <Text style={{ fontWeight: "600", color: COLORS.dark }}>
                {selectedCustomer.name}
              </Text>
              <Text style={{ color: COLORS.gray }}>
                Previous balance: {formatMoney(selectedCustomer.outstandingBalance || 0)}
              </Text>
            </View>
          )}
        </Card>

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
              <TouchableOpacity
                key={item._id}
                style={{
                  padding: 10,
                  backgroundColor: cylinderSize === item.cylinderSize ? COLORS.primary : COLORS.lightGray,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: cylinderSize === item.cylinderSize ? COLORS.primary : COLORS.border,
                  minWidth: 80,
                  alignItems: "center",
                }}
                onPress={() => handleCylinderSelect(item.cylinderSize)}
              >
                <Text style={{ 
                  fontWeight: "600", 
                  color: cylinderSize === item.cylinderSize ? COLORS.white : COLORS.dark 
                }}>
                  {item.cylinderSize}
                </Text>
                <Text style={{ 
                  fontSize: 11, 
                  color: cylinderSize === item.cylinderSize ? COLORS.white : COLORS.gray 
                }}>
                  Stock: {item.filledQty}
                </Text>
                <Text style={{ 
                  fontSize: 10, 
                  color: cylinderSize === item.cylinderSize ? COLORS.white : COLORS.gray,
                  marginTop: 2
                }}>
                  {item.weightKg || 0}kg/cyl
                </Text>
                {item.ratePerKg > 0 && (
                  <Text style={{ 
                    fontSize: 10, 
                    color: cylinderSize === item.cylinderSize ? COLORS.white : COLORS.gray,
                    marginTop: 2
                  }}>
                    Rate: Rs.{item.ratePerKg}/kg
                  </Text>
                )}
              </TouchableOpacity>
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
          
          <Field 
            label="Number of Cylinders" 
            value={quantity} 
            onChangeText={setQuantity} 
            keyboardType="numeric"
            icon="hash"
          />

          <Field 
            label="Rate per kg (Rs.)" 
            value={ratePerKg} 
            onChangeText={setRatePerKg} 
            placeholder="Auto-filled from purchase"
            keyboardType="numeric"
            icon="cash-outline"
          />
          
          {quantity && ratePerKg && cylinderSize && getInventoryItem(cylinderSize) ? (
            <View style={{ 
              marginTop: 8,
              padding: 12,
              backgroundColor: COLORS.primaryLight,
              borderRadius: 8,
            }}>
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
                  <Text style={{ fontWeight: "800", color: COLORS.dark }}>
                    {it.cylinderSize}
                  </Text>
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
              <View style={{ 
                flexDirection: "row", 
                justifyContent: "space-between",
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: COLORS.border,
              }}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: COLORS.dark }}>Grand Total</Text>
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

            <Button 
              title="Generate Invoice" 
              onPress={submitInvoice} 
              loading={loading}
              icon="checkmark"
              style={{ marginBottom: 20 }}
            />
          </>
        )}
      </ScrollView>

      {/* NEW: Invoice Preview Modal — shown right after invoice creation */}
      <Modal
        visible={showPreview}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 16 }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, padding: 16, maxHeight: "85%" }}>
            <ScrollView>
              <View style={{ alignItems: "center", marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: COLORS.gray }}>Invoice Created</Text>
                <Text style={{ fontSize: 20, fontWeight: "800", color: COLORS.primary }}>
                  #{lastCreatedInvoice?.invoiceNumber}
                </Text>
                <Badge
                  variant={
                    lastCreatedInvoice?.status === "paid"
                      ? "success"
                      : lastCreatedInvoice?.status === "partial"
                      ? "warning"
                      : "danger"
                  }
                >
                  {lastCreatedInvoice?.status?.toUpperCase()}
                </Badge>
              </View>

              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontWeight: "600", color: COLORS.dark }}>
                  Customer: {lastCreatedInvoice?.customer?.name || "N/A"}
                </Text>
                <Text style={{ color: COLORS.gray, fontSize: 12 }}>
                  Phone: {lastCreatedInvoice?.customer?.phone || "N/A"}
                </Text>
              </View>

              <View style={{
                backgroundColor: COLORS.lightGray,
                borderRadius: 8,
                padding: 10,
                marginBottom: 12,
              }}>
                {lastCreatedInvoice?.items?.map((it, idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingVertical: 4,
                      borderBottomWidth: idx < lastCreatedInvoice.items.length - 1 ? 1 : 0,
                      borderBottomColor: COLORS.border,
                    }}
                  >
                    <View>
                      <Text style={{ fontWeight: "600", color: COLORS.dark }}>
                        {it.cylinderSize}
                      </Text>
                      <Text style={{ color: COLORS.gray, fontSize: 11 }}>
                        {it.quantity} cylinders × {it.weightKg}kg
                      </Text>
                    </View>
                    <Text style={{ fontWeight: "600", color: COLORS.dark }}>
                      {formatMoney(it.lineTotal)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ color: COLORS.gray }}>Sub Total</Text>
                  <Text style={{ fontWeight: "600", color: COLORS.dark }}>
                    {formatMoney(lastCreatedInvoice?.subTotal)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ color: COLORS.gray }}>Previous Balance</Text>
                  <Text style={{ fontWeight: "600", color: COLORS.danger }}>
                    {formatMoney(lastCreatedInvoice?.previousBalance)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ color: COLORS.gray }}>Amount Paid</Text>
                  <Text style={{ fontWeight: "600", color: COLORS.success }}>
                    {formatMoney(lastCreatedInvoice?.amountPaid)}
                  </Text>
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
                    {formatMoney(lastCreatedInvoice?.grandTotal)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                  <Text style={{ color: COLORS.gray }}>Remaining Balance</Text>
                  <Text
                    style={{
                      fontWeight: "700",
                      color: lastCreatedInvoice?.remainingBalance > 0 ? COLORS.danger : COLORS.success,
                    }}
                  >
                    {formatMoney(lastCreatedInvoice?.remainingBalance)}
                  </Text>
                </View>
              </View>

              <Button
                title="View Full Invoice"
                onPress={() => {
                  setShowPreview(false);
                  navigation.navigate("InvoiceDetail", { invoiceId: lastCreatedInvoice._id });
                }}
                icon="document"
                style={{ marginTop: 8 }}
              />
              <Button
                title="Close"
                variant="secondary"
                onPress={() => setShowPreview(false)}
                style={{ marginTop: 8 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}