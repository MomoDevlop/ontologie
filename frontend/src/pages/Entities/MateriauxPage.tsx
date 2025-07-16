/**
 * Matériaux Page Component
 */

import React from 'react';
import { Build } from '@mui/icons-material';
import EntityCrudPage, { EntityConfig, EntityField } from '../../components/Common/EntityCrudPage';
import { materiauxApi, Materiau } from '../../services/api';

const materiauxConfig: EntityConfig = {
  name: 'Matériau',
  pluralName: 'Matériaux',
  icon: <Build color="warning" />,
  color: 'warning',
  displayField: 'nomMateriau',
  searchFields: ['nomMateriau', 'typeMateriau'],
  fields: [
    {
      name: 'nomMateriau',
      label: 'Nom du Matériau',
      type: 'text',
      required: true,
    },
    {
      name: 'typeMateriau',
      label: 'Type de Matériau',
      type: 'select',
      required: false,
      options: [
        { value: 'Bois', label: 'Bois' },
        { value: 'Métal', label: 'Métal' },
        { value: 'Peau', label: 'Peau' },
        { value: 'Textile', label: 'Textile' },
        { value: 'Plastique', label: 'Plastique' },
        { value: 'Composite', label: 'Composite' },
        { value: 'Naturel', label: 'Naturel' },
        { value: 'Synthétique', label: 'Synthétique' },
      ],
    },
  ] as EntityField[],
};

const MateriauxPage: React.FC = () => {
  return (
    <EntityCrudPage<Materiau>
      config={materiauxConfig}
      service={materiauxApi}
    />
  );
};

export default MateriauxPage;