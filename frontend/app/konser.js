import React from 'react';
import CategoryList from '../src/screens/CategoryList';

const Konser = () => (
  <CategoryList
    category="Konser"
    typeOptions={[
      'Arabesk',
      'Elektronik',
      'Halk Müziği',
      'Jazz',
      'Klasik',
      'Pop',
      'Rap',
      'Rock',
      'Sanat Müziği'
    ]}
  />
);
export default Konser;