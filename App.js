import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Switch,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {fetchPCStatus as apiGetPCStatus, turnOnPC as apiTurnOnPC} from './api';

const App = () => {
  const [isPCOn, setIsPCOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Function to fetch PC status
  const fetchPCStatus = async () => {
    try {
      setIsLoading(true);
      const pcStatus = await apiGetPCStatus();
      setIsPCOn(pcStatus);
      
    } catch (error) {
      console.error('Error fetching PC status:', error);
      Alert.alert(
        'Error',
        'Failed to fetch PC status. Please check your internet connection and try again.',
        [{text: 'OK'}]
      );
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  };

  // Function to turn on PC
  const turnOnPC = async () => {
    try {
      setIsLoading(true);
      await apiTurnOnPC();

      // After successful POST, refresh the status
      await fetchPCStatus();
      
    } catch (error) {
      console.error('Error turning on PC:', error);
      Alert.alert(
        'Error',
        'Failed to turn on PC. Please try again.',
        [{text: 'OK'}]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle toggle change
  const handleToggleChange = (value) => {
    if (value && !isPCOn) {
      turnOnPC();
    }
    // Note: We don't allow turning OFF, so we ignore value=false
  };

  // Fetch status on component mount
  useEffect(() => {
    fetchPCStatus();
  }, []);

  // Determine if the switch should be disabled
  const isSwitchDisabled = isPCOn || isLoading;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <View style={styles.content}>
        <Text style={styles.title}>PC Connect</Text>
        <Text style={styles.subtitle}>Remote PC Control</Text>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>PC Status:</Text>
          <Text style={[
            styles.statusText,
            isPCOn ? styles.statusOn : styles.statusOff
          ]}>
            {isInitialLoad ? 'Checking...' : (isPCOn ? 'ON' : 'OFF')}
          </Text>
        </View>

        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Turn On PC</Text>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>
                {isInitialLoad ? 'Loading...' : 'Processing...'}
              </Text>
            </View>
          ) : (
            <Switch
              trackColor={{false: '#767577', true: '#81b0ff'}}
              thumbColor={isPCOn ? '#007AFF' : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              onValueChange={handleToggleChange}
              value={isPCOn}
              disabled={isSwitchDisabled}
              style={styles.switch}
            />
          )}
        </View>

        <Text style={styles.infoText}>
          {isPCOn 
            ? 'Your PC is currently ON' 
            : 'Toggle the switch to turn on your PC'
          }
        </Text>

        {isPCOn && (
          <Text style={styles.noteText}>
            Note: The PC can only be turned ON remotely, not OFF.
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginRight: 12,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusOn: {
    color: '#28a745',
    backgroundColor: '#d4edda',
  },
  statusOff: {
    color: '#dc3545',
    backgroundColor: '#f8d7da',
  },
  toggleContainer: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 200,
  },
  toggleLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  switch: {
    transform: [{scaleX: 1.2}, {scaleY: 1.2}],
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  noteText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
});

export default App;
