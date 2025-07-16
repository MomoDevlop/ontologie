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

// Import entity pages
import FamillesPage from './pages/Entities/FamillesPage';
import GroupesEthniquesPage from './pages/Entities/GroupesEthniquesPage';
import LocalitesPage from './pages/Entities/LocalitesPage';
import MateriauxPage from './pages/Entities/MateriauxPage';
import TimbresPage from './pages/Entities/TimbresPage';
import TechniquesPage from './pages/Entities/TechniquesPage';
import ArtisansPage from './pages/Entities/ArtisansPage';
import PatrimoinesPage from './pages/Entities/PatrimoinesPage';

// Import relations and analytics pages
import RelationsPage from './pages/Relations/RelationsPage';
import AnalyticsDashboard from './pages/Analytics/AnalyticsDashboard';

// Utility components
import { Box, Typography, Alert } from '@mui/material';

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
            
            {/* Entity Management Pages */}
            <Route 
              path="/familles" 
              element={<FamillesPage />} 
            />
            
            <Route 
              path="/groupes-ethniques" 
              element={<GroupesEthniquesPage />} 
            />
            
            <Route 
              path="/localites" 
              element={<LocalitesPage />} 
            />
            
            <Route 
              path="/materiaux" 
              element={<MateriauxPage />} 
            />
            
            <Route 
              path="/timbres" 
              element={<TimbresPage />} 
            />
            
            <Route 
              path="/techniques" 
              element={<TechniquesPage />} 
            />
            
            <Route 
              path="/artisans" 
              element={<ArtisansPage />} 
            />
            
            <Route 
              path="/patrimoines" 
              element={<PatrimoinesPage />} 
            />
            
            {/* Relations and Analytics */}
            <Route 
              path="/relations" 
              element={<RelationsPage />} 
            />
            
            <Route 
              path="/analytics" 
              element={<AnalyticsDashboard />} 
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
