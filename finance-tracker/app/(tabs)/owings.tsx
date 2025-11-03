import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { listPeople } from "../../data/people";
import { listNetByPerson } from "../../data/expenses";
import type { UserRow } from "../../types/db";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import * as Haptics from "expo-haptics";
import { deletePerson } from "../../data/people";

export default function OwingsScreen() {
  const [people, setPeople] = useState<UserRow[]>([]);
  const [netMap, setNetMap] = useState<Map<string, number>>(new Map());
  const [sumOwedToMe, setSumOwedToMe] = useState(0);
  const [sumIOwe, setSumIOwe] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const p = await listPeople();
    const m = await listNetByPerson();
    setNetMap(m);
    // Sort people by how much they owe (descending)
    const sorted = [...p].sort((a, b) => {
      const netA = m.get(a.id) ?? 0;
      const netB = m.get(b.id) ?? 0;
      return netB - netA;
    });
    setPeople(sorted);
    let owed = 0;
    let owe = 0;
    m.forEach((val) => {
      if (val > 0) owed += val;
      else if (val < 0) owe += -val;
    });
    setSumOwedToMe(owed);
    setSumIOwe(owe);
  }, []);

  useEffect(() => {
    (async () => {
      await loadData();
    })();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await loadData();
      })();
      return () => {};
    }, [loadData])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const onDelete = (person: UserRow) => {
    Alert.alert(
      `Delete ${person.display_name}?`,
      `Remove this person and all their associated records? This will remove them from expenses and settlements.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePerson(person.id);
              await loadData();
            } catch (e) {
              console.error(e);
              Alert.alert("Delete failed", String(e));
            }
          },
        },
      ]
    );
  };

  const autoDelete = async (person: UserRow) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    try {
      await deletePerson(person.id);
      await loadData();
    } catch (e) {
      console.error(e);
      Alert.alert("Delete failed", String(e));
    }
  };

  const renderRightActions = (person: UserRow) => (
    <View style={{ justifyContent: "center", alignItems: "flex-end" }}>
      <Pressable
        onPress={() => onDelete(person)}
        style={{
          backgroundColor: "#EF4444",
          borderRadius: 12,
          paddingVertical: 12,
          paddingHorizontal: 16,
          marginLeft: 8,
          justifyContent: "center",
          alignItems: "center",
          minWidth: 88,
        }}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>Delete</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.sa} edges={["top"]}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.titleRow}>
          <Ionicons name="people-outline" color="#E5E7EB" size={30} />
          <Text style={styles.title}>Owings</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>I'm owed</Text>
            <Text style={styles.statValuePositive}>
              ${sumOwedToMe.toFixed(2)}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>I owe</Text>
            <Text style={styles.statValueNegative}>${sumIOwe.toFixed(2)}</Text>
          </View>
        </View>

        <FlatList
          data={people}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 8 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <Text style={styles.muted}>
              No people yet. Add one from the Plus tab.
            </Text>
          }
          refreshing={refreshing}
          onRefresh={handleRefresh}
          renderItem={({ item }) => {
            const net = netMap.get(item.id) ?? 0;
            const netText = (net >= 0 ? "+$" : "-$") + Math.abs(net).toFixed(2);
            const netStyle = { color: net >= 0 ? "#10B981" : "#EF4444" };
            return (
              <Swipeable
                renderRightActions={() => renderRightActions(item)}
                overshootRight={false}
                rightThreshold={96}
                friction={2}
                onSwipeableOpen={(direction) => {
                  if (direction === "left") {
                    autoDelete(item);
                  }
                }}
              >
                <Link href={`/person/${item.id}`} asChild>
                  <Pressable style={styles.card}>
                    <Text style={styles.name}>{item.display_name}</Text>
                    <Text style={[styles.net, netStyle]}>{netText}</Text>
                  </Pressable>
                </Link>
              </Swipeable>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sa: { flex: 1, backgroundColor: "#0B0F14" }, // safe-area bg
  container: { flex: 1, paddingHorizontal: 16, paddingBottom: 12 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#E5E7EB",
  },
  muted: { color: "#94A3B8" },
  card: {
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  name: { color: "#E5E7EB", fontSize: 16, fontWeight: "600" },
  net: { fontSize: 16, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  statLabel: { color: "#9CA3AF", marginBottom: 4, fontWeight: "600" },
  statValuePositive: { color: "#10B981", fontSize: 18, fontWeight: "700" },
  statValueNegative: { color: "#EF4444", fontSize: 18, fontWeight: "700" },
});
