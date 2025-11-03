import { db } from "../../db";
import type { PersonalSpendRow } from "../../types/db";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export async function addPersonalSpend(
  amount: number,
  category: string,
  note?: string,
  date?: number
) {
  const id = crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO personal_spend (id, user_id, amount, category, date, note)
     VALUES (?, 'me', ?, ?, ?, ?)`,
    [id, amount, category, date ?? Date.now(), note ?? null]
  );
  return id;
}

export async function listPersonalSpendByMonth(
  yyyymm: number,
  category?: string
) {
  const start = new Date(
    String(yyyymm).slice(0, 4) + "-" + String(yyyymm).slice(4) + "-01"
  ).getTime();
  const endMonth = new Date(
    String(yyyymm).slice(0, 4) + "-" + String(yyyymm).slice(4) + "-01"
  );
  endMonth.setMonth(endMonth.getMonth() + 1);
  const end = endMonth.getTime();

  if (category && category !== "All") {
    return db.getAllAsync<PersonalSpendRow>(
      `SELECT * FROM personal_spend WHERE user_id='me' AND date >= ? AND date < ? AND category = ?
       ORDER BY date DESC`,
      [start, end, category]
    );
  }
  return db.getAllAsync<PersonalSpendRow>(
    `SELECT * FROM personal_spend WHERE user_id='me' AND date >= ? AND date < ?
     ORDER BY date DESC`,
    [start, end]
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 84,
          backgroundColor: "#0B0F14",
          borderTopWidth: 0,
        },
        tabBarActiveTintColor: "#2F6FED",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarLabelStyle: { fontSize: 12, marginBottom: 6 },
      }}
    >
      <Tabs.Screen
        name="owings"
        options={{
          title: "Owings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: "Budgets",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="attach-money" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "＋",
          tabBarLabel: "Add",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" color={color} size={size + 8} />
          ),
        }}
      />
      <Tabs.Screen
        name="spending"
        options={{
          title: "My Spending",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="recent"
        options={{
          title: "Recent",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
