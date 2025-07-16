/**
 * Main Application Layout Component
 * 
 * This component provides the main structure of the application including:
 * - Top navigation bar
 * - Side navigation drawer
 * - Main content area
 * - Responsive behavior
 */

import React, { useState } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  MusicNote,
  Search,
  Dashboard,
  Category,
  Language,
  LocationOn,
  Build,
  Palette,
  Person,
  AccountBalance,
  Timeline,
  Assessment,
  TouchApp,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

// Drawer width configuration
const DRAWER_WIDTH = 280;

// Navigation items configuration
const navigationItems = [
  {
    text: 'Dashboard',
    icon: <Dashboard />,
    path: '/',
    description: 'Vue d\'ensemble des données',
  },
  {
    text: 'Recherche',
    icon: <Search />,
    path: '/search',
    description: 'Recherche avancée',
  },
  {
    text: 'Instruments',
    icon: <MusicNote />,
    path: '/instruments',
    description: 'Gestion des instruments',
  },
  {
    text: 'Familles',
    icon: <Category />,
    path: '/familles',
    description: 'Familles d\'instruments',
  },
  {
    text: 'Groupes Ethniques',
    icon: <Language />,
    path: '/groupes-ethniques',
    description: 'Groupes ethniques',
  },
  {
    text: 'Localités',
    icon: <LocationOn />,
    path: '/localites',
    description: 'Localités géographiques',
  },
  {
    text: 'Matériaux',
    icon: <Build />,
    path: '/materiaux',
    description: 'Matériaux de construction',
  },
  {
    text: 'Timbres',
    icon: <Palette />,
    path: '/timbres',
    description: 'Timbres sonores',
  },
  {
    text: 'Techniques',
    icon: <TouchApp />,
    path: '/techniques',
    description: 'Techniques de jeu',
  },
  {
    text: 'Artisans',
    icon: <Person />,
    path: '/artisans',
    description: 'Artisans fabricants',
  },
  {
    text: 'Patrimoine',
    icon: <AccountBalance />,
    path: '/patrimoines',
    description: 'Patrimoine culturel',
  },
  {
    text: 'Relations',
    icon: <Timeline />,
    path: '/relations',
    description: 'Relations sémantiques',
  },
  {
    text: 'Analytics',
    icon: <Assessment />,
    path: '/analytics',
    description: 'Tableau de bord analytique',
  },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Main application layout component
 */
const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

  /**
   * Handle drawer toggle for mobile view
   */
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  /**
   * Handle navigation item click
   */
  const handleNavigationClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  /**
   * Check if current path is active
   */
  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  /**
   * Drawer content component
   */
  const DrawerContent = () => (
    <Box sx={{ overflow: 'auto' }}>
      {/* App Title */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <MusicNote sx={{ mr: 2, color: 'primary.main' }} />
        <Typography variant="h6" noWrap component="div">
          Ontologie Musicale
        </Typography>
      </Box>

      {/* Navigation List */}
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => handleNavigationClick(item.path)}
              selected={isActivePath(item.path)}
              sx={{
                borderRadius: 1,
                mx: 1,
                my: 0.5,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: isActivePath(item.path) ? 'inherit' : 'text.secondary',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                secondary={item.description}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: isActivePath(item.path) ? 600 : 400,
                }}
                secondaryTypographyProps={{
                  fontSize: '0.75rem',
                  color: isActivePath(item.path) ? 'inherit' : 'text.secondary',
                  sx: {
                    opacity: isActivePath(item.path) ? 0.8 : 0.6,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { lg: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { lg: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar>
          {/* Mobile menu button */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { lg: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* App title */}
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Ontologie des Instruments de Musique
          </Typography>

          {/* Additional header actions can be added here */}
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { lg: DRAWER_WIDTH }, flexShrink: { lg: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', lg: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
        >
          <DrawerContent />
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', lg: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
          open
        >
          <DrawerContent />
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { lg: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        {/* Toolbar spacer */}
        <Toolbar />
        
        {/* Page content */}
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;