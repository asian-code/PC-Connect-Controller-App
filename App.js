import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Switch,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  Pressable,
  Animated,
  Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { fetchPCStatus as apiGetPCStatus, turnOnPC as apiTurnOnPC } from './api';

const { width, height } = Dimensions.get('window');

const App = () => {
  const [isPCOn, setIsPCOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [pulseAnimation] = useState(new Animated.Value(1));
  const [fadeAnim] = useState(new Animated.Value(0));

  // Start fade in animation on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Pulse animation for the power button
  const startPulseAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnimation]);

  // Stop pulse animation
  const stopPulseAnimation = useCallback(() => {
    pulseAnimation.stopAnimation();
    Animated.timing(pulseAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [pulseAnimation]);

  // Function to fetch PC status
  const fetchPCStatus = async () => {
    try {
      setIsLoading(true);
      const pcStatus = await apiGetPCStatus();
      setIsPCOn(pcStatus);
      
      // Start pulse animation if PC is off
      if (!pcStatus) {
        startPulseAnimation();
      } else {
        stopPulseAnimation();
      }
      
    } catch (error) {
      console.error('Error fetching PC status:', error);
      Alert.alert(
        '🔌 Connection Error',
        'Unable to check PC status. Please verify your internet connection and try again.',
        [
          {text: 'Retry', onPress: fetchPCStatus},
          {text: 'Cancel', style: 'cancel'}
        ]
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
      stopPulseAnimation();
      
      await apiTurnOnPC();

      // Add a small delay for better UX
      setTimeout(async () => {
        await fetchPCStatus();
      }, 1000);
      
    } catch (error) {
      console.error('Error turning on PC:', error);
      Alert.alert(
        '⚡ Power Error',
        'Failed to power on your PC. Please check the connection and try again.',
        [
          {text: 'Retry', onPress: turnOnPC},
          {text: 'Cancel', style: 'cancel'}
        ]
      );
      // Restart pulse animation on error if PC is still off
      if (!isPCOn) {
        startPulseAnimation();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle power button press
  const handlePowerButtonPress = () => {
    if (!isPCOn && !isLoading) {
      // Haptic feedback - only vibrate on mobile platforms
      if (Platform.OS !== 'web') {
        Vibration.vibrate(50);
      }
      
      turnOnPC();
    }
  };

  // Handle switch change with haptic feedback
  const handleToggleChangeEnhanced = (value) => {
    if (value && !isPCOn && !isLoading) {
      // Haptic feedback - only vibrate on mobile platforms
      if (Platform.OS !== 'web') {
        Vibration.vibrate(50);
      }
      
      turnOnPC();
    }
    // Note: We don't allow turning OFF, so we ignore value=false
  };

  // Fetch status on component mount
  useEffect(() => {
    fetchPCStatus();
    
    // Cleanup animation on unmount
    return () => {
      stopPulseAnimation();
    };
  }, [stopPulseAnimation]);

  // Determine if the switch should be disabled
  const isSwitchDisabled = isPCOn || isLoading;

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" backgroundColor="transparent" translucent />
      
      {/* Animated Background Gradient */}
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />
      
      {/* Floating Orbs */}
      <Animated.View 
        style={[
          styles.orb, 
          styles.orb1,
          {opacity: fadeAnim}
        ]}
      />
      <Animated.View 
        style={[
          styles.orb, 
          styles.orb2,
          {opacity: fadeAnim}
        ]}
      />
      <Animated.View 
        style={[
          styles.orb, 
          styles.orb3,
          {opacity: fadeAnim}
        ]}
      />

      <SafeAreaView style={styles.safeArea}>
        <Animated.View 
          style={[
            styles.content,
            {opacity: fadeAnim}
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Animated.Text 
              style={[
                styles.title,
                {opacity: fadeAnim}
              ]}
            >
              PC Connect
            </Animated.Text>
            <Animated.Text 
              style={[
                styles.subtitle,
                {opacity: fadeAnim}
              ]}
            >
              Remote Power Control
            </Animated.Text>
          </View>

          {/* Status Card */}
          <Animated.View 
            style={[
              styles.glassCard,
              {opacity: fadeAnim}
            ]}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.glassGradient}
            >
              <View style={styles.statusHeader}>
                <Text style={styles.statusLabel}>PC Status</Text>
                <View style={[
                  styles.statusIndicator,
                  isPCOn ? styles.statusIndicatorOn : styles.statusIndicatorOff
                ]}>
                  <View style={[
                    styles.statusDot,
                    isPCOn ? styles.statusDotOn : styles.statusDotOff
                  ]} />
                </View>
              </View>
              
              <Text style={[
                styles.statusText,
                isPCOn ? styles.statusTextOn : styles.statusTextOff
              ]}>
                {isInitialLoad ? 'Checking...' : (isPCOn ? 'ONLINE' : 'OFFLINE')}
              </Text>
            </LinearGradient>
          </Animated.View>

          {/* Power Control Card */}
          <Animated.View 
            style={[
              styles.glassCard,
              {opacity: fadeAnim}
            ]}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.glassGradient}
            >
              <Text style={styles.controlLabel}>Power Control</Text>
              
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#ffffff" />
                  <Text style={styles.loadingText}>
                    {isInitialLoad ? 'Connecting...' : 'Powering On...'}
                  </Text>
                </View>
              ) : (
                <View style={styles.controlsContainer}>
                  {/* Power Button */}
                  <Pressable
                    onPress={handlePowerButtonPress}
                    disabled={isPCOn || isLoading}
                    style={({pressed}) => [
                      styles.powerButton,
                      isPCOn && styles.powerButtonDisabled,
                      pressed && styles.powerButtonPressed
                    ]}
                  >
                    <Animated.View 
                      style={[
                        styles.powerButtonInner,
                        !isPCOn && {transform: [{scale: pulseAnimation}]}
                      ]}
                    >
                      <LinearGradient
                        colors={isPCOn ? 
                          ['rgba(40, 167, 69, 0.8)', 'rgba(40, 167, 69, 0.6)'] : 
                          ['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']
                        }
                        style={styles.powerButtonGradient}
                      >
                        <Text style={[
                          styles.powerIcon,
                          isPCOn && styles.powerIconOn
                        ]}>
                          ⚡
                        </Text>
                      </LinearGradient>
                    </Animated.View>
                  </Pressable>

                  {/* Toggle Switch */}
                  <View style={styles.switchContainer}>
                    <Text style={styles.switchLabel}>Turn On PC</Text>
                    <Switch
                      trackColor={{
                        false: 'rgba(255,255,255,0.2)', 
                        true: 'rgba(129, 176, 255, 0.8)'
                      }}
                      thumbColor={isPCOn ? '#ffffff' : 'rgba(255,255,255,0.8)'}
                      ios_backgroundColor="rgba(255,255,255,0.2)"
                      onValueChange={handleToggleChangeEnhanced}
                      value={isPCOn}
                      disabled={isPCOn || isLoading}
                      style={styles.switch}
                    />
                  </View>
                </View>
              )}
            </LinearGradient>
          </Animated.View>

          {/* Info Card */}
          <Animated.View 
            style={[
              styles.infoCard,
              {opacity: fadeAnim}
            ]}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.infoGradient}
            >
              <Text style={styles.infoText}>
                {isPCOn 
                  ? '🟢 Your PC is powered on and ready' 
                  : '🔴 Tap the power button or toggle to start your PC'
                }
              </Text>
              
              {isPCOn && (
                <Text style={styles.noteText}>
                  💡 For security, remote shutdown is not available
                </Text>
              )}
            </LinearGradient>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  orb: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  orb1: {
    width: 200,
    height: 200,
    top: -100,
    left: -100,
  },
  orb2: {
    width: 150,
    height: 150,
    top: height * 0.3,
    right: -75,
  },
  orb3: {
    width: 120,
    height: 120,
    bottom: height * 0.2,
    left: width * 0.2,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    ...Platform.select({
      web: {
        textShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)',
      },
      default: {
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
      },
    }),
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  glassCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 10},
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  glassGradient: {
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  statusIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicatorOn: {
    backgroundColor: 'rgba(40, 167, 69, 0.3)',
    borderWidth: 2,
    borderColor: '#28a745',
  },
  statusIndicatorOff: {
    backgroundColor: 'rgba(220, 53, 69, 0.3)',
    borderWidth: 2,
    borderColor: '#dc3545',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotOn: {
    backgroundColor: '#28a745',
  },
  statusDotOff: {
    backgroundColor: '#dc3545',
  },
  statusText: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
  },
  statusTextOn: {
    color: '#4ade80',
    ...Platform.select({
      web: {
        textShadow: '0px 0px 10px rgba(74, 222, 128, 0.5)',
      },
      default: {
        textShadowColor: 'rgba(74, 222, 128, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
      },
    }),
  },
  statusTextOff: {
    color: '#f87171',
    ...Platform.select({
      web: {
        textShadow: '0px 0px 10px rgba(248, 113, 113, 0.5)',
      },
      default: {
        textShadowColor: 'rgba(248, 113, 113, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
      },
    }),
  },
  controlLabel: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 25,
  },
  controlsContainer: {
    alignItems: 'center',
  },
  powerButton: {
    marginBottom: 30,
  },
  powerButtonInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  powerButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 50,
  },
  powerButtonDisabled: {
    opacity: 0.7,
  },
  powerButtonPressed: {
    transform: [{scale: 0.95}],
  },
  powerIcon: {
    fontSize: 40,
    color: '#ffffff',
  },
  powerIconOn: {
    color: '#ffffff',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  switchLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  switch: {
    transform: [{scaleX: 1.2}, {scaleY: 1.2}],
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  infoCard: {
    marginTop: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  infoGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
  },
  infoText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  noteText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});

export default App;
