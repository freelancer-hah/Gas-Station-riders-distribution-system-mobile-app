import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, RefreshControl, TouchableOpacity, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { 
  Screen, Card, SectionTitle, StatBox, 
  ErrorText, COLORS, Badge, Button 
} from "../../components/UI";
import Icon from "react-native-vector-icons/Ionicons";

export default function RidersSummaryScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await api.get("/admin/riders-summary");
      setData(res.data);
      setError("");
    } catch (err) {
      setError("Failed to load riders summary");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const exportLedger = async (riderId, riderName) => {
    setExporting(true);
    try {
      const response = await api.get(`/admin/export-rider-ledger/${riderId}`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Rider_Ledger_${riderName.replace(/\s/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      Alert.alert("Success", "Ledger PDF downloaded successfully!");
    } catch (err) {
      Alert.alert("Error", "Failed to download ledger");
    } finally {
      setExporting(false);
    }
  };

  const formatMoney = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;

  if (!data) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: COLORS.gray }}>Loading...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <ErrorText>{error}</ErrorText>

        <SectionTitle icon="people">Riders Summary</SectionTitle>
        
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 24, fontWeight: "800", color: COLORS.primary }}>
                {data.totalRiders}
              </Text>
              <Text style={{ color: COLORS.gray }}>Total Riders</Text>
            </View>
          </View>
        </Card>

        <SectionTitle icon="list">All Riders</SectionTitle>
        
        {data.riders.length === 0 ? (
          <Card>
            <Text style={{ color: COLORS.gray }}>No riders found.</Text>
          </Card>
        ) : (
          data.riders.map((item) => (
            <Card key={item.rider.id}>
              <TouchableOpacity onPress={() => navigation.navigate("RiderDetail", { riderId: item.rider.id })}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View>
                    <Text style={{ fontWeight: "800", fontSize: 16, color: COLORS.dark }}>
                      {item.rider.name}
                    </Text>
                    <Text style={{ color: COLORS.gray }}>{item.rider.phone}</Text>
                    <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                      <Badge variant="primary">{item.inventory.totalFilled} Filled</Badge>
                      <Badge variant="gray">{item.inventory.totalEmpty} Empty</Badge>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ 
                      fontWeight: "700", 
                      color: item.ledger.outstandingBalance > 0 ? COLORS.danger : COLORS.success 
                    }}>
                      {formatMoney(item.ledger.outstandingBalance)}
                    </Text>
                    <Text style={{ fontSize: 11, color: COLORS.gray }}>Outstanding</Text>
                  </View>
                </View>
              </TouchableOpacity>
              
              <View style={{ 
                flexDirection: "row", 
                justifyContent: "space-between",
                marginTop: 8,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: COLORS.border
              }}>
                <Text style={{ color: COLORS.gray, fontSize: 12 }}>
                  Received: {item.ledger.totalFilledReceived}
                </Text>
                <Text style={{ color: COLORS.gray, fontSize: 12 }}>
                  Returned: {item.ledger.totalEmptyReturned}
                </Text>
                <Text style={{ color: COLORS.gray, fontSize: 12 }}>
                  Sold: {item.ledger.totalFilledSold || 0}
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <Button 
                  title="View Ledger" 
                  variant="secondary" 
                  onPress={() => navigation.navigate("RiderLedger", { riderId: item.rider.id, riderName: item.rider.name })}
                  size="small"
                  icon="document-text"
                  style={{ flex: 1 }}
                />
                <Button 
                  title="Export PDF" 
                  variant="primary" 
                  onPress={() => exportLedger(item.rider.id, item.rider.name)}
                  loading={exporting}
                  size="small"
                  icon="download"
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}