import { useState, useEffect } from "react";
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
import { addPersonalSpend } from "../../data/spend";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import {
  listBudgetsByMonth,
  ensureRecurringBudgets,
  type BudgetRow,
} from "../../data/budgets";

function getYYYYMM(d = new Date()) {
  return d.getFullYear() * 100 + (d.getMonth() + 1);
}

export default function AddPersonalSpend() {
  const [amount, setAmount] = useState("");
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const router = useRouter();
  const yyyymm = getYYYYMM();

  useEffect(() => {
    (async () => {
      await ensureRecurringBudgets(yyyymm);
      const b = await listBudgetsByMonth(yyyymm);
      setBudgets(b);
      setBudgetId(b[0]?.id ?? null);
    })();
  }, [yyyymm]);

  async function onSave() {
    const val = Number(amount);
    if (!amount || isNaN(val) || val <= 0) {
      Alert.alert("Invalid amount", "Enter a positive number.");
      return;
    }
    await addPersonalSpend(val, budgetId, note || undefined);
    router.back();
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Ionicons name="wallet-outline" color="#10B981" size={30} />
          <Text style={styles.title}>Personal Expense</Text>
        </View>
        <TextInput
          placeholder="Amount (e.g. 12.50)"
          placeholderTextColor="#6B7280"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          style={styles.input}
        />
        <View style={styles.pickerCard}>
          <Text style={styles.pickerLabel}>Budget</Text>
          <Picker
            selectedValue={budgetId}
            onValueChange={(value) => setBudgetId(value)}
            dropdownIconColor="#9CA3AF"
            style={{ color: "#E5E7EB" }}
          >
            {budgets.length === 0 ? (
              <Picker.Item label="(No budgets — select None)" value={null} />
            ) : (
              budgets.map((b) => (
                <Picker.Item
                  key={b.id}
                  label={`${b.name} ($${b.amount.toFixed(2)})`}
                  value={b.id}
                />
              ))
            )}
            <Picker.Item label="None" value={null} />
          </Picker>
        </View>
        <TextInput
          placeholder="Note (optional)"
          placeholderTextColor="#6B7280"
          value={note}
          onChangeText={setNote}
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
  container: { flex: 1, padding: 16, backgroundColor: "#0B0F14" },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#10B981",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
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
    marginTop: 6,
  },
  btnText: { color: "white", fontWeight: "700" },
  pickerCard: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  pickerLabel: { color: "#9CA3AF", marginBottom: 6 },
});
