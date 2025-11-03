import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { getAllPeopleIncludingMe } from "../../data/people";
import type { UserRow } from "../../types/db";
import {
  getSelectedMemberIds,
  setSelectedMemberIds,
} from "../../lib/memberSelectionStore";

export default function SelectMembers() {
  const router = useRouter();
  const [people, setPeople] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const p = await getAllPeopleIncludingMe();
      setPeople(p);
      const initial = new Set(getSelectedMemberIds());
      const map: Record<string, boolean> = {};
      p.forEach((u) => (map[u.id] = initial.has(u.id)));
      // ensure 'me' is always present (can be toggled off if you want; for now default on)
      if (!map["me"]) map["me"] = true;
      setSelected(map);
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return people;
    return people.filter(
      (p) =>
        p.display_name.toLowerCase().includes(term) ||
        (p.email ?? "").toLowerCase().includes(term)
    );
  }, [people, q]);

  function toggle(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  function confirm() {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    setSelectedMemberIds(ids.length ? ids : ["me"]);
    router.back();
  }

  return (
    <SafeAreaView style={styles.sa} edges={["top"]}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <Text style={styles.title}>Select Members</Text>

        <TextInput
          placeholder="Search name or email"
          placeholderTextColor="#6B7280"
          value={q}
          onChangeText={setQ}
          style={styles.input}
        />

        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
          renderItem={({ item }) => {
            const active = !!selected[item.id];
            return (
              <Pressable
                onPress={() => toggle(item.id)}
                style={[styles.row, active && styles.rowActive]}
              >
                <View>
                  <Text style={styles.rowText}>{item.display_name}</Text>
                  {!!item.email && (
                    <Text style={styles.rowSub}>{item.email}</Text>
                  )}
                </View>
                <View
                  style={[
                    styles.badge,
                    active ? styles.badgeOn : styles.badgeOff,
                    { justifyContent: "center", alignItems: "center" },
                  ]}
                >
                  {active ? (
                    <Ionicons name="checkmark" size={18} color="white" />
                  ) : (
                    <Ionicons name="add" size={18} color="#9CA3AF" />
                  )}
                </View>
              </Pressable>
            );
          }}
        />

        <Pressable style={styles.btn} onPress={confirm}>
          <Text style={styles.btnText}>Use Selected</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sa: { flex: 1, backgroundColor: "#0B0F14" },
  container: { flex: 1, paddingHorizontal: 16, paddingBottom: 12 },
  title: {
    fontSize: 24,
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
  row: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowActive: { backgroundColor: "#1F2937" },
  rowText: { color: "#E5E7EB", fontWeight: "600" },
  rowSub: { color: "#9CA3AF", marginTop: 2 },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: "center",
    textAlignVertical: "center",
    overflow: "hidden",
    fontWeight: "800",
  },
  badgeOn: { backgroundColor: "#2F6FED", color: "white" },
  badgeOff: { backgroundColor: "#0B0F14", color: "#9CA3AF" },
  btn: {
    backgroundColor: "#2F6FED",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  btnText: { color: "white", fontWeight: "700" },
});
