/**
 * Loading Spinner Component
 * 
 * A reusable loading spinner component that can be used throughout the application
 * to indicate loading states with various sizes and styling options.
 */

import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  BoxProps,
} from '@mui/material';

interface LoadingSpinnerProps extends BoxProps {
  /**
   * Size of the spinner
   */
  size?: number | 'small' | 'medium' | 'large';
  
  /**
   * Loading message to display
   */
  message?: string;
  
  /**
   * Whether to show the spinner inline or as overlay
   */
  overlay?: boolean;
  
  /**
   * Custom color for the spinner
   */
  color?: 'primary' | 'secondary' | 'inherit';
}

/**
 * Loading spinner component with optional message and overlay
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message = 'Chargement...',
  overlay = false,
  color = 'primary',
  ...boxProps
}) => {
  // Determine spinner size
  const getSpinnerSize = () => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'small':
        return 24;
      case 'large':
        return 60;
      default:
        return 40;
    }
  };

  // Base spinner content
  const spinnerContent = (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={2}
      {...boxProps}
    >
      <CircularProgress
        size={getSpinnerSize()}
        color={color}
        thickness={4}
      />
      {message && (
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
        >
          {message}
        </Typography>
      )}
    </Box>
  );

  // Return overlay version if requested
  if (overlay) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 9999,
        }}
      >
        {spinnerContent}
      </Box>
    );
  }

  return spinnerContent;
};

export default LoadingSpinner;