import React, { useCallback, useState } from "react";
import { ScrollView, View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { Screen, Card, Field, Button, SectionTitle, ErrorText, COLORS } from "../../components/UI";

export default function CustomersScreen({ navigation }) {
  const [customers, setCustomers] = useState([]);
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data);
    } catch (err) {
      setError("Failed to load customers");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const addCustomer = async () => {
    setError("");
    if (!name || !phone) {
      setError("Name and phone are required");
      return;
    }
    setLoading(true);
    try {
      await api.post("/customers", {
        name,
        businessName,
        phone,
        address,
        creditLimit: Number(creditLimit || 0),
      });
      setName("");
      setBusinessName("");
      setPhone("");
      setAddress("");
      setCreditLimit("");
      load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to add customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView>
        <SectionTitle>Add Customer</SectionTitle>
        <Card>
          <ErrorText>{error}</ErrorText>
          <Field label="Customer Name" value={name} onChangeText={setName} />
          <Field label="Business Name (optional)" value={businessName} onChangeText={setBusinessName} />
          <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="Address" value={address} onChangeText={setAddress} />
          <Field label="Credit Limit" value={creditLimit} onChangeText={setCreditLimit} keyboardType="numeric" />
          <Button title="Add Customer" onPress={addCustomer} loading={loading} />
        </Card>

        <SectionTitle>All Customers</SectionTitle>
        {customers.length === 0 && <Text style={{ color: COLORS.gray }}>No customers yet.</Text>}
        {customers.map((c) => (
          <Card key={c._id}>
            <Text style={{ fontWeight: "800", fontSize: 16, color: COLORS.dark }}>{c.name}</Text>
            {c.businessName ? <Text style={{ color: COLORS.gray }}>{c.businessName}</Text> : null}
            <Text style={{ color: COLORS.gray, marginTop: 2 }}>{c.phone}</Text>
            <Text style={{ marginTop: 6, fontWeight: "700", color: c.outstandingBalance > 0 ? COLORS.danger : COLORS.success }}>
              Outstanding: Rs. {Number(c.outstandingBalance || 0).toLocaleString()}
            </Text>
            <Button
              title="View Ledger"
              variant="secondary"
              onPress={() => navigation.navigate("CustomerLedger", { customerId: c._id, customerName: c.name })}
              style={{ marginTop: 10 }}
            />
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

