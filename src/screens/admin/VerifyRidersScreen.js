import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, RefreshControl } from "react-native"; // ← Added View here
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { 
  Screen, Card, Button, SectionTitle, 
  Badge, ErrorText, COLORS 
} from "../../components/UI";

export default function VerifyRidersScreen() {
  const [pendingRiders, setPendingRiders] = useState([]);
  const [verifiedRiders, setVerifiedRiders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get("/riders/pending");
      setPendingRiders(res.data.pending || []);
      setVerifiedRiders(res.data.verified || []);
    } catch (err) {
      setError("Failed to load riders");
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

  const verifyRider = async (riderId) => {
    setLoading(true);
    try {
      await api.put(`/riders/${riderId}/verify`);
      load();
    } catch (err) {
      setError("Failed to verify rider");
    } finally {
      setLoading(false);
    }
  };

  const toggleRiderStatus = async (riderId, currentStatus) => {
    try {
      const endpoint = currentStatus ? "deactivate" : "activate";
      await api.put(`/riders/${riderId}/${endpoint}`);
      load();
    } catch (err) {
      setError("Failed to update rider status");
    }
  };

  return (
    <Screen>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ErrorText>{error}</ErrorText>

        <SectionTitle icon="person-add">Pending Verification</SectionTitle>
        {pendingRiders.length === 0 ? (
          <Card>
            <Text style={{ color: COLORS.gray }}>No pending verification requests</Text>
          </Card>
        ) : (
          pendingRiders.map((r) => (
            <Card key={r._id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: COLORS.dark }}>{r.name}</Text>
                  <Text style={{ color: COLORS.gray }}>{r.phone}</Text>
                  <Text style={{ color: COLORS.gray }}>{r.email || "No email"}</Text>
                  <Badge variant="warning" style={{ marginTop: 6 }}>Pending</Badge>
                </View>
                <Button 
                  title="Verify" 
                  variant="primary" 
                  onPress={() => verifyRider(r._id)}
                  loading={loading}
                  size="small"
                  icon="checkmark"
                />
              </View>
            </Card>
          ))
        )}

        <SectionTitle icon="people">Active Riders</SectionTitle>
        {verifiedRiders.length === 0 ? (
          <Card>
            <Text style={{ color: COLORS.gray }}>No active riders</Text>
          </Card>
        ) : (
          verifiedRiders.map((r) => (
            <Card key={r._id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: COLORS.dark }}>{r.name}</Text>
                  <Text style={{ color: COLORS.gray }}>{r.phone}</Text>
                  <Badge variant="success" style={{ marginTop: 6 }}>Verified</Badge>
                </View>
                <Button 
                  title="Deactivate" 
                  variant="danger" 
                  onPress={() => toggleRiderStatus(r._id, r.isActive)}
                  size="small"
                />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
