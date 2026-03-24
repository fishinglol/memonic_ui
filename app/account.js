import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function AccountScreen() {
  const router = useRouter();

  const SettingItem = ({ icon, title, subtitle, onPress }) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={styles.itemIconContainer}>
        <Ionicons name={icon} size={22} color="#ffd33d" />
      </View>
      <View style={styles.itemTextContainer}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#48484a" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {/* Glow effect */}
            <View style={styles.avatarGlow} />
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={60} color="#fff" />
            </View>
            {/* Edit Icon */}
            <TouchableOpacity style={styles.editBadge}>
              <Ionicons name="pencil" size={14} color="#000" />
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>Julian Thorne</Text>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>
              <Text style={styles.premiumText}>PREMIUM CURATOR</Text>
              <Text style={styles.divider}>  •  </Text>
              <Text style={styles.memberText}>MEMBER SINCE 2023</Text>
            </Text>
          </View>
        </View>

        {/* Main Settings List */}
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="mic-outline"
            title="Voice Owner"
            subtitle="Manage your vocal identity"
          />
          <SettingItem
            icon="notifications-outline"
            title="Notification"
            subtitle="Control alerts and updates"
          />
          <SettingItem
            icon="lock-closed-outline"
            title="Change Password"
            subtitle="Secure your private access"
          />
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <View style={styles.dangerHeader}>
            <View style={styles.trashCircle}>
              <Ionicons name="trash-outline" size={20} color="#ff453a" />
            </View>
            <View style={styles.dangerTextContainer}>
              <Text style={styles.dangerTitle}>Delete Account</Text>
              <Text style={styles.dangerLabel}>PERMANENT ACTION</Text>
            </View>
          </View>
          <Text style={styles.dangerDescription}>
            All your entries, voice models, and collections will be erased forever.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111417',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    height: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatarGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 60,
    backgroundColor: '#ffd33d',
    opacity: 0.15,
    shadowColor: '#ffd33d',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2c2c2e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ffd33d',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#111417',
  },
  userName: {
    fontSize: 28,
    fontFamily: 'Garamond-Bold',
    color: '#fff',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  premiumText: {
    color: '#ffd33d',
    fontWeight: '700',
  },
  divider: {
    color: '#48484a',
  },
  memberText: {
    color: '#8e8e93',
    fontWeight: '500',
  },
  settingsGroup: {
    width: '90%',
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    paddingVertical: 10,
    marginBottom: 25,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  itemIconContainer: {
    width: 40,
    alignItems: 'flex-start',
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '600',
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#8e8e93',
    marginTop: 2,
  },
  dangerZone: {
    width: '90%',
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.2)',
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trashCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  dangerTextContainer: {
    flex: 1,
  },
  dangerTitle: {
    fontSize: 18,
    color: '#ff453a',
    fontWeight: 'bold',
  },
  dangerLabel: {
    fontSize: 10,
    color: '#ff453a',
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  dangerDescription: {
    fontSize: 13,
    color: '#8e8e93',
    lineHeight: 18,
  },
});
