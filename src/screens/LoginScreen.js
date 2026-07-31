import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";
import { Screen, Field, Button, ErrorText, COLORS } from "../components/UI";

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!username || !password) {
      setError("Please enter email/phone and password");
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed. Check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <Text style={styles.title}>Gas Cylinder Manager</Text>
        <Text style={styles.subtitle}>Log in to continue</Text>

        <ErrorText>{error}</ErrorText>

        <Field
          label="Email or Phone Number"
          value={username}
          onChangeText={setUsername}
          placeholder="admin@example.com or 03xxxxxxxxx"
          autoCapitalize="none"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
        />

        <Button title="Log In" onPress={handleLogin} loading={loading} />

        <Button
          title="Create an account"
          variant="secondary"
          onPress={() => navigation.navigate("Signup")}
          style={{ marginTop: 10 }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "800", color: COLORS.dark, textAlign: "center" },
  subtitle: { fontSize: 14, color: COLORS.gray, textAlign: "center", marginBottom: 24, marginTop: 4 },
});
