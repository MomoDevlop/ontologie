/**
 * Groupes Ethniques Page Component
 */

import React from 'react';
import { Language } from '@mui/icons-material';
import EntityCrudPage, { EntityConfig, EntityField } from '../../components/Common/EntityCrudPage';
import { groupesEthniquesApi, GroupeEthnique } from '../../services/api';

const groupesEthniquesConfig: EntityConfig = {
  name: 'Groupe Ethnique',
  pluralName: 'Groupes Ethniques',
  icon: <Language color="success" />,
  color: 'success',
  displayField: 'nomGroupe',
  searchFields: ['nomGroupe', 'langue'],
  fields: [
    {
      name: 'nomGroupe',
      label: 'Nom du Groupe',
      type: 'text',
      required: true,
      validation: (value) => {
        if (value.length < 2) return 'Le nom doit contenir au moins 2 caractères';
        return null;
      },
    },
    {
      name: 'langue',
      label: 'Langue Principale',
      type: 'text',
      required: false,
    },
  ] as EntityField[],
};

const GroupesEthniquesPage: React.FC = () => {
  return (
    <EntityCrudPage<GroupeEthnique>
      config={groupesEthniquesConfig}
      service={groupesEthniquesApi}
    />
  );
};

export default GroupesEthniquesPage;