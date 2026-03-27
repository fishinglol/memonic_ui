import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { withLayoutContext } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Animated, View } from 'react-native';
import React, { useRef } from 'react';

const C = {
    bg:          '#2c3240',
    surface:     '#323848',
    surfaceDeep: '#262c38',
    shadowDark:  '#1e222c',
    text:        '#ffffff',
    textMuted:   '#8a92a6',
};

const TopTab = withLayoutContext(createMaterialTopTabNavigator().Navigator);

export default function TabLayout() {
    const translateY = useRef(new Animated.Value(0)).current;
    const touchY = useRef(0);

    const showTabBar = () => {
        Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    };
    const hideTabBar = () => {
        Animated.timing(translateY, { toValue: -150, duration: 300, useNativeDriver: true }).start();
    };

    const handleTouchStart = (e) => { touchY.current = e.nativeEvent.pageY; };
    const handleTouchEnd = (e) => {
        const d = e.nativeEvent.pageY - touchY.current;
        if (d > 30) showTabBar();
        else if (d < -30) hideTabBar();
    };

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <TopTab
                screenOptions={{
                    tabBarShowLabel: false,
                    tabBarStyle: {
                        position: 'absolute',
                        top: 60, left: 80, right: 80, height: 60,
                        backgroundColor: C.surface,
                        borderRadius: 24,
                        elevation: 6,
                        shadowColor: C.shadowDark,
                        shadowOffset: { width: 5, height: 5 },
                        shadowOpacity: 0.35,
                        shadowRadius: 10,
                        zIndex: 100,
                        overflow: 'hidden',
                        transform: [{ translateY }],
                    },
                    tabBarIndicatorStyle: {
                        backgroundColor: C.surfaceDeep,
                        height: '70%', top: '15%',
                        borderRadius: 20, width: '28%', marginLeft: '2.5%',
                    },
                    tabBarActiveTintColor: C.text,
                    tabBarInactiveTintColor: C.textMuted,
                    swipeEnabled: true,
                }}
            >
                <TopTab.Screen name="home" options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
                    ),
                }} />
                <TopTab.Screen name="chat" options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={24} color={color} />
                    ),
                }} />
                <TopTab.Screen name="settings" options={{
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />
                    ),
                }} />
            </TopTab>
        </View>
    );
}