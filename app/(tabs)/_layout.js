import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { withLayoutContext } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Animated, View } from 'react-native';
import React, { useRef } from 'react';

const TopTab = withLayoutContext(createMaterialTopTabNavigator().Navigator);

export default function TabLayout() {
    // 1. Animated value for Y-axis (0 = visible, -150 = hidden off-screen)
    const translateY = useRef(new Animated.Value(0)).current;
    // Store the initial Y coordinate of the touch
    const touchY = useRef(0);

    const showTabBar = () => {
        Animated.timing(translateY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const hideTabBar = () => {
        Animated.timing(translateY, {
            toValue: -150,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    // 2. Track where the touch starts
    const handleTouchStart = (e) => {
        touchY.current = e.nativeEvent.pageY;
    };

    // 3. Calculate distance when touch ends to determine gesture
    const handleTouchEnd = (e) => {
        const endY = e.nativeEvent.pageY;
        const distance = endY - touchY.current;

        // Threshold of 30 pixels to differentiate a tap from a swipe
        if (distance > 30) {
            // Swiped down
            showTabBar();
        } else if (distance < -30) {
            // Swiped up
            hideTabBar();
        }
        // If distance is between -30 and 30, it was just a tap/click. Do nothing.
    };

    return (
        <View
            style={{ flex: 1, backgroundColor: '#25292e' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <TopTab
                screenOptions={{
                    tabBarShowLabel: false,
                    tabBarStyle: {
                        position: 'absolute',
                        top: 60,
                        left: 80,
                        right: 80,
                        height: 60,
                        backgroundColor: '#1c1c1e',
                        borderRadius: 30,
                        elevation: 5,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 10,
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        zIndex: 100,
                        overflow: 'hidden',
                        transform: [{ translateY: translateY }],
                    },
                    tabBarIndicatorStyle: {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        height: '70%',
                        top: '15%',
                        borderRadius: 25,
                        width: '28%',
                        marginLeft: '2.5%',
                    },
                    tabBarActiveTintColor: '#ffffff',
                    tabBarInactiveTintColor: '#8e8e93',
                    swipeEnabled: true,
                }}
            >
                <TopTab.Screen
                    name="home"
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
                        ),
                    }}
                />
                <TopTab.Screen
                    name="chat"
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={24} color={color} />
                        ),
                    }}
                />
                <TopTab.Screen
                    name="settings"
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />
                        ),
                    }}
                />
            </TopTab>
        </View>
    );
}