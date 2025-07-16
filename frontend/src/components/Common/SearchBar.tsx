/**
 * Search Bar Component
 * 
 * A reusable search bar component with auto-complete functionality
 * and customizable search behavior.
 */

import React, { useState, useEffect } from 'react';
import {
  Autocomplete,
  TextField,
  InputAdornment,
  CircularProgress,
  Box,
  Typography,
  Chip,
  Paper,
} from '@mui/material';
import { Search, Clear } from '@mui/icons-material';
import { searchApi, SearchResult } from '../../services/api';

interface SearchBarProps {
  /**
   * Placeholder text for the search input
   */
  placeholder?: string;
  
  /**
   * Whether to show the search icon
   */
  showSearchIcon?: boolean;
  
  /**
   * Whether to enable auto-complete
   */
  enableAutocomplete?: boolean;
  
  /**
   * Callback when search is performed
   */
  onSearch?: (query: string) => void;
  
  /**
   * Callback when search result is selected
   */
  onResultSelect?: (result: SearchResult) => void;
  
  /**
   * Initial search value
   */
  initialValue?: string;
  
  /**
   * Full width styling
   */
  fullWidth?: boolean;
  
  /**
   * Size variant
   */
  size?: 'small' | 'medium';
}

/**
 * Search bar component with auto-complete functionality
 */
const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Rechercher...',
  showSearchIcon = true,
  enableAutocomplete = true,
  onSearch,
  onResultSelect,
  initialValue = '',
  fullWidth = false,
  size = 'medium',
}) => {
  const [searchValue, setSearchValue] = useState(initialValue);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  /**
   * Debounced search function
   */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchValue.trim().length > 2 && enableAutocomplete) {
        performSearch(searchValue);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchValue, enableAutocomplete]);

  /**
   * Perform search using the API
   */
  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await searchApi.global(query);
      if (response.success) {
        setSearchResults(response.data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle search input change
   */
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchValue(value);
  };

  /**
   * Handle search form submission
   */
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (onSearch && searchValue.trim()) {
      onSearch(searchValue);
    }
  };

  /**
   * Handle autocomplete selection
   */
  const handleAutocompleteChange = (event: any, value: string | SearchResult | null) => {
    if (value && typeof value === 'object') {
      setSearchValue(value.name);
      if (onResultSelect) {
        onResultSelect(value);
      }
    }
  };

  /**
   * Handle clear search
   */
  const handleClear = () => {
    setSearchValue('');
    setSearchResults([]);
    if (onSearch) {
      onSearch('');
    }
  };

  /**
   * Get option label for autocomplete
   */
  const getOptionLabel = (option: string | SearchResult) => {
    if (typeof option === 'string') {
      return option;
    }
    return option.name || '';
  };

  /**
   * Render search option
   */
  const renderOption = (props: any, option: SearchResult) => (
    <Box component="li" {...props}>
      <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" fontWeight="medium">
            {option.name}
          </Typography>
          <Chip
            label={option.type}
            size="small"
            variant="outlined"
            sx={{ ml: 'auto' }}
          />
        </Box>
        {option.entity?.description && (
          <Typography variant="caption" color="text.secondary">
            {option.entity.description}
          </Typography>
        )}
      </Box>
    </Box>
  );

  if (enableAutocomplete) {
    return (
      <Autocomplete
        freeSolo
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        options={searchResults}
        getOptionLabel={getOptionLabel}
        renderOption={renderOption}
        loading={loading}
        onChange={handleAutocompleteChange}
        PaperComponent={({ children }) => (
          <Paper sx={{ borderRadius: 2 }}>{children}</Paper>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            value={searchValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            fullWidth={fullWidth}
            size={size}
            InputProps={{
              ...params.InputProps,
              startAdornment: showSearchIcon ? (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ) : undefined,
              endAdornment: (
                <>
                  {loading && <CircularProgress size={20} />}
                  {searchValue && (
                    <InputAdornment position="end">
                      <Clear
                        sx={{ cursor: 'pointer' }}
                        onClick={handleClear}
                        color="action"
                      />
                    </InputAdornment>
                  )}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <TextField
        value={searchValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        fullWidth={fullWidth}
        size={size}
        InputProps={{
          startAdornment: showSearchIcon ? (
            <InputAdornment position="start">
              <Search color="action" />
            </InputAdornment>
          ) : undefined,
          endAdornment: searchValue ? (
            <InputAdornment position="end">
              <Clear
                sx={{ cursor: 'pointer' }}
                onClick={handleClear}
                color="action"
              />
            </InputAdornment>
          ) : undefined,
        }}
      />
    </Box>
  );
};

export default SearchBar;