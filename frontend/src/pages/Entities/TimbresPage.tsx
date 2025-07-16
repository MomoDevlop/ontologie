/**
 * Timbres Page Component
 */

import React from 'react';
import { Palette } from '@mui/icons-material';
import EntityCrudPage, { EntityConfig, EntityField } from '../../components/Common/EntityCrudPage';
import BatchOperations from '../../components/Common/BatchOperations';
import { timbresApi, Timbre } from '../../services/api';

const timbresConfig: EntityConfig = {
  name: 'Timbre',
  pluralName: 'Timbres',
  icon: <Palette color="secondary" />,
  color: 'secondary',
  displayField: 'descriptionTimbre',
  searchFields: ['descriptionTimbre'],
  fields: [
    {
      name: 'descriptionTimbre',
      label: 'Description du Timbre',
      type: 'textarea',
      required: true,
      validation: (value) => {
        if (value.length < 5) return 'La description doit contenir au moins 5 caractères';
        return null;
      },
    },
  ] as EntityField[],
};

const TimbresPage: React.FC = () => {
  return (
    <EntityCrudPage<Timbre>
      config={timbresConfig}
      service={timbresApi}
    >
      <BatchOperations
        entityType="Timbre"
        service={timbresApi}
        fields={timbresConfig.fields}
      />
    </EntityCrudPage>
  );
};

export default TimbresPage;