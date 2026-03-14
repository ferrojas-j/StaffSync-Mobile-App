import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from './supabase';

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      checkActiveSession(selectedEmployeeId);
    } else {
      setActiveSession(null);
    }
  }, [selectedEmployeeId]);

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('id, full_name')
      .order('full_name');
    
    if (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar los empleados.');
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  };

  const checkActiveSession = async (employeeId) => {
    setActionLoading(true);
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('id, start_time')
      .eq('employee_id', employeeId)
      .is('end_time', null)
      .order('start_time', { ascending: false })
      .limit(1);

    if (error) {
      console.error(error);
    } else if (data && data.length > 0) {
      setActiveSession(data[0]);
    } else {
      setActiveSession(null);
    }
    setActionLoading(false);
  };

  const handleClockIn = async () => {
    if (!selectedEmployeeId) return;

    setActionLoading(true);
    const { error } = await supabase
      .from('attendance_logs')
      .insert({ employee_id: selectedEmployeeId });

    if (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo registrar la entrada.');
    } else {
      Alert.alert('Éxito', 'Entrada registrada correctamente.');
      checkActiveSession(selectedEmployeeId);
    }
    setActionLoading(false);
  };

  const handleClockOut = async () => {
    if (!activeSession) return;

    setActionLoading(true);
    const startTimeStamp = new Date(activeSession.start_time).getTime();
    const now = new Date();
    const durationHours = (now.getTime() - startTimeStamp) / (1000 * 60 * 60);

    const { error } = await supabase
      .from('attendance_logs')
      .update({
        end_time: now.toISOString(),
        duration_hours: durationHours,
      })
      .eq('id', activeSession.id);

    if (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo registrar la salida.');
    } else {
      Alert.alert('Éxito', 'Salida registrada correctamente.');
      setActiveSession(null);
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>StaffSync</Text>
          <Text style={styles.subtitle}>Registro de Asistencia</Text>
        </View>

        <Text style={styles.label}>Selecciona tu Nombre</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedEmployeeId}
            onValueChange={(itemValue) => setSelectedEmployeeId(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="-- Seleccionar --" value="" color="#888" />
            {employees.map((emp) => (
              <Picker.Item key={emp.id} label={emp.full_name} value={emp.id} />
            ))}
          </Picker>
        </View>

        {selectedEmployeeId ? (
          <View style={styles.actionContainer}>
            {actionLoading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : activeSession ? (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>
                  Este trabajador ya inició su jornada. ¿Quieres registrar una salida?
                </Text>
                <Text style={styles.sessionInfo}>
                  Entrada: {new Date(activeSession.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <TouchableOpacity style={styles.buttonLogout} onPress={handleClockOut}>
                  <Text style={styles.buttonText}>Registrar Salida</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.buttonLogin} onPress={handleClockIn}>
                <Text style={styles.buttonText}>Registrar Entrada</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.actionContainer}>
            <Text style={styles.helperText}>Por favor selecciona tu nombre para continuar.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC', // Minimalist cool grey
    justifyContent: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  headerContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pickerContainer: {
    backgroundColor: '#F1F3F5',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  picker: {
    height: 55,
    width: '100%',
    color: '#1A1A1A',
  },
  actionContainer: {
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  buttonLogin: {
    backgroundColor: '#4CAF50', // Elegant Green
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonLogout: {
    backgroundColor: '#EF4444', // Elegant Red
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  warningContainer: {
    alignItems: 'center',
    width: '100%',
  },
  warningText: {
    fontSize: 15,
    color: '#D97706',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  sessionInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  helperText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
