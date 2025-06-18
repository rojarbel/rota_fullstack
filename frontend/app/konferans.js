import React from 'react';
import CategoryList from '../src/screens/CategoryList';

const Konferans = () => (
  <CategoryList
    category="Konferans"
    typeOptions={[
      'Akademik Konferans',
      'Çevre ve Sürdürülebilirlik',
      'Girişimcilik & İnovasyon',
      'Kent ve Mekân',
      'Kültürel Çalışmalar',
      'Psikoloji',
      'Toplumsal Cinsiyet ve Eşitlik'
    ]}
    emptyMessage="Uygun konferans etkinliği bulunamadı."
  />
);

export default Konferans;