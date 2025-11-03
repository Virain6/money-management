import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  FlatList,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { getAllPeopleIncludingMe } from "../../data/people";
import type { UserRow } from "../../types/db";
import { addExpenseWithSplits, SplitMode } from "../../data/expenses";
import {
  getSelectedMemberIds,
  subscribeSelection,
} from "../../lib/memberSelectionStore";

export default function AddSharedExpense() {
  const router = useRouter();
  const [people, setPeople] = useState<UserRow[]>([]);
  const [description, setDescription] = useState("");
  const [total, setTotal] = useState("");
  const [payerId, setPayerId] = useState<string>("me");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    getSelectedMemberIds()
  );
  const [category, setCategory] = useState("General");

  // split mode state
  const [mode, setMode] = useState<SplitMode>("equal");
  const [percents, setPercents] = useState<string[]>([]);
  const [shares, setShares] = useState<string[]>([]);
  const [amounts, setAmounts] = useState<string[]>([]);

  // Load people & subscribe to selection changes
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const p = await getAllPeopleIncludingMe();
      setPeople(p);
      setSelectedIds(getSelectedMemberIds());
      unsub = subscribeSelection(() => {
        const ids = getSelectedMemberIds();
        setSelectedIds(ids);
        if (!ids.includes(payerId)) {
          setPayerId(ids[0] ?? "me");
        }
      });
    })();

    return () => unsub();
  }, []);

  // Rebuild split inputs when selection changes
  useEffect(() => {
    const n = selectedIds.length || 0;
    setPercents((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? ""));
    setShares((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? ""));
    setAmounts((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? ""));
    if (!selectedIds.includes(payerId) && selectedIds.length > 0) {
      setPayerId(selectedIds[0]);
    }
  }, [selectedIds]);

  const selectedUsers = useMemo(
    () =>
      selectedIds
        .map((id) => people.find((p) => p.id === id))
        .filter(Boolean) as UserRow[],
    [selectedIds, people]
  );

  function openMemberPicker() {
    router.push("/add/select-members");
  }

  function setArrayValue(
    kind: "percents" | "shares" | "amounts",
    idx: number,
    val: string
  ) {
    if (kind === "percents")
      setPercents((arr) => arr.map((v, i) => (i === idx ? val : v)));
    if (kind === "shares")
      setShares((arr) => arr.map((v, i) => (i === idx ? val : v)));
    if (kind === "amounts")
      setAmounts((arr) => arr.map((v, i) => (i === idx ? val : v)));
  }

  async function onSave() {
    const t = Number(total);
    if (!total || isNaN(t) || t <= 0) {
      Alert.alert("Invalid amount", "Enter a positive total.");
      return;
    }
    if (selectedIds.length === 0) {
      Alert.alert("No members", "Choose at least one participant.");
      return;
    }
    try {
      await addExpenseWithSplits({
        description: description || undefined,
        total: t,
        date: Date.now(),
        payerId,
        participantIds: selectedIds,
        category,
        mode,
        percents:
          mode === "percent" ? percents.map((x) => Number(x || 0)) : undefined,
        shares:
          mode === "shares" ? shares.map((x) => Number(x || 0)) : undefined,
        amounts:
          mode === "amounts" ? amounts.map((x) => Number(x || 0)) : undefined,
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Split error", e?.message ?? String(e));
    }
  }

  return (
    <SafeAreaView style={styles.sa} edges={["top"]}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Shared Expense</Text>

        <TextInput
          placeholder="Description (e.g., Sushi Night)"
          placeholderTextColor="#6B7280"
          value={description}
          onChangeText={setDescription}
          style={styles.input}
        />

        <TextInput
          placeholder="Total (e.g., 80.00)"
          placeholderTextColor="#6B7280"
          keyboardType="decimal-pad"
          value={total}
          onChangeText={setTotal}
          style={styles.input}
        />

        <TextInput
          placeholder="Category (optional)"
          placeholderTextColor="#6B7280"
          value={category}
          onChangeText={setCategory}
          style={styles.input}
        />

        {/* Payer (among selected) */}
        <Text style={styles.subhead}>Payer</Text>
        <FlatList
          horizontal
          data={selectedUsers}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ gap: 8, paddingVertical: 6 }}
          renderItem={({ item }) => {
            const active = payerId === item.id;
            return (
              <Pressable
                onPress={() => setPayerId(item.id)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text style={active ? styles.pillTextActive : styles.pillText}>
                  {item.display_name}
                </Text>
              </Pressable>
            );
          }}
        />

        <Pressable style={styles.secondaryBtn} onPress={openMemberPicker}>
          <Text style={styles.secondaryBtnText}>Edit members</Text>
        </Pressable>

        {/* Split mode */}
        <Text style={styles.subhead}>Split Method</Text>
        <View style={styles.segRow}>
          {(["equal", "percent", "shares", "amounts"] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.seg, mode === m && styles.segActive]}
            >
              <Text style={mode === m ? styles.segTextActive : styles.segText}>
                {m === "equal"
                  ? "Equal"
                  : m === "percent"
                  ? "Percent"
                  : m === "shares"
                  ? "Shares"
                  : "Amounts"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Dynamic inputs */}
        {mode === "percent" && (
          <View style={{ gap: 8, marginTop: 6 }}>
            {selectedUsers.map((u, i) => (
              <View key={u.id} style={styles.row}>
                <Text style={styles.rowText}>{u.display_name}</Text>
                <TextInput
                  placeholder="%"
                  placeholderTextColor="#6B7280"
                  keyboardType="decimal-pad"
                  value={percents[i] ?? ""}
                  onChangeText={(v) => setArrayValue("percents", i, v)}
                  style={[styles.smallInput, { textAlign: "right" }]}
                />
              </View>
            ))}
            <Text style={styles.helper}>Must sum to 100%</Text>
          </View>
        )}

        {mode === "shares" && (
          <View style={{ gap: 8, marginTop: 6 }}>
            {selectedUsers.map((u, i) => (
              <View key={u.id} style={styles.row}>
                <Text style={styles.rowText}>{u.display_name}</Text>
                <TextInput
                  placeholder="shares"
                  placeholderTextColor="#6B7280"
                  keyboardType="number-pad"
                  value={shares[i] ?? ""}
                  onChangeText={(v) => setArrayValue("shares", i, v)}
                  style={[styles.smallInput, { textAlign: "right" }]}
                />
              </View>
            ))}
            <Text style={styles.helper}>
              Any positive numbers; will be prorated
            </Text>
          </View>
        )}

        {mode === "amounts" && (
          <View style={{ gap: 8, marginTop: 6 }}>
            {selectedUsers.map((u, i) => (
              <View key={u.id} style={styles.row}>
                <Text style={styles.rowText}>{u.display_name}</Text>
                <TextInput
                  placeholder="$"
                  placeholderTextColor="#6B7280"
                  keyboardType="decimal-pad"
                  value={amounts[i] ?? ""}
                  onChangeText={(v) => setArrayValue("amounts", i, v)}
                  style={[styles.smallInput, { textAlign: "right" }]}
                />
              </View>
            ))}
            <Text style={styles.helper}>
              Must equal the total amount exactly
            </Text>
          </View>
        )}

        <Pressable style={styles.btn} onPress={onSave}>
          <Text style={styles.btnText}>Save</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sa: { flex: 1, backgroundColor: "#0B0F14" },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#E5E7EB",
    marginVertical: 12,
  },
  input: {
    backgroundColor: "#111827",
    color: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  subhead: {
    color: "#9CA3AF",
    marginTop: 8,
    marginBottom: 6,
    fontWeight: "600",
  },
  pill: {
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillActive: { backgroundColor: "#2F6FED" },
  pillText: { color: "#9CA3AF" },
  pillTextActive: { color: "white", fontWeight: "600" },
  segRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  seg: {
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  segActive: { backgroundColor: "#2F6FED" },
  segText: { color: "#9CA3AF" },
  segTextActive: { color: "white", fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: {
    backgroundColor: "#1F2937",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: { color: "#E5E7EB", fontWeight: "600" },
  row: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowText: { color: "#E5E7EB", fontWeight: "600" },
  helper: { color: "#9CA3AF", marginTop: 4 },
  smallInput: {
    minWidth: 90,
    backgroundColor: "#0B0F14",
    color: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginLeft: 12,
  },
  secondaryBtn: {
    backgroundColor: "#1F2937",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  secondaryBtnText: { color: "#E5E7EB", fontWeight: "700" },
  btn: {
    backgroundColor: "#2F6FED",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  btnText: { color: "white", fontWeight: "700" },
});
