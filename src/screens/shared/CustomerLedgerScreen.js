import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, Alert, Modal, StyleSheet, Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import api from "../../api/client";
import { Screen, Card, SectionTitle, ErrorText, COLORS, Button, Field } from "../../components/UI";
import { Ionicons as Icon } from "@expo/vector-icons";
import { BASE_URL } from "../../api/client";

export default function CustomerLedgerScreen({ route }) {
  const { customerId, customerName } = route.params || {};
  const [ledger, setLedger] = useState([]);
  const [outstanding, setOutstanding] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Date filter state
  const [showFilter, setShowFilter] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filteredLedger, setFilteredLedger] = useState([]);

  useEffect(() => {
    loadLedger();
  }, [customerId]);

  const loadLedger = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/customers/${customerId}/ledger`);
      setLedger(res.data.ledger);
      setFilteredLedger(res.data.ledger);
      setOutstanding(res.data.outstandingBalance);
      setError("");
    } catch (err) {
      setError("Failed to load ledger");
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    if (!fromDate && !toDate) {
      setFilteredLedger(ledger);
      return;
    }

    const filtered = ledger.filter((entry) => {
      const entryDate = new Date(entry.date);
      let match = true;
      
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        if (entryDate < from) match = false;
      }
      
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        if (entryDate > to) match = false;
      }
      
      return match;
    });

    setFilteredLedger(filtered);
    setShowFilter(false);
  };

  const resetFilter = () => {
    setFromDate("");
    setToDate("");
    setFilteredLedger(ledger);
    setShowFilter(false);
  };

  const exportPDF = async () => {
    setExporting(true);
    try {
      // Call backend to get formatted data
      const response = await api.get(`/dashboard/export/ledger/customer/${customerId}`);
      
      if (response.data.success) {
        const data = response.data.data;
        
        // Generate HTML content for PDF
        const htmlContent = `
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #0F62FE; border-bottom: 2px solid #0F62FE; padding-bottom: 10px; }
                .header { margin-bottom: 20px; }
                .header p { margin: 4px 0; color: #666; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #0F62FE; color: white; padding: 10px; text-align: left; }
                td { padding: 8px 10px; border-bottom: 1px solid #ddd; }
                .total { font-weight: bold; margin-top: 20px; padding: 10px; background: #f4f4f4; border-radius: 5px; }
                .outstanding { color: ${data.outstanding > 0 ? '#DA1E28' : '#24A148'}; font-weight: bold; font-size: 18px; }
                .summary { display: flex; gap: 20px; margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
                .summary-item { flex: 1; }
                .summary-item label { font-size: 12px; color: #666; }
                .summary-item value { font-size: 16px; font-weight: bold; color: #161616; }
                .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; }
                .badge-invoice { background: #E8F0FE; color: #0F62FE; }
                .badge-payment { background: #E8F8E8; color: #24A148; }
                .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 15px; }
                .date-range { color: #666; font-size: 14px; }
              </style>
            </head>
            <body>
              <h1>${data.title || "Customer Ledger"}</h1>
              
              <div class="header">
                <p><strong>Customer:</strong> ${data.customer?.name || "N/A"}</p>
                <p><strong>Phone:</strong> ${data.customer?.phone || "N/A"}</p>
                <p><strong>Business:</strong> ${data.customer?.businessName || "N/A"}</p>
                ${fromDate || toDate ? `<p class="date-range"><strong>Date Range:</strong> ${fromDate || "Start"} to ${toDate || "End"}</p>` : ''}
                <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
              </div>

              <div class="summary">
                <div class="summary-item">
                  <label>Total Invoices</label>
                  <div style="font-size: 16px; font-weight: bold; color: #161616;">${data.totalInvoices || 0}</div>
                </div>
                <div class="summary-item">
                  <label>Total Purchases</label>
                  <div style="font-size: 16px; font-weight: bold; color: #161616;">Rs. ${(data.totalPurchases || 0).toLocaleString()}</div>
                </div>
                <div class="summary-item">
                  <label>Total Payments</label>
                  <div style="font-size: 16px; font-weight: bold; color: #24A148;">Rs. ${(data.totalPaid || 0).toLocaleString()}</div>
                </div>
                <div class="summary-item">
                  <label>Outstanding</label>
                  <div class="outstanding">Rs. ${(data.outstanding || 0).toLocaleString()}</div>
                </div>
              </div>

              <h2>Transaction History</h2>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Reference</th>
                    <th>Description</th>
                    <th style="text-align: right;">Debit (Rs.)</th>
                    <th style="text-align: right;">Credit (Rs.)</th>
                    <th style="text-align: right;">Balance (Rs.)</th>
                  </tr>
                </thead>
                <tbody>
                  ${(filteredLedger || []).map((entry) => `
                    <tr>
                      <td>${new Date(entry.date).toLocaleDateString()}</td>
                      <td><span class="badge badge-${entry.kind}">${entry.kind}</span></td>
                      <td>${entry.reference || '-'}</td>
                      <td>${entry.description || '-'}</td>
                      <td style="text-align: right; color: ${entry.debit > 0 ? '#DA1E28' : '#666'};">${entry.debit > 0 ? entry.debit.toLocaleString() : '-'}</td>
                      <td style="text-align: right; color: ${entry.credit > 0 ? '#24A148' : '#666'};">${entry.credit > 0 ? entry.credit.toLocaleString() : '-'}</td>
                      <td style="text-align: right; font-weight: bold;">${entry.runningBalance.toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="footer">
                <p>Generated from Gas Cylinder Management System</p>
                <p>© ${new Date().getFullYear()} All Rights Reserved</p>
              </div>
            </body>
          </html>
        `;

        if (Platform.OS === "web") {
          // Web - open in new window for printing/saving as PDF
          const win = window.open('', '_blank');
          win.document.write(htmlContent);
          win.document.close();
          win.print();

          Alert.alert("Success", "PDF is being generated. Use the print dialog to save as PDF.");
        } else {
          // Native (Android/iOS) - window.open doesn't exist here, so
          // generate a real PDF file with expo-print and share it.
          const { uri } = await Print.printToFileAsync({ html: htmlContent });
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(uri, {
              mimeType: "application/pdf",
              dialogTitle: "Customer Ledger",
            });
          } else {
            Alert.alert("Saved", `PDF saved to ${uri}`);
          }
        }
      }
      
    } catch (err) {
      console.error("Export error:", err);
      Alert.alert("Error", "Failed to export PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const formatMoney = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: COLORS.gray }}>Loading ledger...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <SectionTitle>{customerName ? `${customerName}'s Ledger` : "Customer Ledger"}</SectionTitle>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button 
              title="Filter" 
              variant="secondary" 
              onPress={() => setShowFilter(true)}
              size="small"
              icon="filter"
            />
            <Button 
              title="PDF" 
              variant="primary" 
              onPress={exportPDF}
              loading={exporting}
              size="small"
              icon="document"
            />
          </View>
        </View>

        <ErrorText>{error}</ErrorText>
        
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "800", color: COLORS.dark }}>
              Current Outstanding:
            </Text>
            <Text style={{ 
              fontWeight: "800", 
              color: outstanding > 0 ? COLORS.danger : COLORS.success,
              fontSize: 16
            }}>
              {formatMoney(outstanding)}
            </Text>
          </View>
          {filteredLedger.length !== ledger.length && (
            <Text style={{ color: COLORS.gray, fontSize: 12, marginTop: 4 }}>
              Showing {filteredLedger.length} of {ledger.length} entries
            </Text>
          )}
        </Card>

        {filteredLedger.length === 0 ? (
          <Card>
            <Text style={{ color: COLORS.gray, textAlign: "center" }}>No transactions found.</Text>
          </Card>
        ) : (
          filteredLedger.map((entry, idx) => (
            <Card key={idx}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {entry.kind === "invoice" ? (
                    <Icon name="receipt" size={20} color={COLORS.primary} />
                  ) : (
                    <Icon name="cash" size={20} color={COLORS.success} />
                  )}
                  <Text style={{ fontWeight: "700", color: COLORS.dark, textTransform: "capitalize" }}>
                    {entry.kind}
                  </Text>
                </View>
                <Text style={{ color: COLORS.gray, fontSize: 12 }}>{new Date(entry.date).toLocaleDateString()}</Text>
              </View>
              
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                <Text style={{ color: COLORS.gray, fontSize: 12 }}>{entry.reference || "-"}</Text>
                <Text style={{ 
                  fontWeight: "700", 
                  color: entry.debit ? COLORS.danger : COLORS.success 
                }}>
                  {entry.debit ? `+${formatMoney(entry.debit)}` : `-${formatMoney(entry.credit)}`}
                </Text>
              </View>
              
              <View style={{ 
                flexDirection: "row", 
                justifyContent: "flex-end", 
                marginTop: 6,
                paddingTop: 6,
                borderTopWidth: 1,
                borderTopColor: COLORS.border
              }}>
                <Text style={{ fontWeight: "700", color: COLORS.dark }}>
                  Balance: {formatMoney(entry.runningBalance)}
                </Text>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={showFilter} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter by Date</Text>
            
            <Field
              label="From Date"
              value={fromDate}
              onChangeText={setFromDate}
              placeholder="YYYY-MM-DD"
              icon="calendar"
            />
            <Field
              label="To Date"
              value={toDate}
              onChangeText={setToDate}
              placeholder="YYYY-MM-DD"
              icon="calendar"
            />
            
            <View style={styles.modalButtons}>
              <Button title="Reset" variant="secondary" onPress={resetFilter} style={styles.modalButton} />
              <Button title="Apply" variant="primary" onPress={applyFilter} style={styles.modalButton} />
              <Button title="Close" variant="secondary" onPress={() => setShowFilter(false)} style={styles.modalButton} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.dark,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
  },
});