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

export default function EditSpend() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    (async () => {
      if (!id) return;
      const row = await getPersonalSpendById(id);
      if (!row) {
        Alert.alert("Not found");
        router.back();
        return;
      }
      setAmount(String(row.amount));
      setCategory(row.category);
      setNote(row.note ?? "");
    })();
  }, [id]);

  async function onSave() {
    const val = Number(amount);
    if (isNaN(val) || val <= 0) return Alert.alert("Amount must be > 0");
    await updatePersonalSpendBasic(String(id), { amount: val, category, note });
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
        <Text style={styles.title}>Edit Personal Spend</Text>
        <TextInput
          placeholder="Amount"
          placeholderTextColor="#6B7280"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          style={styles.input}
        />
        <TextInput
          placeholder="Category"
          placeholderTextColor="#6B7280"
          value={category}
          onChangeText={setCategory}
          style={styles.input}
        />
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
    color: "#E5E7EB",
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
});
