import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator, 
  Alert, 
  StatusBar,
  Dimensions,
  Platform,
  ScrollView,
  Modal,
  FlatList
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from './supabase';
import { 
  Clock, 
  User, 
  LogIn, 
  LogOut, 
  AlertCircle, 
  ChevronDown, 
  Search,
  CheckCircle2
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  // Digital Clock and Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update elapsed time if session exists
  useEffect(() => {
    let interval;
    if (activeSession) {
      interval = setInterval(() => {
        const start = new Date(activeSession.start_time).getTime();
        const now = new Date().getTime();
        const diff = Math.max(0, now - start);
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);
    } else {
      setElapsedTime('00:00:00');
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      checkActiveSession(selectedEmployee.id);
    } else {
      setActiveSession(null);
    }
  }, [selectedEmployee]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name')
        .order('full_name');
      
      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar los empleados.');
    } finally {
      setLoading(false);
    }
  };

  const checkActiveSession = async (employeeId) => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('id, start_time')
        .eq('employee_id', employeeId)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setActiveSession(data[0]);
      } else {
        setActiveSession(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!selectedEmployee) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('attendance_logs')
        .insert({ employee_id: selectedEmployee.id });

      if (error) throw error;
      Alert.alert('Éxito', 'Entrada registrada correctamente.');
      checkActiveSession(selectedEmployee.id);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo registrar la entrada.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeSession) return;

    setActionLoading(true);
    try {
      const startTimeStamp = new Date(activeSession.start_time).getTime();
      const now = new Date();
      const durationHours = (now.getTime() - startTimeStamp) / (1000 * 60 * 60);

      const { error } = await supabase
        .from('attendance_logs')
        .update({
          end_time: now.toISOString(),
          duration_hours: parseFloat(durationHours.toFixed(2)),
        })
        .eq('id', activeSession.id);

      if (error) throw error;
      Alert.alert('Éxito', 'Salida registrada correctamente.');
      setActiveSession(null);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo registrar la salida.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDateTime = (date) => {
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    return date.toLocaleDateString('es-ES', options);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Iniciando sistema...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Clock size={24} color="#6366f1" strokeWidth={2.5} />
            <Text style={styles.brandTitle}>StaffSync</Text>
          </View>
          <View style={styles.clockContainer}>
            <Text style={styles.liveTime}>
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Text>
            <Text style={styles.liveDate}>{formatDateTime(currentTime)}</Text>
          </View>
        </View>

        {/* Main Card */}
        <View style={styles.card}>
          <Text style={styles.cardPrompt}>Identificación de Personal</Text>
          
          <View style={styles.inputSection}>
            <View style={styles.labelRow}>
              <User size={16} color="#64748b" />
              <Text style={styles.inputLabel}>Selecciona tu nombre</Text>
            </View>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedEmployee?.id || ''}
                onValueChange={(itemValue) => {
                  const emp = employees.find(e => e.id === itemValue);
                  setSelectedEmployee(emp || null);
                }}
                style={styles.picker}
              >
                <Picker.Item label="Selecciona un trabajador..." value="" color="#94a3b8" />
                {employees.map((emp) => (
                  <Picker.Item key={emp.id} label={emp.full_name} value={emp.id} color="#0f172a" />
                ))}
              </Picker>
              <View style={styles.pickerChevron}>
                <ChevronDown size={20} color="#64748b" />
              </View>
            </View>
          </View>

          {/* Action Area */}
          <View style={styles.actionArea}>
            {!selectedEmployee ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <Search size={32} color="#94a3b8" />
                </View>
                <Text style={styles.emptyText}>Por favor selecciona tu nombre para iniciar el registro</Text>
              </View>
            ) : actionLoading ? (
              <ActivityIndicator size="large" color="#6366f1" style={{ marginVertical: 30 }} />
            ) : activeSession ? (
              <View style={styles.sessionCard}>
                <View style={styles.warningStrip}>
                  <AlertCircle size={18} color="#f59e0b" />
                  <Text style={styles.warningTitle}>Jornada en curso</Text>
                </View>
                
                <View style={styles.timerDisplay}>
                  <Text style={styles.timerLabel}>Tiempo transcurrido</Text>
                  <Text style={styles.timerValue}>{elapsedTime}</Text>
                  <Text style={styles.startTime}>
                    Inicio: {new Date(activeSession.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                <TouchableOpacity 
                  style={[styles.button, styles.logoutButton]} 
                  onPress={handleClockOut}
                  activeOpacity={0.85}
                >
                  <LogOut size={20} color="#fff" strokeWidth={2.5} />
                  <Text style={styles.buttonText}>Registrar Salida</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.availableState}>
                <View style={styles.successBadge}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <Text style={styles.successText}>Listo para iniciar</Text>
                </View>
                
                <TouchableOpacity 
                  style={[styles.button, styles.loginButton]} 
                  onPress={handleClockIn}
                  activeOpacity={0.85}
                >
                  <LogIn size={20} color="#fff" strokeWidth={2.5} />
                  <Text style={styles.buttonText}>Registrar Entrada</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Qovant Systems • StaffSync Terminal v2.1</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 24,
    minHeight: '100%',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4f46e5',
    marginLeft: 10,
    letterSpacing: -0.5,
  },
  clockContainer: {
    alignItems: 'center',
  },
  liveTime: {
    fontSize: 52,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -2,
    lineHeight: 60,
  },
  liveDate: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 32,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.08,
    shadowRadius: 40,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardPrompt: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputSection: {
    marginBottom: 32,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 8,
  },
  pickerWrapper: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    position: 'relative',
  },
  picker: {
    height: 60,
    width: '100%',
    color: '#0f172a',
    paddingHorizontal: 16,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        fontSize: 16,
      }
    })
  },
  pickerChevron: {
    position: 'absolute',
    right: 16,
    top: 20,
    pointerEvents: 'none',
  },
  actionArea: {
    minHeight: 200,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: '80%',
  },
  availableState: {
    alignItems: 'center',
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 24,
  },
  successText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 6,
  },
  sessionCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  warningStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b45309',
    marginLeft: 8,
  },
  timerDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timerLabel: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 40,
    fontWeight: '800',
    color: '#78350f',
    letterSpacing: 2,
  },
  startTime: {
    fontSize: 13,
    color: '#b45309',
    marginTop: 4,
    opacity: 0.7,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    borderRadius: 20,
    width: '100%',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 4,
  },
  loginButton: {
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
  },
  logoutButton: {
    backgroundColor: '#f43f5e',
    shadowColor: '#f43f5e',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 12,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    letterSpacing: 0.5,
  }
});
