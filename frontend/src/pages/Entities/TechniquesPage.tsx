/**
 * Techniques de Jeu Page Component
 */

import React from 'react';
import { TouchApp } from '@mui/icons-material';
import EntityCrudPage, { EntityConfig, EntityField } from '../../components/Common/EntityCrudPage';
import BatchOperations from '../../components/Common/BatchOperations';
import { techniquesApi, TechniqueDeJeu } from '../../services/api';

const techniquesConfig: EntityConfig = {
  name: 'Technique de Jeu',
  pluralName: 'Techniques de Jeu',
  icon: <TouchApp color="info" />,
  color: 'info',
  displayField: 'nomTechnique',
  searchFields: ['nomTechnique', 'descriptionTechnique'],
  fields: [
    {
      name: 'nomTechnique',
      label: 'Nom de la Technique',
      type: 'text',
      required: true,
      validation: (value) => {
        if (value.length < 2) return 'Le nom doit contenir au moins 2 caractères';
        return null;
      },
    },
    {
      name: 'descriptionTechnique',
      label: 'Description de la Technique',
      type: 'textarea',
      required: false,
    },
  ] as EntityField[],
};

const TechniquesPage: React.FC = () => {
  return (
    <EntityCrudPage<TechniqueDeJeu>
      config={techniquesConfig}
      service={techniquesApi}
    >
      <BatchOperations
        entityType="TechniqueDeJeu"
        service={techniquesApi}
        fields={techniquesConfig.fields}
      />
    </EntityCrudPage>
  );
};

export default TechniquesPage;