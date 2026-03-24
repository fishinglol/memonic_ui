import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect } from 'react';
import AddMemberSheet from '../components/sub_member';
import { API_URL, AI_URL } from './config';

export default function AccountScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('Loading...');
  const [voiceSheetVisible, setVoiceSheetVisible] = useState(false);
  
  // Notification State
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Change Password Modal State
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Loading State for Actions
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('user_name').then(name => setUserName(name || 'Unknown User'));
  }, []);

  const handleNotificationToggle = () => {
    Alert.alert(
      "Notification Preference",
      "Do you want to receive alerts and updates?",
      [
        { text: "Non-Notification", onPress: () => setNotificationsEnabled(false) },
        { text: "Notify Me", onPress: () => setNotificationsEnabled(true) }
      ]
    );
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert("Error", "Please fill out all fields.");
      return;
    }
    setPasswordLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: userName,
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert("Success", "Password changed successfully.");
        setPasswordModalVisible(false);
        setCurrentPassword('');
        setNewPassword('');
      } else {
        Alert.alert("Error", data.detail || "Failed to update password.");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to connect to the server.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action is permanent and irreversible. Are you absolutely sure?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            setActionLoading(true);
            try {
              // 1. Delete Voice Profile (AI Server)
              const aiUserId = await AsyncStorage.getItem('user_id');
              const aiFallbackId = userName; // Fallback to username 
              // Attempting to delete based on how enroll works. Enroll uses user_id from req
              await fetch(`${AI_URL}/api/voice-profile/${aiUserId || aiFallbackId}`, { method: 'DELETE' });

              // 2. Delete User Data (Core Server)
              const response = await fetch(`${API_URL}/api/account/${userName}`, {
                method: 'DELETE'
              });

              if (response.ok) {
                // Clear session and logout
                await AsyncStorage.clear();
                router.replace('/');
              } else {
                const data = await response.json();
                Alert.alert("Error", data.detail || "Could not delete account.");
              }
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Server connection failed during deletion.");
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

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

          <Text style={styles.userName}>{userName}</Text>
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
            onPress={() => setVoiceSheetVisible(true)}
          />
          <SettingItem
            icon={notificationsEnabled ? "notifications-outline" : "notifications-off-outline"}
            title="Notification"
            subtitle={notificationsEnabled ? "On (Notify Me)" : "Off (Non-Notification)"}
            onPress={handleNotificationToggle}
          />
          <SettingItem
            icon="lock-closed-outline"
            title="Change Password"
            subtitle="Secure your private access"
            onPress={() => setPasswordModalVisible(true)}
          />
        </View>

        {/* Danger Zone */}
        <TouchableOpacity style={styles.dangerZone} onPress={handleDeleteAccount} disabled={actionLoading}>
          <View style={styles.dangerHeader}>
            <View style={styles.trashCircle}>
              {actionLoading ? (
                <ActivityIndicator color="#ff453a" size="small" />
              ) : (
                <Ionicons name="trash-outline" size={20} color="#ff453a" />
              )}
            </View>
            <View style={styles.dangerTextContainer}>
              <Text style={styles.dangerTitle}>
                {actionLoading ? "Deleting..." : "Delete Account"}
              </Text>
              <Text style={styles.dangerLabel}>PERMANENT ACTION</Text>
            </View>
          </View>
          <Text style={styles.dangerDescription}>
            All your entries, voice models, and collections will be erased forever.
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Voice Owner / Add Member Sheet */}
      <AddMemberSheet
        visible={voiceSheetVisible}
        onClose={() => setVoiceSheetVisible(false)}
      />

      {/* Change Password Modal */}
      <Modal
        visible={passwordModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <Text style={styles.modalSubtitle}>Please enter your current and new password.</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Current Password"
              placeholderTextColor="#8e8e93"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor="#8e8e93"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setPasswordModalVisible(false);
                  setCurrentPassword('');
                  setNewPassword('');
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleChangePassword}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.modalButtonSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#1c1c1e',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    color: '#fff',
    fontFamily: 'Garamond-Bold',
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8e8e93',
    fontFamily: 'Garamond-Regular',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 10,
  },
  modalButtonSave: {
    backgroundColor: '#ffd33d',
    marginLeft: 10,
  },
  modalButtonCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSaveText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
