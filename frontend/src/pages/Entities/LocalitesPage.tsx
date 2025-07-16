/**
 * Localités Page Component
 */

import React from 'react';
import { LocationOn } from '@mui/icons-material';
import EntityCrudPage, { EntityConfig, EntityField } from '../../components/Common/EntityCrudPage';
import { localitesApi, Localite } from '../../services/api';

const localitesConfig: EntityConfig = {
  name: 'Localité',
  pluralName: 'Localités',
  icon: <LocationOn color="info" />,
  color: 'info',
  displayField: 'nomLocalite',
  searchFields: ['nomLocalite'],
  fields: [
    {
      name: 'nomLocalite',
      label: 'Nom de la Localité',
      type: 'text',
      required: true,
    },
    {
      name: 'latitude',
      label: 'Latitude',
      type: 'number',
      required: true,
      validation: (value) => {
        const lat = parseFloat(value);
        if (lat < -90 || lat > 90) return 'La latitude doit être entre -90 et 90';
        return null;
      },
    },
    {
      name: 'longitude',
      label: 'Longitude',
      type: 'number',
      required: true,
      validation: (value) => {
        const lng = parseFloat(value);
        if (lng < -180 || lng > 180) return 'La longitude doit être entre -180 et 180';
        return null;
      },
    },
  ] as EntityField[],
};

const LocalitesPage: React.FC = () => {
  return (
    <EntityCrudPage<Localite>
      config={localitesConfig}
      service={localitesApi}
    />
  );
};

export default LocalitesPage;