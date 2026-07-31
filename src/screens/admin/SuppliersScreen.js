import React, { useCallback, useState } from "react";
import { ScrollView, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { Screen, Card, Field, Button, SectionTitle, ErrorText, COLORS } from "../../components/UI";

export default function SuppliersScreen() {
  const [suppliers, setSuppliers] = useState([]);
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    if (!name || !phone) {
      setError("Name and phone are required");
      return;
    }
    setLoading(true);
    try {
      await api.post("/suppliers", { name, contactPerson, phone, address });
      setName("");
      setContactPerson("");
      setPhone("");
      setAddress("");
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
        <SectionTitle>Add Supplier</SectionTitle>
        <Card>
          <ErrorText>{error}</ErrorText>
          <Field label="Supplier Name" value={name} onChangeText={setName} />
          <Field label="Contact Person" value={contactPerson} onChangeText={setContactPerson} />
          <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="Address" value={address} onChangeText={setAddress} />
          <Button title="Add Supplier" onPress={addSupplier} loading={loading} />
        </Card>

        <SectionTitle>All Suppliers</SectionTitle>
        {suppliers.length === 0 && <Text style={{ color: COLORS.gray }}>No suppliers yet.</Text>}
        {suppliers.map((s) => (
          <Card key={s._id}>
            <Text style={{ fontWeight: "800", fontSize: 16, color: COLORS.dark }}>{s.name}</Text>
            <Text style={{ color: COLORS.gray, marginTop: 2 }}>{s.phone}</Text>
            <Text
              style={{
                marginTop: 6,
                fontWeight: "700",
                color: s.outstandingBalance > 0 ? COLORS.danger : COLORS.success,
              }}
            >
              Outstanding: Rs. {Number(s.outstandingBalance || 0).toLocaleString()}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

