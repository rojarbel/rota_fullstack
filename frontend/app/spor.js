import React from 'react';
import CategoryList from '../src/screens/CategoryList';

const Spor = () => (
  <CategoryList
    category="Spor"
    typeOptions={[
      'Bisiklet',
      'Ekstrem Sporlar',
      'E-Spor',
      'İzleyici Etkinliği',
      'Kamp',
      'Su Sporları',
      'Trekking',
      'Yoga / Meditasyon'
    ]}
    emptyMessage="Uygun spor etkinliği bulunamadı."
  />
);

export default Spor;