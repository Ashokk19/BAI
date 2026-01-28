import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { authService } from '../src/services/authService';

export default function Index() {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const isAuthenticated = await authService.isAuthenticated();
            if (isAuthenticated) {
                router.replace('/(tabs)');
            } else {
                router.replace('/(auth)/login');
            }
        } catch (e) {
            router.replace('/(auth)/login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" />
        </View>
    );
}
