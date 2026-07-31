import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, RefreshControl, Alert, Share, Platform } from "react-native";
import api from "../../api/client";
import { 
  Screen, Card, SectionTitle, ErrorText, 
  COLORS, Button, Badge 
} from "../../components/UI";
import Icon from "react-native-vector-icons/Ionicons";

export default function InvoiceDetailScreen({ route, navigation }) {
  const { invoiceId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (invoiceId) {
      loadInvoice();
    } else {
      setError("No invoice ID provided");
      setLoading(false);
    }
  }, [invoiceId]);

  const loadInvoice = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/invoices/${invoiceId}`);
      setInvoice(res.data);
      setError("");
    } catch (err) {
      console.error("Error loading invoice:", err);
      setError("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (invoiceId) {
      await loadInvoice();
    }
    setRefreshing(false);
  };

  const formatMoney = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;
  const formatDate = (date) => new Date(date).toLocaleString();

  const handlePrint = () => {
    if (Platform.OS === 'web') {
      window.print();
    } else {
      Alert.alert("Print", "Print functionality coming soon");
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: 
          `🧾 INVOICE #${invoice?.invoiceNumber}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Customer: ${invoice?.customer?.name}\n` +
          `Phone: ${invoice?.customer?.phone || 'N/A'}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `${invoice?.items?.map((item, idx) => 
            `📦 ${item.cylinderSize} × ${item.quantity} = ${formatMoney(item.lineTotal)}`
          ).join('\n')}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Sub Total: ${formatMoney(invoice?.subTotal)}\n` +
          `Previous Balance: ${formatMoney(invoice?.previousBalance)}\n` +
          `Amount Paid: ${formatMoney(invoice?.amountPaid)}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `💰 GRAND TOTAL: ${formatMoney(invoice?.grandTotal)}\n` +
          `Remaining: ${formatMoney(invoice?.remainingBalance)}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Status: ${invoice?.status?.toUpperCase()}\n` +
          `Date: ${formatDate(invoice?.invoiceDate || invoice?.createdAt)}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Thank you for your business! 🙏`,
      });
    } catch (err) {
      Alert.alert("Error", "Failed to share invoice");
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'paid': return COLORS.success;
      case 'partial': return COLORS.warning;
      case 'unpaid': return COLORS.danger;
      default: return COLORS.gray;
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: COLORS.gray }}>Loading invoice...</Text>
        </View>
      </Screen>
    );
  }

  if (!invoice) {
    return (
      <Screen>
        <ErrorText>{error}</ErrorText>
        <Button 
          title="Go Back" 
          variant="primary" 
          onPress={() => navigation.goBack()}
          icon="arrow-back"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <SectionTitle icon="document">Invoice Details</SectionTitle>
        
        <Card>
          {/* Header */}
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: COLORS.primary }}>
              GAS CYLINDER MANAGEMENT
            </Text>
            <Text style={{ color: COLORS.gray, fontSize: 12 }}>
              Sales Invoice
            </Text>
          </View>

          {/* Invoice Info */}
          <View style={{ 
            flexDirection: "row", 
            justifyContent: "space-between", 
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
            paddingBottom: 12,
            marginBottom: 12
          }}>
            <View>
              <Text style={{ fontWeight: "600", color: COLORS.dark }}>
                Invoice #: {invoice.invoiceNumber}
              </Text>
              <Text style={{ color: COLORS.gray, fontSize: 12 }}>
                Date: {formatDate(invoice.invoiceDate || invoice.createdAt)}
              </Text>
            </View>
            <Badge variant={invoice.status === 'paid' ? 'success' : invoice.status === 'partial' ? 'warning' : 'danger'}>
              {invoice.status?.toUpperCase() || 'UNPAID'}
            </Badge>
          </View>

          {/* Customer Info */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: "600", color: COLORS.dark }}>Customer:</Text>
            <Text style={{ color: COLORS.dark }}>{invoice.customer?.name || "N/A"}</Text>
            <Text style={{ color: COLORS.gray, fontSize: 12 }}>Phone: {invoice.customer?.phone || "N/A"}</Text>
            {invoice.customer?.businessName && (
              <Text style={{ color: COLORS.gray, fontSize: 12 }}>Business: {invoice.customer.businessName}</Text>
            )}
          </View>

          {/* Rider Info */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: "600", color: COLORS.dark }}>Rider:</Text>
            <Text style={{ color: COLORS.dark }}>{invoice.rider?.name || "N/A"}</Text>
            <Text style={{ color: COLORS.gray, fontSize: 12 }}>Phone: {invoice.rider?.phone || "N/A"}</Text>
          </View>

          {/* Items Table */}
          <Text style={{ fontWeight: "600", color: COLORS.dark, marginBottom: 8 }}>Items:</Text>
          <View style={{ 
            backgroundColor: COLORS.lightGray, 
            borderRadius: 8,
            padding: 12,
            marginBottom: 12
          }}>
            {invoice.items?.map((item, idx) => (
              <View key={idx} style={{ 
                flexDirection: "row", 
                justifyContent: "space-between",
                paddingVertical: 4,
                borderBottomWidth: idx < invoice.items.length - 1 ? 1 : 0,
                borderBottomColor: COLORS.border
              }}>
                <View>
                  <Text style={{ fontWeight: "600", color: COLORS.dark }}>{item.cylinderSize}</Text>
                  <Text style={{ color: COLORS.gray, fontSize: 11 }}>
                    {item.quantity} cylinders × {item.weightKg}kg × Rs.{item.ratePerKg}/kg
                  </Text>
                </View>
                <Text style={{ fontWeight: "600", color: COLORS.dark }}>
                  {formatMoney(item.lineTotal)}
                </Text>
              </View>
            ))}
          </View>

          {/* Summary */}
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ color: COLORS.gray }}>Total Gas:</Text>
              <Text style={{ fontWeight: "600", color: COLORS.dark }}>
                {invoice.items?.reduce((sum, item) => sum + (item.weightKg * item.quantity), 0)} kg
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ color: COLORS.gray }}>Sub Total:</Text>
              <Text style={{ fontWeight: "600", color: COLORS.dark }}>{formatMoney(invoice.subTotal)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ color: COLORS.gray }}>Previous Balance:</Text>
              <Text style={{ fontWeight: "600", color: COLORS.danger }}>{formatMoney(invoice.previousBalance)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ color: COLORS.gray }}>Amount Paid:</Text>
              <Text style={{ fontWeight: "600", color: COLORS.success }}>{formatMoney(invoice.amountPaid)}</Text>
            </View>
          </View>

          {/* Grand Total */}
          <View style={{ 
            flexDirection: "row", 
            justifyContent: "space-between",
            paddingTop: 12,
            borderTopWidth: 2,
            borderTopColor: COLORS.primary
          }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.dark }}>
              Grand Total:
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.primary }}>
              {formatMoney(invoice.grandTotal)}
            </Text>
          </View>

          <View style={{ 
            flexDirection: "row", 
            justifyContent: "space-between",
            paddingTop: 8
          }}>
            <Text style={{ color: COLORS.gray }}>Remaining Balance:</Text>
            <Text style={{ 
              fontWeight: "700", 
              color: invoice.remainingBalance > 0 ? COLORS.danger : COLORS.success 
            }}>
              {formatMoney(invoice.remainingBalance)}
            </Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button 
            title="🖨️ Print" 
            variant="primary"
            onPress={handlePrint}
            icon="print"
            style={{ flex: 1 }}
          />
          <Button 
            title="📤 Share" 
            variant="secondary"
            onPress={handleShare}
            icon="share"
            style={{ flex: 1 }}
          />
        </View>

        <Button 
          title="Back" 
          variant="secondary"
          onPress={() => navigation.goBack()}
          icon="arrow-back"
          style={{ marginTop: 10 }}
        />
      </ScrollView>
    </Screen>
  );
}