import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, RefreshControl, Alert, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import api from "../../api/client";
import { 
  Screen, Card, SectionTitle, ErrorText, 
  COLORS, Button, Badge 
} from "../../components/UI";
import Icon from "react-native-vector-icons/Ionicons";

export default function AdminSaleInvoiceScreen({ route, navigation }) {
  const { invoiceId, invoiceData } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (invoiceData) {
      setInvoice(invoiceData);
      setLoading(false);
      return;
    }
    
    if (invoiceId) {
      loadInvoice();
    } else {
      setError("No invoice data found");
      setLoading(false);
    }
  }, [invoiceId, invoiceData]);

  const loadInvoice = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/invoice/${invoiceId}`);
      setInvoice(res.data);
      setError("");
    } catch (err) {
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

  const downloadPdf = async () => {
    const id = invoice?._id || invoice?.id;
    if (!id) {
      Alert.alert("Error", "This invoice hasn't been saved yet, so a PDF isn't available.");
      return;
    }

    setDownloading(true);
    try {
      // Backend returns base64 (not a raw binary stream) since the RN/Hermes
      // axios client here can't reliably consume blob/arraybuffer responses.
      const res = await api.get(`/admin/invoice/${id}/pdf`);
      const { base64, filename } = res.data;
      const finalName = filename || `Invoice_${id}.pdf`;

      if (Platform.OS === "web") {
        // expo-file-system's document-directory APIs aren't available on
        // web — fall back to a normal browser Blob download instead.
        const byteChars = atob(base64);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = finalName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const fileUri = FileSystem.documentDirectory + finalName;
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "application/pdf",
            dialogTitle: "Sale Invoice",
          });
        } else {
          Alert.alert("Saved", `Invoice saved to ${fileUri}`);
        }
      }
    } catch (err) {
      console.error("Invoice PDF download error:", err);
      Alert.alert("Error", err?.response?.data?.message || "Failed to download invoice PDF");
    } finally {
      setDownloading(false);
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
        <SectionTitle icon="document">Sale Invoice</SectionTitle>
        
        <Card>
          {/* Header */}
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: COLORS.primary }}>
              GAS CYLINDER MANAGEMENT
            </Text>
            <Text style={{ color: COLORS.gray, fontSize: 12 }}>
              Sale Invoice
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
                Date: {formatDate(invoice.createdAt || invoice.date)}
              </Text>
            </View>
            <Badge variant="primary">SALE</Badge>
          </View>

          {/* Rider Info */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: "600", color: COLORS.dark }}>Rider:</Text>
            <Text style={{ color: COLORS.dark }}>{invoice.rider?.name || "N/A"}</Text>
            <Text style={{ color: COLORS.gray, fontSize: 12 }}>Phone: {invoice.rider?.phone || "N/A"}</Text>
          </View>

          {/* Transaction Details */}
          <View style={{ 
            backgroundColor: COLORS.lightGray, 
            borderRadius: 8,
            padding: 12,
            marginBottom: 12
          }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ color: COLORS.gray }}>Cylinder Size:</Text>
              <Text style={{ fontWeight: "600", color: COLORS.dark }}>{invoice.cylinderSize}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ color: COLORS.gray }}>Quantity:</Text>
              <Text style={{ fontWeight: "600", color: COLORS.dark }}>{invoice.quantity}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ color: COLORS.gray }}>Weight per Cylinder:</Text>
              <Text style={{ fontWeight: "600", color: COLORS.dark }}>{invoice.weightKg} kg</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ color: COLORS.gray }}>Total Gas:</Text>
              <Text style={{ fontWeight: "600", color: COLORS.dark }}>{invoice.totalWeightKg} kg</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ color: COLORS.gray }}>Rate:</Text>
              <Text style={{ fontWeight: "600", color: COLORS.dark }}>Rs. {invoice.ratePerKg}/kg</Text>
            </View>
          </View>

          {/* Total */}
          <View style={{ 
            flexDirection: "row", 
            justifyContent: "space-between",
            paddingTop: 12,
            borderTopWidth: 2,
            borderTopColor: COLORS.primary
          }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.dark }}>
              Total Amount:
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.primary }}>
              {formatMoney(invoice.totalAmount)}
            </Text>
          </View>

          {invoice.notes && (
            <Text style={{ color: COLORS.gray, marginTop: 12, fontSize: 12 }}>
              📝 {invoice.notes}
            </Text>
          )}
        </Card>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button 
            title={downloading ? "Preparing..." : "Download PDF"} 
            variant="primary"
            onPress={downloadPdf}
            loading={downloading}
            icon="download"
            style={{ flex: 1 }}
          />
          <Button 
            title="Print" 
            variant="secondary"
            onPress={() => Alert.alert("Print", "Print will be available soon")}
            icon="print"
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}