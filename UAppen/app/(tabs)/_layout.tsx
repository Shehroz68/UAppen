import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#881C1C',
        tabBarInactiveTintColor: '#9e9e9e',
        tabBarStyle: {
          backgroundColor: '#f5f5f5',
          borderTopColor: '#d0d0d0',
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="map.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Going',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="star.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
