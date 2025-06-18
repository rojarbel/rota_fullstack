import React from 'react';
import CategoryList from '../src/screens/CategoryList';

const Sergi = () => (
  <CategoryList
    category="Sergi"
    typeOptions={[
      'Fotoğraf Sergisi',
      'İllüstrasyon & Grafik',
      'Heykel',
      'Karma Sergi',
      'Modern Sanat'
    ]}
    emptyMessage="Uygun sergi etkinliği bulunamadı."
  />
);

export default Sergi;