/**
 * Artisans Page Component
 */

import React from 'react';
import { Person } from '@mui/icons-material';
import EntityCrudPage, { EntityConfig, EntityField } from '../../components/Common/EntityCrudPage';
import BatchOperations from '../../components/Common/BatchOperations';
import { artisansApi, Artisan } from '../../services/api';

const artisansConfig: EntityConfig = {
  name: 'Artisan',
  pluralName: 'Artisans',
  icon: <Person color="primary" />,
  color: 'primary',
  displayField: 'nomArtisan',
  searchFields: ['nomArtisan'],
  fields: [
    {
      name: 'nomArtisan',
      label: 'Nom de l\'Artisan',
      type: 'text',
      required: true,
      validation: (value) => {
        if (value.length < 2) return 'Le nom doit contenir au moins 2 caractères';
        return null;
      },
    },
    {
      name: 'anneesExperience',
      label: 'Années d\'Expérience',
      type: 'number',
      required: false,
      validation: (value) => {
        if (value && (value < 0 || value > 80)) {
          return 'L\'expérience doit être entre 0 et 80 ans';
        }
        return null;
      },
    },
  ] as EntityField[],
};

const ArtisansPage: React.FC = () => {
  const handleViewRelations = (artisan: Artisan) => {
    console.log('View relations for artisan:', artisan);
  };

  return (
    <EntityCrudPage<Artisan>
      config={artisansConfig}
      service={artisansApi}
      onViewRelations={handleViewRelations}
    >
      {/* Batch Operations Component */}
      <BatchOperations
        entityType="Artisan"
        service={artisansApi}
        fields={artisansConfig.fields}
        onComplete={(result) => {
          console.log('Batch operation completed:', result);
          // Refresh the entity list
          window.location.reload();
        }}
      />
    </EntityCrudPage>
  );
};

export default ArtisansPage;