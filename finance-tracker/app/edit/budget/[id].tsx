import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getBudgetById, updateBudget } from "../../../data/budgets";

export default function EditBudgetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    (async () => {
      if (!id) return;
      const row = await getBudgetById(String(id));
      if (!row) {
        Alert.alert("Not found", "Budget not found");
        router.back();
        return;
      }
      setName(row.name);
      setAmount(String(row.amount));
    })();
  }, [id]);

  async function onSave() {
    const val = Number(amount);
    if (!name.trim()) return Alert.alert("Name required");
    if (isNaN(val) || val < 0) return Alert.alert("Amount must be ≥ 0");
    await updateBudget(String(id), { name: name.trim(), amount: val });
    router.back();
  }

  return (
    <SafeAreaView style={styles.sa} edges={["top"]}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.titleRow}>
          <Ionicons name="pricetags-outline" size={26} color="#E5E7EB" />
          <Text style={styles.title}>Edit Budget</Text>
        </View>

        <TextInput
          placeholder="Name"
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

        <Pressable style={styles.btn} onPress={onSave}>
          <Text style={styles.btnText}>Save</Text>
        </Pressable>
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
  title: { fontSize: 22, fontWeight: "700", color: "#E5E7EB" },
  input: {
    backgroundColor: "#111827",
    color: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: "#2F6FED",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: "white", fontWeight: "700" },
});
