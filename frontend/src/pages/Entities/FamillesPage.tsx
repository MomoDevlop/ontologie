/**
 * Familles Page Component
 * 
 * This page manages instrument families using the generic EntityCrudPage component.
 * Users can create families with nomFamille and descriptionFamille fields.
 * No predefined sub-classes, families are created freely.
 */

import React from 'react';
import { Category } from '@mui/icons-material';
import EntityCrudPage, { EntityConfig, EntityField } from '../../components/Common/EntityCrudPage';
import { famillesApi, Famille } from '../../services/api';

// Entity configuration for Familles
const famillesConfig: EntityConfig = {
  name: 'Famille d\'Instrument',
  pluralName: 'Familles d\'Instruments',
  icon: <Category color="secondary" />,
  color: 'secondary',
  displayField: 'nomFamille',
  searchFields: ['nomFamille', 'descriptionFamille'],
  fields: [
    {
      name: 'nomFamille',
      label: 'Nom de la Famille',
      type: 'text',
      required: true,
      validation: (value) => {
        if (!value || value.trim().length < 2) {
          return 'Le nom de la famille doit contenir au moins 2 caractères';
        }
        if (value.length > 50) {
          return 'Le nom de la famille ne peut pas dépasser 50 caractères';
        }
        return null;
      },
    },
    {
      name: 'descriptionFamille',
      label: 'Description',
      type: 'textarea',
      required: false,
      validation: (value) => {
        if (value && value.length > 200) {
          return 'La description ne peut pas dépasser 200 caractères';
        }
        return null;
      },
    },
  ] as EntityField[],
};

/**
 * Familles management page
 */
const FamillesPage: React.FC = () => {
  const handleViewRelations = (famille: Famille) => {
    console.log('View relations for famille:', famille);
    // Navigate to relationship view or open relationship dialog
  };

  return (
    <EntityCrudPage<Famille>
      config={famillesConfig}
      service={famillesApi}
      onViewRelations={handleViewRelations}
    />
  );
};

export default FamillesPage;