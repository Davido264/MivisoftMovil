import React, { useEffect, useState } from "react";
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './src/views/LoginScreen';
import DashboardScreen from './src/views/DashboardScreen';
import IniciarTrabajo from './src/views/IniciarTrabajo';
import ControlSoporteScreen from "./src/views/ControlSoporteScreen";
import FinTrabajoScreen from './src/views/FinTrabajoScreen';
import ConfirmacionScreen from './src/views/ConfirmacionScreen';
import ConfirmacionIdScreen from './src/views/ConfirmacionIdScreen';
import UsuarioAdvertencia from "./src/views/UsuarioAdvertencia";
import LoadingScreen from "./src/views/LoadingScreen";
import FallaInternet from "./src/views/FallaInternet";
import GaleriaAdvertencia from "./src/views/GaleriaAdvertencia";
import ReporteAdvertencia from "./src/views/ReporteAdvertencia";
import ErrorCamara from "./src/views/ErrorCamara";


const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{headerShown: false}}/>
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{headerShown: false}}/>
        <Stack.Screen name="IniciarTrabajo" component={IniciarTrabajo} options={{headerShown: false}}/>
        <Stack.Screen name="ControlSoporteScreen" component={ControlSoporteScreen} options={{headerShown: false}}/>
        <Stack.Screen name="FinTrabajoScreen" component={FinTrabajoScreen} options={{headerShown: false}}/>
        <Stack.Screen name="ConfirmacionScreen" component={ConfirmacionScreen} options={{headerShown: false}}/>
        <Stack.Screen name="ConfirmacionIdScreen" component={ConfirmacionIdScreen} options={{headerShown: false}}/>
        <Stack.Screen name="UsuarioAdvertencia" component={UsuarioAdvertencia} options={{headerShown: false}}/>
        <Stack.Screen name="LoadingScreen" component={LoadingScreen} options={{headerShown: false}}/>
        <Stack.Screen name="FallaInternet" component={FallaInternet} options={{headerShown: false}}/>
        <Stack.Screen name="GaleriaAdvertencia" component={GaleriaAdvertencia} options={{headerShown: false}}/>
        <Stack.Screen name="ReporteAdvertencia" component={ReporteAdvertencia} options={{headerShown: false}}/>
        <Stack.Screen name="ErrorCamara" component={ErrorCamara} options={{headerShown: false}}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
