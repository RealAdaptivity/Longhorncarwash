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
    <>
      <StatusBar barStyle="light-content" backgroundColor="#A93B2F" />
      {/* Top safe-area inset painted the brand red so it blends into the
          app header instead of showing a black bar behind the notch. */}
      <SafeAreaView style={styles.topSafeArea} />
      {/* Remaining screen (incl. the bottom home-indicator inset) is white
          so it blends into the bottom nav bar instead of a black bar. */}
      <SafeAreaView style={styles.container}>
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
    </>
  );
}

const styles = StyleSheet.create({
  topSafeArea: {
    flex: 0,
    backgroundColor: '#A93B2F',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
