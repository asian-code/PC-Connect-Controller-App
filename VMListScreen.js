import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { fetchVMs, startVM, getCurrentUser, clearAuth } from './api';

export default function VMListScreen({ onLogout }) {
  const [vms, setVms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startingVMs, setStartingVMs] = useState(new Set());
  const currentUser = getCurrentUser();

  const loadVMs = useCallback(async () => {
    try {
      const data = await fetchVMs();
      setVms(data);
    } catch (error) {
      console.error('Error loading VMs:', error);
      if (error.message.includes('Unauthorized')) {
        Alert.alert(
          'Session Expired',
          'Please login again',
          [{ text: 'OK', onPress: handleLogout }]
        );
      } else {
        Alert.alert('Error', error.message);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadVMs();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadVMs, 30000);
    return () => clearInterval(interval);
  }, [loadVMs]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadVMs();
  };

  const handleStartVM = async (vmId, vmName) => {
    if (startingVMs.has(vmId)) return;

    setStartingVMs(prev => new Set(prev).add(vmId));

    try {
      const result = await startVM(vmId);
      
      if (result.success) {
        Alert.alert('Success', `${vmName} is starting up`);
        // Refresh VM list after a short delay
        setTimeout(loadVMs, 2000);
      } else {
        Alert.alert('Notice', result.message);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setStartingVMs(prev => {
        const newSet = new Set(prev);
        newSet.delete(vmId);
        return newSet;
      });
    }
  };

  const handleLogout = () => {
    clearAuth();
    onLogout();
  };

  const renderVMCard = ({ item }) => {
    const isRunning = item.status === 'running';
    const isStarting = startingVMs.has(item.vm_id);
    const canStart = !isRunning && !isStarting;

    return (
      <View style={styles.card}>
        {/* VM Header */}
        <View style={styles.cardHeader}>
          <View style={styles.vmInfo}>
            <Text style={styles.vmName}>{item.vm_name}</Text>
            {item.assigned_user && currentUser?.is_admin && (
              <Text style={styles.assignedUser}>
                Assigned to: {item.assigned_user}
              </Text>
            )}
          </View>
          
          {/* Status Indicator */}
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusDot,
              isRunning ? styles.statusDotRunning : styles.statusDotStopped
            ]} />
            <Text style={[
              styles.statusText,
              isRunning ? styles.statusTextRunning : styles.statusTextStopped
            ]}>
              {isRunning ? 'Running' : 'Stopped'}
            </Text>
          </View>
        </View>

        {/* VM Details */}
        {isRunning && item.uptime && (
          <View style={styles.vmDetails}>
            <Text style={styles.detailText}>
              Uptime: {Math.floor(item.uptime / 3600)}h {Math.floor((item.uptime % 3600) / 60)}m
            </Text>
          </View>
        )}

        {/* Power Button */}
        <TouchableOpacity
          style={[
            styles.powerButton,
            isRunning && styles.powerButtonDisabled,
            isStarting && styles.powerButtonStarting,
          ]}
          onPress={() => handleStartVM(item.vm_id, item.vm_name)}
          disabled={!canStart}
        >
          {isStarting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.powerButtonText}>
              {isRunning ? '● Running' : '▶ Power On'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading VMs...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Workstations</Text>
          <Text style={styles.headerSubtitle}>
            {currentUser?.is_admin ? 'Admin View' : currentUser?.email}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* VM List */}
      <FlatList
        data={vms}
        renderItem={renderVMCard}
        keyExtractor={(item) => item.vm_id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No VMs assigned</Text>
            <Text style={styles.emptySubtext}>
              Contact your administrator
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  vmInfo: {
    flex: 1,
  },
  vmName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  assignedUser: {
    fontSize: 13,
    color: '#666',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusDotRunning: {
    backgroundColor: '#34C759',
  },
  statusDotStopped: {
    backgroundColor: '#FF3B30',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusTextRunning: {
    color: '#34C759',
  },
  statusTextStopped: {
    color: '#FF3B30',
  },
  vmDetails: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  powerButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  powerButtonDisabled: {
    backgroundColor: '#34C759',
    shadowOpacity: 0,
  },
  powerButtonStarting: {
    backgroundColor: '#FF9500',
  },
  powerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
  },
});
