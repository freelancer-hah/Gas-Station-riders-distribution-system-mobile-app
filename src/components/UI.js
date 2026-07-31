import React from "react";
import { 
  View, Text, TextInput, TouchableOpacity, 
  StyleSheet, ActivityIndicator, Animated 
} from "react-native";
import { Ionicons as Icon } from "@expo/vector-icons";

export const COLORS = {
  primary: "#0F62FE",
  primaryLight: "#E8F0FE",
  dark: "#161616",
  gray: "#6F6F6F",
  lightGray: "#F4F4F4",
  border: "#E0E0E0",
  danger: "#DA1E28",
  success: "#24A148",
  white: "#FFFFFF",
  warning: "#F1C21B",
  background: "#F8F9FA",
};

export function Screen({ children, style }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({ children, style, onPress }) {
  const CardComponent = onPress ? TouchableOpacity : View;
  return (
    <CardComponent 
      style={[styles.card, style]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {children}
    </CardComponent>
  );
}

export function Field({ label, icon, error, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputContainer, error && styles.inputError]}>
        {icon && <Icon name={icon} size={20} color={COLORS.gray} style={styles.inputIcon} />}
        <TextInput 
          placeholderTextColor="#9E9E9E" 
          style={[styles.input, icon && { paddingLeft: 4 }]} 
          {...props} 
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

export function Button({ 
  title, 
  onPress, 
  loading, 
  variant = "primary", 
  disabled, 
  style,
  icon,
  iconPosition = "left",
  size = "medium"
}) {
  const bg =
    variant === "primary" ? COLORS.primary : 
    variant === "danger" ? COLORS.danger : 
    variant === "success" ? COLORS.success :
    COLORS.lightGray;
  const color = variant === "secondary" ? COLORS.dark : COLORS.white;
  
  const sizeStyles = {
    small: { paddingVertical: 8, paddingHorizontal: 12 },
    medium: { paddingVertical: 13, paddingHorizontal: 20 },
    large: { paddingVertical: 16, paddingHorizontal: 24 },
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button, 
        { backgroundColor: bg, opacity: disabled ? 0.6 : 1 },
        sizeStyles[size],
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <View style={styles.buttonContent}>
          {icon && iconPosition === "left" && <Icon name={icon} size={20} color={color} style={styles.buttonIcon} />}
          <Text style={[styles.buttonText, { color }]}>{title}</Text>
          {icon && iconPosition === "right" && <Icon name={icon} size={20} color={color} style={styles.buttonIcon} />}
        </View>
      )}
    </TouchableOpacity>
  );
}

export function StatBox({ label, value, accent, icon }) {
  return (
    <Card style={styles.statBox}>
      <View style={styles.statHeader}>
        {icon && <Icon name={icon} size={24} color={accent || COLORS.primary} />}
        <Text style={[styles.statValue, accent && { color: accent }]}>{value}</Text>
      </View>
      <Text style={[styles.statLabel, accent && { color: accent }]}>{label}</Text>
    </Card>
  );
}

export function SectionTitle({ children, icon, rightAction }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleContainer}>
        {icon && <Icon name={icon} size={22} color={COLORS.primary} style={styles.sectionIcon} />}
        <Text style={styles.sectionTitle}>{children}</Text>
      </View>
      {rightAction && rightAction}
    </View>
  );
}

export function ErrorText({ children }) {
  if (!children) return null;
  return (
    <View style={styles.errorContainer}>
      <Icon name="alert-circle" size={16} color={COLORS.danger} />
      <Text style={styles.errorText}>{children}</Text>
    </View>
  );
}

export function SuccessText({ children }) {
  if (!children) return null;
  return (
    <View style={styles.successContainer}>
      <Icon name="checkmark-circle" size={16} color={COLORS.success} />
      <Text style={styles.successText}>{children}</Text>
    </View>
  );
}

export function Badge({ children, variant = "primary", style }) {
  const colors = {
    primary: COLORS.primary,
    danger: COLORS.danger,
    success: COLORS.success,
    warning: COLORS.warning,
    gray: COLORS.gray,
  };
  
  return (
    <View style={[styles.badge, { backgroundColor: colors[variant] }, style]}>
      <Text style={styles.badgeText}>{children}</Text>
    </View>
  );
}

export function ListItem({ title, subtitle, rightText, icon, onPress, leftIcon }) {
  return (
    <TouchableOpacity style={styles.listItem} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.listItemLeft}>
        {leftIcon && <Icon name={leftIcon} size={24} color={COLORS.primary} style={styles.listItemIcon} />}
        <View>
          <Text style={styles.listItemTitle}>{title}</Text>
          {subtitle && <Text style={styles.listItemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.listItemRight}>
        {rightText && <Text style={styles.listItemRightText}>{rightText}</Text>}
        {icon && <Icon name={icon} size={20} color={COLORS.gray} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { 
    flex: 1, 
    backgroundColor: COLORS.background, 
    padding: 16 
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  label: { 
    fontSize: 13, 
    color: COLORS.gray, 
    marginBottom: 6, 
    fontWeight: "600" 
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.dark,
  },
  inputIcon: {
    paddingLeft: 12,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  button: {
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonIcon: {
    marginHorizontal: 6,
  },
  buttonText: { 
    fontWeight: "700", 
    fontSize: 15 
  },
  statBox: { 
    flex: 1, 
    minWidth: 140,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  statValue: { 
    fontSize: 22, 
    fontWeight: "800", 
    color: COLORS.dark 
  },
  statLabel: { 
    fontSize: 12, 
    color: COLORS.gray, 
    marginTop: 2 
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: { 
    fontSize: 17, 
    fontWeight: "800", 
    color: COLORS.dark 
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE8E8",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  errorText: { 
    color: COLORS.danger, 
    marginLeft: 8,
    fontSize: 13,
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F8E8",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  successText: {
    color: COLORS.success,
    marginLeft: 8,
    fontSize: 13,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "700",
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  listItemIcon: {
    marginRight: 12,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.dark,
  },
  listItemSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  listItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listItemRightText: {
    fontSize: 14,
    color: COLORS.gray,
  },
});
