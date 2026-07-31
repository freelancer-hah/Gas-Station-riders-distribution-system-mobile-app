import React, { useCallback, useState } from "react";
import { ScrollView, View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { 
  Screen, Card, Field, Button, SectionTitle, 
  ErrorText, SuccessText, COLORS, ListItem 
} from "../../components/UI";
import { Ionicons as Icon } from "@expo/vector-icons";

export default function SupplierManagementScreen() {
  const [suppliers, setSuppliers] = useState([]);
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/suppliers");
      setSuppliers(res.data);
    } catch (err) {
      setError("Failed to load suppliers");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const addSupplier = async () => {
    setError("");
    setSuccess("");
    if (!name || !phone) {
      setError("Name and phone are required");
      return;
    }
    setLoading(true);
    try {
      await api.post("/suppliers", { name, contactPerson, phone, address });
      setSuccess(`Supplier "${name}" added successfully`);
      setName("");
      setContactPerson("");
      setPhone("");
      setAddress("");
      setShowForm(false);
      load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to add supplier");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView>
        <SectionTitle 
          icon="business" 
          rightAction={
            <Button 
              title={showForm ? "Close" : "Add"} 
              variant="secondary" 
              onPress={() => setShowForm(!showForm)}
              size="small"
              icon={showForm ? "close" : "add"}
            />
          }
        >
          Suppliers
        </SectionTitle>

        {showForm && (
          <Card>
            <ErrorText>{error}</ErrorText>
            <SuccessText>{success}</SuccessText>
            <Field label="Supplier Name" value={name} onChangeText={setName} icon="business-outline" />
            <Field label="Contact Person" value={contactPerson} onChangeText={setContactPerson} icon="person-outline" />
            <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" icon="call-outline" />
            <Field label="Address" value={address} onChangeText={setAddress} icon="location-outline" />
            <Button title="Add Supplier" onPress={addSupplier} loading={loading} icon="checkmark" />
          </Card>
        )}

        {suppliers.length === 0 && !showForm && (
          <Card>
            <Text style={{ color: COLORS.gray }}>No suppliers yet. Tap "Add" to create one.</Text>
          </Card>
        )}

        {suppliers.map((s) => (
          <Card key={s._id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ fontWeight: "800", fontSize: 16, color: COLORS.dark }}>{s.name}</Text>
                {s.contactPerson && (
                  <Text style={{ color: COLORS.gray }}>Contact: {s.contactPerson}</Text>
                )}
                <Text style={{ color: COLORS.gray }}>{s.phone}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text 
                  style={{ 
                    fontWeight: "700", 
                    color: s.outstandingBalance > 0 ? COLORS.danger : COLORS.success,
                    fontSize: 16
                  }}
                >
                  Rs. {Number(s.outstandingBalance || 0).toLocaleString()}
                </Text>
                <Text style={{ color: COLORS.gray, fontSize: 11 }}>Outstanding</Text>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
