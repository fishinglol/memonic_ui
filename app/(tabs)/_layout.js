import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // ใช้ Icon มาตรฐานของ Expo

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                // 1. ปรับแต่งสีและความโปร่งแสงของแถบ Bar
                tabBarStyle: {
                    backgroundColor: '#1e2124', // สีเดียวกับ Card ของคุณ
                    borderTopWidth: 0,          // เอาเส้นขอบบนออกเพื่อให้ดูเนียน
                    elevation: 0,               // สำหรับ Android
                    height: 60,                 // เพิ่มความสูงให้ดูไม่เบียด
                    paddingBottom: 10,
                },
                tabBarActiveTintColor: '#ffd33d',   // สีเหลืองทองเมื่อเลือก (หรือใช้ขาว #fff)
                tabBarInactiveTintColor: '#8e8e93', // สีเทาเมื่อไม่ได้เลือก
                headerShown: false,                 // ซ่อน Header ของ Tab เพราะคุณทำ Header เองแล้ว
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="about"
                options={{
                    title: 'About',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'information-circle' : 'information-circle-outline'} size={24} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="chat"
                options={{
                    title: 'Chat',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={24} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}