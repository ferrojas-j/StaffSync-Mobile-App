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
  FlatList,
  TextInput
} from 'react-native';
import { supabase } from './supabase';
import { 
  Clock, 
  User, 
  LogIn, 
  LogOut, 
  AlertCircle, 
  ChevronDown, 
  Search,
  CheckCircle2,
  ChevronLeft,
  X,
  UserCheck
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// Premium Color Palette: Pale Red / Muted Rose
const COLORS = {
  primary: '#D48383',      // Pale Red
  primaryLight: '#F3E5E5', // Very Light Rose
  secondary: '#83A9D4',    // Muted Blue (complementary)
  accent: '#E1B183',       // Muted Amber
  success: '#9BB1A2',      // Muted Sage Green
  danger: '#D48383',       // Using primary for danger too since it's reddish
  text: '#4A3E3E',         // Warm Dark Brown
  textLight: '#8E8282',    // Muted Warm Gray
  background: '#FAF7F7',   // Warm Background
  white: '#FFFFFF',
  border: '#EBE0E0',
};

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  
  // New UI states
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Digital Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Timer for active session
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
      setShowConfirmation(false);
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
      setFilteredEmployees(data || []);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar los trabajadores.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    const filtered = employees.filter(emp => 
      emp.full_name.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredEmployees(filtered);
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
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('attendance_logs')
        .insert({ employee_id: selectedEmployee.id });

      if (error) throw error;
      Alert.alert('Registro Exitoso', 'Tu jornada ha comenzado.');
      setShowConfirmation(false);
      checkActiveSession(selectedEmployee.id);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Hubo un problema al registrar la entrada.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
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
      Alert.alert('Jornada Finalizada', 'Salida registrada correctamente.');
      setActiveSession(null);
      setSelectedEmployee(null); // Reset after full session
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

  const handleBack = () => {
    if (showConfirmation) {
      setShowConfirmation(false);
    } else if (selectedEmployee) {
      setSelectedEmployee(null);
      setActiveSession(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Conectando con StaffSync...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.logoBadge} activeOpacity={0.7}>
            <Clock size={20} color={COLORS.primary} strokeWidth={3} />
            <Text style={styles.brandTitle}>StaffSync Mobile</Text>
          </TouchableOpacity>
          
          <View style={styles.clockContainer}>
            <Text style={styles.liveTime}>
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Text>
            <Text style={styles.liveDate}>{formatDateTime(currentTime)}</Text>
          </View>
        </View>

        {/* Global Back Button (only if something is selected) */}
        {(selectedEmployee || showConfirmation) && (
          <TouchableOpacity style={styles.globalBackButton} onPress={handleBack}>
            <ChevronLeft size={20} color={COLORS.textLight} />
            <Text style={styles.globalBackText}>Volver</Text>
          </TouchableOpacity>
        )}

        {/* Main Card */}
        <View style={styles.card}>
          
          {/* CONFIRMATION SCREEN */}
          {showConfirmation ? (
            <View style={styles.confirmationView}>
              <View style={styles.confirmIconCircle}>
                <UserCheck size={40} color={COLORS.primary} />
              </View>
              <Text style={styles.confirmTitle}>Confirmación de Identidad</Text>
              <Text style={styles.confirmMessage}>
                "Confirmo que soy <Text style={styles.boldText}>{selectedEmployee?.full_name}</Text> y estoy iniciando mi jornada laboral"
              </Text>
              
              <View style={styles.confirmActionRow}>
                <TouchableOpacity 
                  style={[styles.smallButton, styles.secondaryButton]} 
                  onPress={() => setShowConfirmation(false)}
                >
                  <Text style={styles.secondaryButtonText}>Volver</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.smallButton, styles.primaryButton]} 
                  onPress={handleClockIn}
                  disabled={actionLoading}
                >
                  {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Confirmar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.cardPrompt}>Registro de Personal</Text>
              
              {/* Custom Elegant Picker Trigger */}
              <View style={styles.inputSection}>
                <View style={styles.labelRow}>
                  <User size={16} color={COLORS.textLight} />
                  <Text style={styles.inputLabel}>Tu Nombre</Text>
                </View>
                <TouchableOpacity 
                  style={styles.customPickerTrigger} 
                  onPress={() => setShowPicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pickerValue, !selectedEmployee && styles.pickerPlaceholder]}>
                    {selectedEmployee ? selectedEmployee.full_name : 'Selecciona tu nombre...'}
                  </Text>
                  <ChevronDown size={20} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>

              {/* Action Area */}
              <View style={styles.actionArea}>
                {!selectedEmployee ? (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIconCircle}>
                      <Search size={32} color={COLORS.border} />
                    </View>
                    <Text style={styles.emptyText}>Busca tu nombre en la lista para continuar</Text>
                  </View>
                ) : actionLoading ? (
                  <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 30 }} />
                ) : activeSession ? (
                  <View style={styles.sessionCard}>
                    <View style={styles.warningStrip}>
                      <AlertCircle size={18} color={COLORS.accent} />
                      <Text style={styles.warningTitle}>Sesión Activa</Text>
                    </View>
                    
                    <View style={styles.timerDisplay}>
                      <Text style={styles.timerLabel}>Tiempo en turno</Text>
                      <Text style={styles.timerValue}>{elapsedTime}</Text>
                      <Text style={styles.startTime}>
                        Desde las {new Date(activeSession.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>

                    <TouchableOpacity 
                      style={[styles.mainButton, { backgroundColor: COLORS.primary }]} 
                      onPress={handleClockOut}
                      activeOpacity={0.85}
                    >
                      <LogOut size={20} color="#fff" strokeWidth={2.5} />
                      <Text style={styles.buttonText}>Finalizar Jornada</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.availableState}>
                    <View style={styles.successBadge}>
                      <CheckCircle2 size={16} color={COLORS.success} />
                      <Text style={styles.successText}>Listo para entrar</Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={[styles.mainButton, { backgroundColor: COLORS.primary }]} 
                      onPress={() => setShowConfirmation(true)}
                      activeOpacity={0.85}
                    >
                      <LogIn size={20} color="#fff" strokeWidth={2.5} />
                      <Text style={styles.buttonText}>Registrar Entrada</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Qovant Systems • Terminal v2.2</Text>
        </View>
      </ScrollView>

      {/* CUSTOM ELEGANT PICKER MODAL */}
      <Modal visible={showPicker} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Trabajador</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.closeButton}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchBarWrapper}>
              <Search size={18} color={COLORS.textLight} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre..."
                value={searchQuery}
                onChangeText={handleSearch}
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            <FlatList
              data={filteredEmployees}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.employeeListItem,
                    selectedEmployee?.id === item.id && styles.employeeSelected
                  ]}
                  onPress={() => {
                    setSelectedEmployee(item);
                    setShowPicker(false);
                    setSearchQuery('');
                    setFilteredEmployees(employees);
                  }}
                >
                  <Text style={[
                    styles.employeeListText,
                    selectedEmployee?.id === item.id && styles.employeeSelectedText
                  ]}>
                    {item.full_name}
                  </Text>
                  {selectedEmployee?.id === item.id && <CheckCircle2 size={18} color={COLORS.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 24,
    minHeight: height,
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1E1E1',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    marginLeft: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  clockContainer: {
    alignItems: 'center',
  },
  liveTime: {
    fontSize: 56,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -2,
    lineHeight: 64,
  },
  liveDate: {
    fontSize: 15,
    color: COLORS.textLight,
    fontWeight: '600',
    textTransform: 'capitalize',
    marginTop: 4,
  },
  globalBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingVertical: 8,
  },
  globalBackText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '700',
    marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 32,
    padding: 32,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1EAEA',
    minHeight: 380,
  },
  cardPrompt: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: -0.5,
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
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginLeft: 8,
  },
  customPickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 64,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  pickerValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  pickerPlaceholder: {
    color: COLORS.textLight,
    fontWeight: '500',
  },
  actionArea: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '80%',
    fontWeight: '500',
  },
  availableState: {
    alignItems: 'center',
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F5F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 24,
  },
  successText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B8E78',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  sessionCard: {
    backgroundColor: '#FFF9F5',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#FAEDE6',
  },
  warningStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.accent,
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  timerDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timerLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 44,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 1,
  },
  startTime: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 6,
    fontWeight: '500',
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 68,
    borderRadius: 20,
    width: '100%',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 4,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '800',
    marginLeft: 12,
  },
  confirmationView: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  confirmIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 16,
  },
  confirmMessage: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  boldText: {
    fontWeight: '900',
    color: COLORS.primary,
  },
  confirmActionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  smallButton: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 16,
  },
  secondaryButtonText: {
    color: COLORS.textLight,
    fontWeight: '700',
    fontSize: 16,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(74, 62, 62, 0.4)', // Warm overlay
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: height * 0.75,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    height: '100%',
    ...Platform.select({
      web: { outlineStyle: 'none' }
    })
  },
  employeeListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EEEE',
  },
  employeeSelected: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    borderBottomWidth: 0,
  },
  employeeListText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
  employeeSelectedText: {
    color: COLORS.primary,
    fontWeight: '800',
  }
});
