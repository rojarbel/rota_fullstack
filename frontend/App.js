import { Slot, ExpoRouterProvider } from 'expo-router';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import linking from './linking';


export default function App() {
  return (
    <ExpoRouterProvider linking={linking}>
      <Slot />
    </ExpoRouterProvider>
  );
}
