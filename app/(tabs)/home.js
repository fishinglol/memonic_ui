import { Text, View, StyleSheet } from 'react-native';

export default function Home() {
    return (
        <View style={styles.container}>

            {/* 1. High Light - บนสุด */}
            <View style={[styles.card, { marginTop: -150 }]}>
                <Text style={styles.highlightText}>High Light</Text>
            </View>

            {/* 2. Yesterday recap - อันที่สอง */}
            <View style={styles.card}>
                <Text style={styles.highlightText}>Yesterday recap</Text>
            </View>

            {/* 3. Recent App - ล่างสุด */}
            <View style={styles.card}>
                <Text style={styles.highlightText}>Recent App</Text>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#25292e',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20, // ระยะห่างระหว่างแต่ละ Card
    },
    // สไตล์ส่วนกลางสำหรับทุก Card
    card: {
        backgroundColor: '#1e2124',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
        padding: 40,
        borderRadius: 40,
        width: '85%',
        height: 140, // กำหนดความสูงให้แน่นอน
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        position: 'relative', // เพื่อให้ Text ด้านในที่เป็น absolute อ้างอิงจาก Card นี้
    },
    highlightText: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Garamond-Bold',
        position: 'absolute',
        top: 20,
        left: 25,
    },
});