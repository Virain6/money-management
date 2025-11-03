import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { createRecurringBudget } from "../../data/budgets";
import { useRouter } from "expo-router";

function getYYYYMM(d = new Date()) {
  return d.getFullYear() * 100 + (d.getMonth() + 1);
}

export default function BudgetsScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  const onAdd = async () => {
    const val = Number(amount);
    if (!name.trim() || isNaN(val) || val < 0) {
      Alert.alert("Invalid", "Enter a name and non-negative amount.");
      return;
    }
    await createRecurringBudget(name.trim(), val);
    Alert.alert("Saved", `Budget "${name.trim()}" created.`);
    setName("");
    setAmount("");
  };

  return (
    <SafeAreaView style={styles.sa} edges={["top"]}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.titleRow}>
          <Ionicons name="bar-chart-outline" color="#8B5CF6" size={26} />
          <Text style={styles.title}>Budgets</Text>
        </View>

        {/* Add form (stacked) */}
        <View style={styles.formStack}>
          <TextInput
            placeholder="Name (e.g. Food)"
            placeholderTextColor="#6B7280"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
          <TextInput
            placeholder="Amount"
            placeholderTextColor="#6B7280"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            style={styles.input}
          />
          <Pressable style={styles.btn} onPress={onAdd}>
            <Text style={styles.btnText}>Save</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sa: { flex: 1, backgroundColor: "#0B0F14" },
  container: { flex: 1, paddingHorizontal: 16, paddingBottom: 12 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: "700", color: "#8B5CF6" },
  formStack: {
    gap: 10,
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#111827",
    color: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  btn: {
    backgroundColor: "#2F6FED",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  btnText: { color: "white", fontWeight: "700" },
  card: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardTop: { color: "#E5E7EB", fontWeight: "700" },
  cardSub: { color: "#9CA3AF", marginTop: 2 },
});
