import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, RefreshControl, Alert, Share, Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import api from "../../api/client";
import { 
  Screen, Card, SectionTitle, ErrorText, 
  COLORS, Button, Badge 
} from "../../components/UI";

export default function InvoiceDetailScreen({ route, navigation }) {
  const { invoiceId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [printing, setPrinting] = useState(false);

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

  // ✅ Generate HTML from invoice data (no backend API call)
  const generateInvoiceHTML = (invoice) => {
    const itemsHtml = invoice.items.map(item => `
      <tr>
        <td>${item.cylinderSize}</td>
        <td>${item.quantity}</td>
        <td>${item.weightKg} kg</td>
        <td>Rs. ${item.ratePerKg}/kg</td>
        <td style="text-align:right;">${formatMoney(item.lineTotal)}</td>
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
            .total-row { font-weight: bold; background: #f4f4f4; }
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
            <p><strong>Date:</strong> ${formatDate(invoice.invoiceDate || invoice.createdAt)}</p>
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
            <div class="summary-item"><span>Sub Total</span><span>${formatMoney(invoice.subTotal)}</span></div>
            <div class="summary-item"><span>Previous Balance</span><span style="color:#DA1E28;">${formatMoney(invoice.previousBalance)}</span></div>
            <div class="summary-item"><span>Amount Paid</span><span style="color:#24A148;">${formatMoney(invoice.amountPaid)}</span></div>
            <div class="grand-total"><span>Grand Total</span><span>${formatMoney(invoice.grandTotal)}</span></div>
            <div class="summary-item"><span>Remaining Balance</span><span style="color:${invoice.remainingBalance > 0 ? '#DA1E28' : '#24A148'}; font-weight:bold;">${formatMoney(invoice.remainingBalance)}</span></div>
          </div>

          <div class="footer">
            <p>Generated from Gas Cylinder Management System</p>
            <p>© ${new Date().getFullYear()} All Rights Reserved</p>
          </div>
        </body>
      </html>
    `;
  };

  // ✅ Proper Print / Download function (No backend PDF API)
  const printInvoice = async () => {
    if (!invoice) return;

    setPrinting(true);
    try {
      const html = generateInvoiceHTML(invoice);

      if (Platform.OS === "web") {
        // Web: Print dialog
        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
        win.print();
      } else {
        // Native: Generate PDF and share/print
        const { uri } = await Print.printToFileAsync({ html });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: "Invoice",
          });
        } else {
          Alert.alert("Saved", `Invoice PDF saved to ${uri}`);
        }
      }
    } catch (err) {
      console.error("Print error:", err);
      Alert.alert("Error", "Failed to print/share invoice. Please try again.");
    } finally {
      setPrinting(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🧾 INVOICE #${invoice?.invoiceNumber}\n...` // (your existing share message)
      });
    } catch (err) {
      Alert.alert("Error", "Failed to share invoice");
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
        <Button title="Go Back" variant="primary" onPress={() => navigation.goBack()} icon="arrow-back" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <SectionTitle icon="document">Invoice Details</SectionTitle>
        
        <Card>
          {/* ... (same UI code as before, no changes needed) ... */}
          {/* Just copy your existing UI part here */}
        </Card>

        {/* Action Buttons */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button 
            title="🖨️ Print / PDF" 
            variant="primary"
            onPress={printInvoice}
            loading={printing}
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

        <Button title="Back" variant="secondary" onPress={() => navigation.goBack()} icon="arrow-back" style={{ marginTop: 10 }} />
      </ScrollView>
    </Screen>
  );
}