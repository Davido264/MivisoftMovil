import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import tw from 'twrnc';
import UserIcon from '../icons/userIcon';

const DashboardScreen = ({ route, navigation }) => {
  const [horaSesion, setHoraSesion] = useState('00:00:00'); // Inicializamos con "00:00:00"

  useEffect(() => {
    // Si viene la hora de IniciarTrabajo, la actualizamos
    if (route.params?.horaInicio) {
      setHoraSesion(route.params.horaInicio);
    }
  }, [route.params?.horaInicio]);

  return (
    <View style={tw`flex-1 bg-white p-5`}>
      <View style={tw`flex-row items-center mb-5`}>
        <Image
          source={require('../../assets/mivilsoft.jpeg')}
          style={tw`w-25 h-25 mr-3`}
          resizeMode="contain"
        />
        <View style={tw`flex-row items-center flex-1`}>
          <UserIcon width={40} height={40} color="#4CAF50" style={tw`mr-3`} />
          <View>
            <Text style={tw`text-lg font-bold text-blue-800`}>USERNAME</Text>
            <Text style={tw`text-sm text-blue-800`}>
              INICIO DE SESIÓN: {horaSesion}
            </Text>
          </View>
        </View>
      </View>

      {/* Botones de navegación */}
      <View style={tw`flex-1 justify-center pl-2 pr-2`}>
        <TouchableOpacity 
          style={tw`bg-[#00a8e8] py-4 rounded-t-lg mb-4 w-full self-center`} 
          onPress={() => navigation.navigate('IniciarTrabajo')}
        >
          <Text style={tw`text-white text-center text-lg font-bold`}>Iniciar trabajo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={tw`bg-[#00a8e8] py-4 mb-4 w-full self-center`} 
          onPress={() => navigation.navigate('ControlSoporteScreen')}
        >
          <Text style={tw`text-white text-center text-lg font-bold`}>Registro técnico</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={tw`bg-[#00a8e8] py-4 mb-4 w-full self-center`} 
          onPress={() => navigation.navigate('FinTrabajoScreen')}
        >
          <Text style={tw`text-white text-center text-lg font-bold`}>Terminar trabajo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={tw`bg-[#00a8e8] py-4 mb-4 w-full rounded-b-lg self-center`} 
          onPress={() => navigation.navigate('VerReporte')}
        >
          <Text style={tw`text-white text-center text-lg font-bold`}>Ver reporte</Text>
        </TouchableOpacity>
      </View>
      
      {/* Botón de salir */}
      <TouchableOpacity 
        style={tw`bg-[#ff6b6b] py-4 rounded-full mt-5 w-36 self-center`} 
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={tw`text-white text-center text-lg font-bold`}>Salir</Text>
      </TouchableOpacity>
    </View>
  );
};

export default DashboardScreen;
