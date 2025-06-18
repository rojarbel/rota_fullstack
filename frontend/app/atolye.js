import React from 'react';
import CategoryList from '../src/screens/CategoryList';

const Atölye = () => (
  <CategoryList
    category="Atölye"
    typeOptions={[
      'Sanat Atölyesi',
      'Zanaat',
      'Müzik Atölyesi',
      'Kodlama',
      'Fotoğraf Atölyesi',
      'Hikâye Anlatımı'
    ]}
    emptyMessage="Uygun atölye etkinliği bulunamadı."
  />
);

export default Atölye;