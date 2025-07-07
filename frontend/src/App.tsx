/**
 * Main Application Component
 * 
 * This is the root component that sets up the application structure including:
 * - Theme provider for Material-UI styling
 * - Router configuration for navigation
 * - Global error boundary
 * - Main layout structure
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme/theme';
import AppLayout from './components/Layout/AppLayout';

// Import page components
import Dashboard from './pages/Dashboard/Dashboard';
import SearchPage from './pages/Search/SearchPage';
import InstrumentsPage from './pages/Instruments/InstrumentsPage';

// Placeholder components for other pages
import { Box, Typography, Paper, Alert } from '@mui/material';

// Generic placeholder component for unimplemented pages
const PlaceholderPage: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <Box>
    <Typography variant="h4" component="h1" gutterBottom>
      {title}
    </Typography>
    <Typography variant="body1" color="text.secondary" paragraph>
      {description}
    </Typography>
    <Alert severity="info">
      Cette page est en cours de développement. Les fonctionnalités principales sont disponibles dans les pages Instruments, Recherche et Dashboard.
    </Alert>
  </Box>
);

/**
 * Main application component
 */
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppLayout>
          <Routes>
            {/* Main Dashboard */}
            <Route 
              path="/" 
              element={<Dashboard />} 
            />
            
            {/* Search Page */}
            <Route 
              path="/search" 
              element={<SearchPage />} 
            />
            
            {/* Instruments Management */}
            <Route 
              path="/instruments" 
              element={<InstrumentsPage />} 
            />
            
            {/* Placeholder pages for other entities */}
            <Route 
              path="/familles" 
              element={
                <PlaceholderPage 
                  title="Familles d'Instruments"
                  description="Gérez les familles d'instruments : Cordes, Vents, Percussions, Électrophones"
                />
              } 
            />
            
            <Route 
              path="/groupes-ethniques" 
              element={
                <PlaceholderPage 
                  title="Groupes Ethniques"
                  description="Explorez les groupes ethniques et leurs traditions musicales"
                />
              } 
            />
            
            <Route 
              path="/localites" 
              element={
                <PlaceholderPage 
                  title="Localités Géographiques"
                  description="Cartographie des origines géographiques des instruments"
                />
              } 
            />
            
            <Route 
              path="/materiaux" 
              element={
                <PlaceholderPage 
                  title="Matériaux de Construction"
                  description="Base de données des matériaux utilisés dans la fabrication d'instruments"
                />
              } 
            />
            
            <Route 
              path="/timbres" 
              element={
                <PlaceholderPage 
                  title="Timbres Sonores"
                  description="Classification des caractéristiques sonores des instruments"
                />
              } 
            />
            
            <Route 
              path="/artisans" 
              element={
                <PlaceholderPage 
                  title="Artisans Fabricants"
                  description="Répertoire des artisans et luthiers spécialisés"
                />
              } 
            />
            
            <Route 
              path="/patrimoines" 
              element={
                <PlaceholderPage 
                  title="Patrimoine Culturel"
                  description="Préservation et documentation du patrimoine musical mondial"
                />
              } 
            />
            
            <Route 
              path="/relations" 
              element={
                <PlaceholderPage 
                  title="Relations Sémantiques"
                  description="Visualisation et gestion des relations entre entités de l'ontologie"
                />
              } 
            />
            
            {/* 404 Not Found */}
            <Route 
              path="*" 
              element={
                <Box sx={{ textAlign: 'center', mt: 8 }}>
                  <Typography variant="h2" component="h1" gutterBottom>
                    404
                  </Typography>
                  <Typography variant="h5" component="h2" gutterBottom>
                    Page non trouvée
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    La page que vous recherchez n'existe pas.
                  </Typography>
                </Box>
              } 
            />
          </Routes>
        </AppLayout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
