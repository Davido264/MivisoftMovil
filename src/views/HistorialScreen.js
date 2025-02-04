import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HistorialScreen = () => {
  const [registros, setRegistros] = useState([]);

  useEffect(() => {
    const obtenerRegistros = async () => {
      try {
        const datos = await AsyncStorage.getItem('registros');
        if (datos) setRegistros(JSON.parse(datos));
      } catch (error) {
        console.error(error);
      }
    };
    obtenerRegistros();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Historial de Registros</Text>
      {registros.map((registro, index) => (
        <View key={index} style={styles.card}>
          <Text>ID: {registro.id}</Text>
          <Text>Fecha: {registro.fecha}</Text>
          <Text>Hora de Salida: {registro.horaSalida}</Text>
          <Text>Hora de Llegada: {registro.horaLlegada}</Text>
          <Text>Ubicación: {registro.ubicacion}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, marginBottom: 16, textAlign: 'center' },
  card: { padding: 16, borderColor: 'gray', borderWidth: 1, marginBottom: 12 },
});

export default HistorialScreen;