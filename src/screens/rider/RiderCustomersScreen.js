import React, { useCallback, useState } from "react";
import { ScrollView, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../api/client";
import { Screen, Card, SectionTitle, Button, COLORS } from "../../components/UI";

export default function RiderCustomersScreen({ navigation }) {
  const [customers, setCustomers] = useState([]);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data);
    } catch (err) {
      // ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen>
      <ScrollView>
        <SectionTitle>My Customers</SectionTitle>
        {customers.length === 0 && <Text style={{ color: COLORS.gray }}>No customers assigned to you yet.</Text>}
        {customers.map((c) => (
          <Card key={c._id}>
            <Text style={{ fontWeight: "800", fontSize: 16, color: COLORS.dark }}>{c.name}</Text>
            <Text style={{ color: COLORS.gray, marginTop: 2 }}>{c.phone}</Text>
            <Text
              style={{
                marginTop: 6,
                fontWeight: "700",
                color: c.outstandingBalance > 0 ? COLORS.danger : COLORS.success,
              }}
            >
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

