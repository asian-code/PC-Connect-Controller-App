import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './LoginScreen';
import VMListScreen from './VMListScreen';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsLoggedIn(false);
  };

  return (
    <>
      <StatusBar style="auto" />
      {!isLoggedIn ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <VMListScreen onLogout={handleLogout} />
      )}
    </>
  );
};

export default App;
