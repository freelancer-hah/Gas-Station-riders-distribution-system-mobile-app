import React, { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { Screen, Card, Field, Button, SectionTitle, ErrorText, COLORS } from "../../components/UI";

export default function RidersScreen() {
  const [riders, setRiders] = useState([]);
  const [error, setError] = useState("");

  const [selectedRider, setSelectedRider] = useState(null);
  const [cylinderSize, setCylinderSize] = useState("");
  const [quantity, setQuantity] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignMsg, setAssignMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get("/riders");
      setRiders(res.data);
    } catch (err) {
      setError("Failed to load riders");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggleActive = async (rider) => {
    try {
      const endpoint = rider.isActive ? "deactivate" : "activate";
      await api.put(`/riders/${rider._id || rider.id}/${endpoint}`);
      load();
    } catch (err) {
      setError("Failed to update rider status");
    }
  };

  const assignInventory = async () => {
    setAssignMsg("");
    setError("");
    if (!selectedRider || !cylinderSize || !quantity) {
      setError("Select a rider, cylinder size and quantity");
      return;
    }
    setAssignLoading(true);
    try {
      await api.post("/inventory/assign", {
        riderId: selectedRider._id || selectedRider.id,
        cylinderSize,
        quantity: Number(quantity),
      });
      setAssignMsg(`Assigned ${quantity} x ${cylinderSize} to ${selectedRider.name}`);
      setCylinderSize("");
      setQuantity("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to assign inventory");
    } finally {
      setAssignLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView>
        <SectionTitle>Assign Inventory to Rider</SectionTitle>
        <Card>
          <ErrorText>{error}</ErrorText>
          {assignMsg ? <Text style={{ color: COLORS.success, marginBottom: 10 }}>{assignMsg}</Text> : null}
          <Text style={{ color: COLORS.gray, marginBottom: 8, fontWeight: "600" }}>Select Rider:</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {riders.map((r) => (
              <Button
                key={r._id || r.id}
                title={r.name}
                variant={selectedRider?._id === r._id || selectedRider?.id === r.id ? "primary" : "secondary"}
                onPress={() => setSelectedRider(r)}
                style={{ paddingHorizontal: 14, paddingVertical: 8 }}
              />
            ))}
          </View>
          <Field label="Cylinder Size (e.g. 48KG)" value={cylinderSize} onChangeText={setCylinderSize} />
          <Field label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
          <Button title="Assign" onPress={assignInventory} loading={assignLoading} />
        </Card>

        <SectionTitle>All Riders</SectionTitle>
        {riders.length === 0 && <Text style={{ color: COLORS.gray }}>No riders yet.</Text>}
        {riders.map((r) => (
          <Card key={r._id || r.id}>
            <Text style={{ fontWeight: "800", fontSize: 16, color: COLORS.dark }}>{r.name}</Text>
            <Text style={{ color: COLORS.gray }}>{r.phone}</Text>
            <Text style={{ marginTop: 6, color: r.isActive ? COLORS.success : COLORS.danger, fontWeight: "700" }}>
              {r.isActive ? "Active" : "Inactive"}
            </Text>
            <Button
              title={r.isActive ? "Deactivate" : "Activate"}
              variant="secondary"
              onPress={() => toggleActive(r)}
              style={{ marginTop: 10 }}
            />
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

