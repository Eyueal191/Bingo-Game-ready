import React from 'react';
import PhoneInputLib from 'react-phone-number-input/max';
import 'react-phone-number-input/style.css';
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js/max';
import { Box, FormControl, FormHelperText, Typography } from '@mui/material';

/**
 * Premium Phone Input Component
 * Powered by react-phone-number-input — auto country flags, E.164 output.
 * Drop-in replacement preserving the same props interface.
 */
const PhoneInput = ({
  value,
  onChange,
  label = 'Phone Number',
  required = false,
  disabled = false,
  error = false,
  helperText = '',
  defaultCountry = 'ET',
  placeholder = 'Enter phone number',
  size = 'medium',
  fullWidth = true,
  onValidationChange = null,
  ...props
}) => {
  const handleChange = (phoneValue) => {
    onChange(phoneValue || '');

    if (onValidationChange) {
      if (!phoneValue) {
        onValidationChange({ isValid: false, isEmpty: true, phone: null, country: null });
        return;
      }

      const valid = isValidPhoneNumber(phoneValue || '');
      let country = null;
      try {
        const parsed = parsePhoneNumber(phoneValue);
        country = parsed?.country || null;
      } catch { /* ignore */ }

      onValidationChange({
        isValid: valid,
        isEmpty: false,
        phone: phoneValue,
        country,
        error: valid ? null : 'Invalid phone number',
      });
    }
  };

  const isInvalid = error || (value && !isValidPhoneNumber(value || ''));
  const isValid = value && isValidPhoneNumber(value || '');

  return (
    <FormControl fullWidth={fullWidth} error={isInvalid}>
      {label && (
        <Typography
          variant="body2"
          sx={{
            color: isInvalid
              ? 'var(--color-bingo-red)'
              : 'var(--color-bingo-muted)',
            fontSize: '0.85rem',
            mb: 0.5,
            fontWeight: 600,
          }}
        >
          {label} {required && '*'}
        </Typography>
      )}
      <Box
        sx={{
          '& .PhoneInput': {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          },
          '& .PhoneInputCountry': {
            display: 'flex',
            alignItems: 'center',
            padding: '12px 8px 12px 14px',
            bgcolor: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '16px 0 0 16px',
            border: '1px solid',
            borderRight: 'none',
            borderColor: isInvalid
              ? 'var(--color-bingo-red)'
              : 'rgba(255, 255, 255, 0.15)',
            cursor: disabled ? 'default' : 'pointer',
            transition: 'border-color 0.2s ease',
            '&:hover': {
              borderColor: disabled
                ? 'rgba(255, 255, 255, 0.15)'
                : 'rgba(255, 255, 255, 0.25)',
            },
          },
          '& .PhoneInputCountrySelect': {
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: '100%',
            zIndex: 1,
            border: 0,
            opacity: 0,
            cursor: disabled ? 'default' : 'pointer',
          },
          '& .PhoneInputCountryIcon': {
            width: '24px',
            height: '18px',
          },
          '& .PhoneInputCountryIcon--border': {
            boxShadow: 'none',
          },
          '& .PhoneInputCountrySelectArrow': {
            display: 'block',
            width: '6px',
            height: '6px',
            marginLeft: '4px',
            borderStyle: 'solid',
            borderColor: 'var(--color-bingo-muted)',
            borderTopWidth: 0,
            borderBottomWidth: '1.5px',
            borderLeftWidth: 0,
            borderRightWidth: '1.5px',
            transform: 'rotate(45deg)',
            opacity: 0.6,
          },
          '& .PhoneInputInput': {
            flex: 1,
            padding: size === 'small' ? '10px 14px' : '14px 14px',
            fontSize: '1rem',
            fontFamily: 'inherit',
            color: 'var(--color-bingo-white)',
            bgcolor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid',
            borderLeft: 'none',
            borderColor: isInvalid
              ? 'var(--color-bingo-red)'
              : 'rgba(255, 255, 255, 0.15)',
            borderRadius: '0 16px 16px 0',
            outline: 'none',
            transition: 'border-color 0.2s ease',
            '&:hover': {
              borderColor: disabled
                ? 'rgba(255, 255, 255, 0.15)'
                : 'rgba(255, 255, 255, 0.25)',
            },
            '&:focus': {
              borderColor: isInvalid
                ? 'var(--color-bingo-red)'
                : 'var(--color-bingo-green)',
            },
            '&::placeholder': {
              color: 'rgba(255, 255, 255, 0.35)',
            },
          },
        }}
      >
        <PhoneInputLib
          international
          defaultCountry={defaultCountry}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          {...props}
        />
      </Box>
      <FormHelperText
        sx={{
          color: isInvalid
            ? 'var(--color-bingo-red)'
            : isValid
              ? 'var(--color-bingo-green)'
              : 'var(--color-bingo-muted)',
          fontWeight: 500,
          fontSize: '0.78rem',
          mt: 0.5,
        }}
      >
        {helperText ||
          (isInvalid && value ? 'Please enter a valid phone number' : '') ||
          (isValid ? '✓ Valid phone number' : '')}
      </FormHelperText>
    </FormControl>
  );
};

export default PhoneInput;
