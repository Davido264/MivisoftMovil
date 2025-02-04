import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import WarningIcon from '../icons/warningIcon'; // Importar el nuevo icono de advertencia

const ErrorCamara = ({ navigation }) => {
  return (
    <View style={tw`flex-1 justify-center items-center bg-white p-5`}>
      {/* Logo */}
      <Image
        source={require('../../assets/mivilsoft.jpeg')}
        style={tw`w-40 h-40 mb-5`}
      />

      {/* Título */}
      <Text style={tw`text-2xl font-bold text-blue-900 mb-5`}>MIVILSOFT</Text>

      {/* Caja de Error */}
      <View style={tw`w-4/5 p-5 border border-gray-300 rounded-lg bg-white mb-5`}>
        <View style={tw`flex-row items-center mb-3`}>
          {/* Icono de advertencia */}
          <WarningIcon width={24} height={24} fill="#000" style={tw`mr-2`} />
          <Text style={tw`text-lg font-bold text-gray-700`}>Error en la cámara</Text>
        </View>
        <Text style={tw`text-sm text-gray-600`}>No se puede establecer conexión con la cámara</Text>
      </View>

      {/* Botón para regresar */}
      <TouchableOpacity
        style={tw`bg-[#00a8e8] py-3 px-10 rounded-full`}
        onPress={() => navigation.navigate('FinTrabajoScreen')}
      >
        <Text style={tw`text-white text-base font-bold`}>Regresar al formulario</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ErrorCamara;
