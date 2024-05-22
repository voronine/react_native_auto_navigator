import { Tabs } from 'expo-router';
import React from 'react';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Image, StyleSheet, View } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarStyle: styles.tabBarStyle,
        tabBarItemStyle: styles.tabBarItemStyle,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
              <Image
                source={require('../../assets/images/rule.png')}
                style={[styles.icon, { tintColor: color }]}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => (
            <Image
              source={focused ? require('../../assets/images/message.png') : require('../../assets/images/message.png')}
              style={[styles.icon, { tintColor: color }]}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => (
            <Image
              source={focused ? require('../../assets/images/circle.png') : require('../../assets/images/circle.png')}
              style={[styles.icon, { tintColor: color }]}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => (
            <Image
              source={focused ? require('../../assets/images/user.png') : require('../../assets/images/user.png')}
              style={[styles.icon, { tintColor: color }]}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => (
            <Image
              source={focused ? require('../../assets/images/icons.png') : require('../../assets/images/icons.png')}
              style={[styles.icon, { tintColor: color }]}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarStyle: {
    backgroundColor: '#000',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    height: 72,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 30,
    paddingHorizontal: 40,
  },
  tabBarItemStyle: {
    height: '100%',
  },
  icon: {
    width: 35,
    height: 35,
  },
  iconContainer: {
    position: 'absolute',
    top: -40,
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    height: 60,
    borderRadius: 60,
    backgroundColor: '#000',
  },
  iconContainerFocused: {
    backgroundColor: '#000',
  },
});