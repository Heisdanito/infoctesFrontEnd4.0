import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import 'react-native-reanimated';


export default function RootLayout() {

  return (
    // dashboard overview tabbar icon
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name='studentDashboard'
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: () => <Ionicons name="home-outline" size={24} color="black" />

        }}
      />
      {/* submit atendance tabbar icon */}
      <Tabs.Screen
        name='ScanAttendanceFlow'
        options={{
          tabBarLabel: 'Scan Attendance',
          tabBarIcon: () => <Ionicons name="scan-outline" size={24} color="black" />
        }}
      />

      {/* post tab bar icon */}

      <Tabs.Screen
        name='News'
        options={{
          tabBarLabel: 'News',
          tabBarIcon: () => <Ionicons name="newspaper-outline" size={24} color="black" />
        }}
      />
      {/* profile icon tab */}
      <Tabs.Screen
        name='Profile'
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: () => <Ionicons name="person-outline" size={24} color="black" />
        }}
      />

    </Tabs>
  );
}
