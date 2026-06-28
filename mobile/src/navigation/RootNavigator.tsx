import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

import { PinScreen } from '../screens/PinScreen';
import { TimeclockScreen } from '../screens/TimeclockScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { MyHoursScreen } from '../screens/MyHoursScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ManagerNavigator } from '../screens/manager/ManagerNavigator';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Clock: 'Clock',
    Schedule: 'Cal',
    'My Hours': 'Hrs',
    Manager: 'Mgr',
    Settings: 'Set',
  };
  return (
    <Text style={{ fontSize: 10, color: focused ? colors.primary : colors.textMuted, fontWeight: focused ? '700' : '400' }}>
      {icons[name] ?? name}
    </Text>
  );
}

function MainTabs() {
  const { isManagerUnlocked } = useAuth();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 60 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, marginBottom: 4 },
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Clock" component={TimeclockScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="My Hours" component={MyHoursScreen} />
      {isManagerUnlocked && (
        <Tab.Screen name="Manager" component={ManagerNavigator} />
      )}
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Pin" component={PinScreen} />
      ) : (
        <Stack.Screen name="Main" component={MainTabs} />
      )}
    </Stack.Navigator>
  );
}
