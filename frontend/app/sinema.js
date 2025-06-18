import React from 'react';
import CategoryList from '../src/screens/CategoryList';

const Sinema = () => (
  <CategoryList
    category="Sinema"
    typeOptions={[
      'Açık Hava',
      'Bağımsız Film',
      'Festival Gösterimi',
      'Gala Gösterimi',
      'Kısa Film Gecesi'
    ]}
    emptyMessage="Uygun sinema etkinliği bulunamadı."
  />
);

export default Sinema;