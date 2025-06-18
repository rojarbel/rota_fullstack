import React from 'react';
import CategoryList from '../src/screens/CategoryList';

const Aktivizm = () => (
  <CategoryList
    category="Aktivizm"
    typeOptions={[
      'Hayvan Hakları',
      'İklim ve Ekoloji',
      'İşçi Hakları',
      'Kadın Hakları',
      'LGBTİ+ Etkinlikleri',
      'Mülteci Hakları'
    ]}
  />
);

export default Aktivizm;