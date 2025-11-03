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
import { useLocalSearchParams, useRouter } from "expo-router";
import type { UserRow } from "../../../types/db";
import { getAllPeopleIncludingMe } from "../../../data/people";
import {
  getExpenseWithParticipants,
  updateExpenseWithSplits,
  type SplitMode,
} from "../../../data/expenses";
import {
  getSelectedMemberIds,
  setSelectedMemberIds,
  subscribeSelection,
} from "../../../lib/memberSelectionStore";

export default function EditSharedExpense() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [people, setPeople] = useState<UserRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  // expense fields
  const [description, setDescription] = useState("");
  const [total, setTotal] = useState("");
  const [category, setCategory] = useState("General");
  const [payerId, setPayerId] = useState<string>("me");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    getSelectedMemberIds()
  );

  // split UI state
  const [mode, setMode] = useState<SplitMode>("equal");
  const [percents, setPercents] = useState<string[]>([]);
  const [shares, setShares] = useState<string[]>([]);
  const [amounts, setAmounts] = useState<string[]>([]);

  // load people + expense
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      if (!id) return;
      const p = await getAllPeopleIncludingMe();
      setPeople(p);

      const { expense, participants } = await getExpenseWithParticipants(
        String(id)
      );
      if (!expense) {
        Alert.alert("Not found");
        router.back();
        return;
      }

      setDescription(expense.description ?? "");
      setCategory(expense.category ?? "General");
      setTotal(String(expense.amount ?? 0));
      setPayerId(expense.payer_id ?? "me");

      // initialize selected from existing participants
      const ids = participants.map((x) => x.user_id);
      if (!ids.length) ids.push("me");
      setSelectedMemberIds(ids); // seed the store for the picker route too
      setSelectedIds(ids);

      // default the edit mode to "amounts" mirroring existing shares
      setMode("amounts");
      setAmounts(participants.map((x) => String(x.share)));
      setPercents(new Array(ids.length).fill(""));
      setShares(new Array(ids.length).fill(""));

      // subscribe to updates from the member picker
      unsub = subscribeSelection(() => {
        const sel = getSelectedMemberIds();
        setSelectedIds(sel);
        if (!sel.includes(payerId) && sel.length) setPayerId(sel[0]);
        // resize arrays
        setPercents((prev) =>
          Array.from({ length: sel.length }, (_, i) => prev[i] ?? "")
        );
        setShares((prev) =>
          Array.from({ length: sel.length }, (_, i) => prev[i] ?? "")
        );
        setAmounts((prev) =>
          Array.from({ length: sel.length }, (_, i) => prev[i] ?? "")
        );
      });

      setLoaded(true);
    })();

    return () => unsub();
  }, [id]);

  const selectedUsers = useMemo(
    () =>
      selectedIds
        .map((uid) => people.find((p) => p.id === uid))
        .filter(Boolean) as UserRow[],
    [selectedIds, people]
  );

  function openMemberPicker() {
    router.push("/add/select-members"); // reuse the existing picker screen
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
    if (!loaded || !id) return;
    const t = Number(total);
    if (!total || isNaN(t) || t <= 0)
      return Alert.alert("Invalid amount", "Enter a positive total.");
    if (selectedIds.length === 0)
      return Alert.alert("No members", "Choose at least one participant.");

    try {
      await updateExpenseWithSplits({
        id: String(id),
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
        <Text style={styles.title}>Edit Shared Expense</Text>

        <Pressable style={styles.secondaryBtn} onPress={openMemberPicker}>
          <Text style={styles.secondaryBtnText}>Edit members</Text>
        </Pressable>

        {/* chips */}
        <View style={styles.chipRow}>
          {selectedUsers.length === 0 ? (
            <Text style={styles.muted}>No members selected</Text>
          ) : (
            selectedUsers.map((u) => (
              <View key={u.id} style={styles.chip}>
                <Text style={styles.chipText}>{u.display_name}</Text>
              </View>
            ))
          )}
        </View>

        <TextInput
          placeholder="Description"
          placeholderTextColor="#6B7280"
          value={description}
          onChangeText={setDescription}
          style={styles.input}
        />

        <TextInput
          placeholder="Total"
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
          <Text style={styles.btnText}>Save Changes</Text>
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
