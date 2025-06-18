import React from 'react';
import CategoryList from '../src/screens/CategoryList';

const Tiyatro = () => (
  <CategoryList
    category="Tiyatro"
    typeOptions={[
      'Dram',
      'Komedi',
      'Çocuk Oyunu',
      'Müzikal',
      'Tiyatro Gösterisi'
    ]}
    emptyMessage="Uygun tiyatro etkinliği bulunamadı."
  />
);

export default Tiyatro;