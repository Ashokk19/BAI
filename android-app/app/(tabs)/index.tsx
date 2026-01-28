import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, ActivityIndicator, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { authService } from '../../src/services/authService';
import { dashboardService } from '../../src/services/dashboardService';
import { DashboardData, KPI } from '../../src/types/dashboard';

export default function DashboardScreen() {
  const theme = useTheme();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const result = await dashboardService.getDashboardData();
      setData(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLogout = async () => {
    await authService.logout();
    router.replace('/(auth)/login');
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Overview</Text>
      </View>

      <View style={styles.kpiContainer}>
        {data?.kpis.map((kpi, index) => (
          <Card key={index} style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={{ color: theme.colors.secondary }}>{kpi.title}</Text>
              <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>{kpi.value}</Text>
              <Text
                variant="bodySmall"
                style={{
                  color: kpi.change_type === 'increase' ? 'green' : 'red'
                }}
              >
                {kpi.change}
              </Text>
            </Card.Content>
          </Card>
        ))}
      </View>

      {/* Placeholder for Logout for now until Profile screen exists */}
      <Button mode="outlined" onPress={handleLogout} style={styles.logoutButton}>
        Logout
      </Button>
    </ScrollView>
  );
}
import { Button } from 'react-native-paper';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontWeight: 'bold',
  },
  kpiContainer: {
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    marginBottom: 10,
  },
  logoutButton: {
    margin: 20,
  }
});
