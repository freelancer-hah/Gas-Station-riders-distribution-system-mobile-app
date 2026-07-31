import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, RefreshControl, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { 
  Screen, Card, SectionTitle, StatBox, 
  ErrorText, COLORS, Button 
} from "../../components/UI";
import { Ionicons as Icon } from "@expo/vector-icons";

export default function RiderInventoryScreen() {
  const [inventory, setInventory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      // Use the correct endpoint - /api/riders/me or /api/inventory/rider/me
      const res = await api.get("/inventory/rider/me");
      setInventory(res.data || []);
    } catch (err) {
      console.error("Inventory load error:", err);
      
      if (err.response && err.response.status === 401) {
        // Session expired - will be handled by interceptor
        setError("Session expired. Please login again.");
      } else if (err.response && err.response.status === 404) {
        setError("No inventory found. Please contact admin to assign inventory.");
      } else {
        setError(err?.response?.data?.message || "Failed to load inventory");
      }
      
      // Set empty inventory on error
      setInventory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const totalFilled = inventory.reduce((sum, i) => sum + (i.filledQty || 0), 0);
  const totalEmpty = inventory.reduce((sum, i) => sum + (i.emptyQty || 0), 0);

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: COLORS.gray }}>Loading inventory...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
<ErrorText>{error}</ErrorText>
        <SectionTitle icon="cube">My Inventory</SectionTitle>
        
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <StatBox 
            label="Total Filled" 
            value={totalFilled} 
            icon="checkmark-circle" 
            accent={COLORS.success} 
          />
          <StatBox 
            label="Total Empty" 
            value={totalEmpty} 
            icon="close-circle" 
            accent={COLORS.danger} 
          />
        </View>

        {inventory.length === 0 ? (
          <Card>
            <View style={{ alignItems: "center", padding: 20 }}>
              <Icon name="cube-outline" size={48} color={COLORS.gray} />
              <Text style={{ color: COLORS.gray, marginTop: 12, textAlign: "center" }}>
                No inventory assigned to you yet.
              </Text>
              <Text style={{ color: COLORS.gray, fontSize: 12, marginTop: 4, textAlign: "center" }}>
                Contact admin to assign cylinders to your account.
              </Text>
              <Button 
                title="Refresh" 
                variant="secondary" 
                onPress={onRefresh}
                size="small"
                style={{ marginTop: 12 }}
                icon="refresh"
              />
            </View>
          </Card>
        ) : (
          inventory.map((item) => (
            <Card key={item._id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.dark }}>
                    {item.cylinderSize}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 16, marginTop: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Icon name="checkmark-circle" size={16} color={COLORS.success} />
                      <Text style={{ color: COLORS.dark }}>Filled: {item.filledQty || 0}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Icon name="close-circle" size={16} color={COLORS.danger} />
                      <Text style={{ color: COLORS.dark }}>Empty: {item.emptyQty || 0}</Text>
                    </View>
                  </View>
                </View>
                <Button 
                  title="Return" 
                  variant="secondary" 
                  size="small"
                  onPress={() => Alert.alert("Coming Soon", "Return functionality will be available soon")}
                />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
