/**
 * Error Message Component
 * 
 * A reusable error message component that displays error states
 * with consistent styling and optional retry functionality.
 */

import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Typography,
  AlertProps,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';

interface ErrorMessageProps extends Omit<AlertProps, 'severity'> {
  /**
   * Error title
   */
  title?: string;
  
  /**
   * Error message
   */
  message: string;
  
  /**
   * Whether to show retry button
   */
  showRetry?: boolean;
  
  /**
   * Retry button callback
   */
  onRetry?: () => void;
  
  /**
   * Retry button text
   */
  retryText?: string;
  
  /**
   * Error severity level
   */
  severity?: 'error' | 'warning' | 'info';
}

/**
 * Error message component with optional retry functionality
 */
const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'Erreur',
  message,
  showRetry = false,
  onRetry,
  retryText = 'Réessayer',
  severity = 'error',
  ...alertProps
}) => {
  return (
    <Alert
      severity={severity}
      sx={{
        borderRadius: 2,
        ...alertProps.sx,
      }}
      {...alertProps}
    >
      <AlertTitle>{title}</AlertTitle>
      <Typography variant="body2" sx={{ mb: showRetry ? 2 : 0 }}>
        {message}
      </Typography>
      
      {showRetry && onRetry && (
        <Box sx={{ mt: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Refresh />}
            onClick={onRetry}
            color={severity === 'error' ? 'error' : 'primary'}
          >
            {retryText}
          </Button>
        </Box>
      )}
    </Alert>
  );
};

export default ErrorMessage;