import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, SafeAreaView, StatusBar, LogBox, View, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { registerForPushNotificationsAsync } from './src/lib/notifications';
import { supabase } from './src/lib/supabase';

LogBox.ignoreAllLogs();

// Bottom safe-area color follows the web app theme so it blends into the
// bottom nav bar (var(--sidebar-bg)): white in light mode, near-black in dark.
const BOTTOM_LIGHT = '#FFFFFF';
const BOTTOM_DARK = '#1A0808';

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const pushTokenRef = useRef<string | null>(null);
  const syncedUserIdRef = useRef<string | null>(null);
  const [bottomColor, setBottomColor] = useState(BOTTOM_LIGHT);

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
      if (data.type === 'theme') {
        setBottomColor(data.theme === 'dark' ? BOTTOM_DARK : BOTTOM_LIGHT);
        return;
      }
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
      function postTheme() {
        try {
          var isLight = document.documentElement.classList.contains('light-mode');
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'theme', theme: isLight ? 'light' : 'dark' }));
        } catch (e) {}
      }
      postTheme();
      setInterval(postTheme, 1000);

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
      {/* Remaining screen (incl. the bottom home-indicator inset) follows the
          web theme so it blends into the bottom nav bar: white in light mode,
          near-black in dark mode, instead of a fixed black bar. */}
      <SafeAreaView style={[styles.container, { backgroundColor: bottomColor }]}>
        <WebView
          ref={webViewRef}
          source={{ uri: 'https://www.timebylonghorncarwash.com/' }}
          style={[styles.webview, { backgroundColor: bottomColor }]}
          geolocationEnabled={true}
          injectedJavaScript={syncScript}
          onMessage={handleMessage}
          allowsBackForwardNavigationGestures={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          // Punch photos use the front camera inside the page. iOS needs inline
          // playback or the preview opens fullscreen / never shows.
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          // Our own site gets camera access without a second web prompt; the
          // iOS system permission prompt still appears the first time.
          mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
          renderError={() => (
            <View style={styles.offline}>
              <Text style={styles.offlineTitle}>Can't reach Longhorn Car Wash</Text>
              <Text style={styles.offlineBody}>Check your Wi-Fi or cell signal and try again.</Text>
              <TouchableOpacity style={styles.retry} onPress={() => webViewRef.current?.reload()}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}
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
  offline: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  offlineTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  offlineBody: {
    fontSize: 15,
    color: '#555555',
    textAlign: 'center',
    marginBottom: 24,
  },
  retry: {
    backgroundColor: '#A93B2F',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
