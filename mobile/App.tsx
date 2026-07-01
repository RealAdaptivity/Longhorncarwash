import React, { useEffect, useRef } from 'react';
import { StyleSheet, SafeAreaView, StatusBar, LogBox } from 'react-native';
import { WebView } from 'react-native-webview';
import { registerForPushNotificationsAsync } from './src/lib/notifications';
import { supabase } from './src/lib/supabase';

LogBox.ignoreAllLogs();

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const pushTokenRef = useRef<string | null>(null);
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        pushTokenRef.current = token;
      }
    });
  }, []);

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'sync_user' && data.user && data.user.id) {
        const userId = data.user.id;
        const pushToken = pushTokenRef.current;

        if (pushToken && syncedUserIdRef.current !== userId) {
          const { error } = await supabase
            .from('users')
            .update({ push_token: pushToken })
            .eq('id', userId);

          if (!error) {
            syncedUserIdRef.current = userId;
          }
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
  };

  const syncScript = `
    (function() {
      setInterval(function() {
        var user = localStorage.getItem('lcw_web_user');
        if (user) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'sync_user', user: JSON.parse(user) }));
        }
      }, 3000);
    })();
    true;
  `;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://www.timebylonghorncarwash.com/' }}
        style={styles.webview}
        geolocationEnabled={true}
        injectedJavaScript={syncScript}
        onMessage={handleMessage}
        allowsBackForwardNavigationGestures={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },
  webview: {
    flex: 1,
    backgroundColor: '#111111',
  },
});
