import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert } from "react-native";
import { useAuth } from "../context/AuthContext";
import { Screen, Field, Button, ErrorText, COLORS } from "../components/UI";

export default function SignupScreen({ navigation }) {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setError("");
    if (!name || !phone || !password) {
      setError("Name, phone and password are required");
      return;
    }
    setLoading(true);
    try {
      const result = await signup({ 
        name, 
        phone: phone.trim(), 
        email: email || undefined, 
        password 
      });
      
      // Check if the user is a rider pending verification
      if (result.user && result.user.role === "rider" && !result.user.isActive) {
        Alert.alert(
          "Account Created",
          "Your account has been created and is pending admin verification.\n\nYou will be notified once verified.",
          [{ text: "OK", onPress: () => navigation.navigate("Login") }]
        );
      } else {
        // Admin user - proceed normally
        Alert.alert(
          "Success",
          "Account created successfully!",
          [{ text: "OK" }]
        );
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>
          Sign up as a rider. Your account will be pending admin approval.
        </Text>

        <ErrorText>{error}</ErrorText>

        <Field label="Full Name" value={name} onChangeText={setName} placeholder="e.g. Ahmed Khan" />
        <Field
          label="Phone Number"
          value={phone}
          onChangeText={setPhone}
          placeholder="03xxxxxxxxx"
          keyboardType="phone-pad"
        />
        <Field
          label="Email (optional)"
          value={email}
          onChangeText={setEmail}
          placeholder="name@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Choose a password"
          secureTextEntry
        />

        <Button title="Sign Up" onPress={handleSignup} loading={loading} />

        <Button
          title="Already have an account? Log in"
          variant="secondary"
          onPress={() => navigation.navigate("Login")}
          style={{ marginTop: 10 }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "800", color: COLORS.dark, textAlign: "center" },
  subtitle: { fontSize: 13, color: COLORS.gray, textAlign: "center", marginBottom: 20, marginTop: 4 },
});
