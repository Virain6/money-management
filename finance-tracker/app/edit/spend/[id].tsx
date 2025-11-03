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
import {
  getPersonalSpendById,
  updatePersonalSpendBasic,
  deletePersonalSpend,
} from "../../../data/spend";
import { Picker } from "@react-native-picker/picker";
import {
  listBudgetsByMonth,
  ensureRecurringBudgets,
  type BudgetRow,
} from "../../../data/budgets";
import { Ionicons } from "@expo/vector-icons";

export default function EditSpend() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [spendMonth, setSpendMonth] = useState<number | null>(null); // YYYYMM for this spend
  const [note, setNote] = useState("");

  useEffect(() => {
    (async () => {
      if (!id) return;
      const row = await getPersonalSpendById(String(id));
      if (!row) {
        Alert.alert("Not found");
        router.back();
        return;
      }
      setAmount(String(row.amount));
      setNote(row.note ?? "");
      // derive month from row.date (ms) -> YYYYMM
      const d = new Date(row.date);
      const m = d.getFullYear() * 100 + (d.getMonth() + 1);
      setSpendMonth(m);
      // ensure recurring templates are materialized for that month, then load
      await ensureRecurringBudgets(m);
      const b = await listBudgetsByMonth(m);
      setBudgets(b);
      setBudgetId(row.budget_id ?? null);
    })();
  }, [id]);

  async function onSave() {
    const val = Number(amount);
    if (isNaN(val) || val <= 0) return Alert.alert("Amount must be > 0");
    await updatePersonalSpendBasic(String(id), { amount: val, budgetId, note });
    router.back();
  }

  async function onDelete() {
    Alert.alert("Delete", "Delete this personal spend?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deletePersonalSpend(String(id));
          router.back();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.sa} edges={["top"]}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.titleRow}>
          <Ionicons name="person-outline" color="#10B981" size={30} />
          <Text style={styles.title}>Edit Personal Expense</Text>
        </View>
        <TextInput
          placeholder="Amount"
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
        <Pressable style={[styles.btn, styles.btnDanger]} onPress={onDelete}>
          <Text style={styles.btnText}>Delete</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sa: { flex: 1, backgroundColor: "#0B0F14" },
  container: { flex: 1, paddingHorizontal: 16, paddingBottom: 12 },
  title: {
    fontSize: 22,
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
  btnDanger: { backgroundColor: "#EF4444" },
  btnText: { color: "white", fontWeight: "700" },
  pickerCard: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  pickerLabel: { color: "#9CA3AF", marginBottom: 6 },
});
