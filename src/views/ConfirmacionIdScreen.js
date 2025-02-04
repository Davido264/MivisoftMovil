import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import tw from 'twrnc';

const ConfirmacionIdScreen = ({ route, navigation }) => {
  const { id, horaInicio } = route.params || {}; // Obtenemos tanto el ID como la hora de inicio

  return (
    <View style={tw`flex-1 justify-center items-center bg-white p-5`}>
      {/* Logo */}
      <Image
        source={require('../../assets/mivilsoft.jpeg')}
        style={tw`w-30 h-30 mb-5`}
      />
      <Text style={tw`text-2xl font-bold text-blue-900 mb-8`}>MIVILSOFT</Text>

      {/* Caja de Confirmación */}
      <View style={tw`w-4/5 p-6 rounded-lg border border-gray-300 items-center bg-white`}>
        <Image
          source={require('../../assets/check.png')}
          style={tw`w-12 h-12 mb-5`}
        />
        <Text style={tw`text-lg font-bold text-gray-600 text-center mb-3`}>
          Registro guardado exitosamente
        </Text>
        <Text style={tw`text-base text-gray-700 mb-5`}>
          ID: {id || 'ID no disponible'}
        </Text>
        <Text style={tw`text-base text-gray-700 mb-5`}>
          Hora de Inicio: {horaInicio || 'Hora no disponible'}
        </Text>

        {/* Botón para regresar al menú principal */}
        <TouchableOpacity
          style={tw`bg-[#00a8e8] py-3 px-6 rounded-full`}
          onPress={() => navigation.navigate('Dashboard', { horaInicio })} // Pasamos la hora de inicio al DashboardScreen
        >
          <Text style={tw`text-white text-base font-bold`}>Regresar al menú </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ConfirmacionIdScreen;
