import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../../theme';
import { ManagerHomeScreen } from './ManagerHomeScreen';
import { TimesheetScreen } from './TimesheetScreen';
import { EmployeesScreen } from './EmployeesScreen';
import { PayrollScreen } from './PayrollScreen';
import { OpsScreen } from './OpsScreen';

const Stack = createNativeStackNavigator();

export function ManagerNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="ManagerHome" component={ManagerHomeScreen} options={{ title: 'Manager' }} />
      <Stack.Screen name="Timesheet" component={TimesheetScreen} options={{ title: 'Timesheet' }} />
      <Stack.Screen name="Employees" component={EmployeesScreen} options={{ title: 'Employees' }} />
      <Stack.Screen name="Payroll" component={PayrollScreen} options={{ title: 'Payroll' }} />
      <Stack.Screen name="Ops" component={OpsScreen} options={{ title: 'Digital Ops' }} />
    </Stack.Navigator>
  );
}
