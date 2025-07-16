/**
 * Patrimoine Culturel Page Component
 */

import React from 'react';
import { AccountBalance } from '@mui/icons-material';
import EntityCrudPage, { EntityConfig, EntityField } from '../../components/Common/EntityCrudPage';
import BatchOperations from '../../components/Common/BatchOperations';
import { patrimoinesApi, PatrimoineCulturel } from '../../services/api';

const patrimoinesConfig: EntityConfig = {
  name: 'Patrimoine Culturel',
  pluralName: 'Patrimoines Culturels',
  icon: <AccountBalance color="warning" />,
  color: 'warning',
  displayField: 'nomPatrimoine',
  searchFields: ['nomPatrimoine', 'descriptionPatrimoine'],
  fields: [
    {
      name: 'nomPatrimoine',
      label: 'Nom du Patrimoine',
      type: 'text',
      required: true,
      validation: (value) => {
        if (value.length < 2) return 'Le nom doit contenir au moins 2 caractères';
        return null;
      },
    },
    {
      name: 'descriptionPatrimoine',
      label: 'Description du Patrimoine',
      type: 'textarea',
      required: false,
    },
  ] as EntityField[],
};

const PatrimoinesPage: React.FC = () => {
  return (
    <EntityCrudPage<PatrimoineCulturel>
      config={patrimoinesConfig}
      service={patrimoinesApi}
    >
      <BatchOperations
        entityType="PatrimoineCulturel"
        service={patrimoinesApi}
        fields={patrimoinesConfig.fields}
      />
    </EntityCrudPage>
  );
};

export default PatrimoinesPage;