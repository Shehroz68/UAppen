import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Image } from 'react-native';
import { useRouter } from 'expo-router';

export default function LandingPage() {
  const router = useRouter();

  const handleLogin = () => {
    // Navigate to main app (tabs)
    router.push('/login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* UMass Logo - Top Right */}
      <View style={styles.logoContainer}>
        <Image 
          source={require('../assets/images/umass-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* UAppen Logo */}
        <View style={styles.logoImageContainer}>
          <Image 
            source={require('../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Tagline */}
        <View style={styles.taglineContainer}>
          <Text style={styles.taglineTop}>Hey UMass,</Text>
          <Text style={styles.taglineBottom}>What's happening?</Text>
        </View>

        {/* Login Button */}
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={handleLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.loginButtonText}>UMASS AMHERST LOGIN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  logoContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  logo: {
    width: 90,
    height: 90,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoImageContainer: {
    marginBottom: 50,
    alignItems: 'center',
  },
  logoImage: {
    width: 280,
    height: 280,
  },
  taglineContainer: {
    marginBottom: 70,
    alignItems: 'center',
  },
  taglineTop: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '400',
    marginBottom: 2,
  },
  taglineBottom: {
    fontSize: 30,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  loginButton: {
    backgroundColor: '#891515',
    paddingVertical: 18,
    paddingHorizontal: 50,
    borderRadius: 30,
    shadowColor: '#891515',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    minWidth: 340,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
});

