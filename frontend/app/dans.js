import React from 'react';
import CategoryList from '../src/screens/CategoryList';

const Dans = () => (
  <CategoryList
    category="Dans"
    typeOptions={[
      'Breakdance',
      'Halk Dansları',
      'Modern Dans',
      'Salsa / Bachata',
      'Swing',
      'Tango'
    ]}
    emptyMessage="Uygun dans etkinliği bulunamadı."
  />
);

export default Dans;