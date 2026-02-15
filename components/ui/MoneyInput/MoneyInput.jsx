'use client';
import { useState, useEffect, useRef } from 'react';
import styles from './MoneyInput.module.css';

export default function MoneyInput({ 
  value, 
  onChange, 
  placeholder = '0', 
  label, 
  disabled = false,
  error = false,
  required = false 
}) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isFocused) {
      // أثناء التركيز: عرض الرقم بدون فواصل
      if (value === '' || value === null || value === undefined) {
        setDisplayValue('');
      } else {
        setDisplayValue(value.toString());
      }
    } else {
      // عند فقدان التركيز: عرض الرقم مع فواصل
      if (value === '' || value === null || value === undefined) {
        setDisplayValue('');
      } else {
        const numValue = Number(value);
        if (!isNaN(numValue) && numValue >= 0) {
          setDisplayValue(numValue.toLocaleString('en-US'));
        } else {
          setDisplayValue(value.toString());
        }
      }
    }
  }, [value, isFocused]);

  const handleChange = (e) => {
    const inputValue = e.target.value.replace(/,/g, '').replace(/[^0-9.]/g, '');
    
    if (inputValue === '') {
      onChange('');
      setDisplayValue('');
      return;
    }

    // السماح فقط بالأرقام
    const numValue = Number(inputValue);
    if (!isNaN(numValue) && numValue >= 0) {
      onChange(numValue);
      setDisplayValue(inputValue);
    }
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    // عند التركيز: عرض الرقم بدون فواصل للكتابة السهلة
    if (value !== '' && value !== null && value !== undefined) {
      setDisplayValue(value.toString());
      // تحديد موضع المؤشر في النهاية
      setTimeout(() => {
        e.target.setSelectionRange(e.target.value.length, e.target.value.length);
      }, 0);
    }
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    // عند فقدان التركيز: تنسيق الرقم مع فواصل
    const inputValue = e.target.value.replace(/,/g, '');
    const numValue = Number(inputValue);
    if (!isNaN(numValue) && numValue >= 0) {
      onChange(numValue);
      setDisplayValue(numValue.toLocaleString('en-US'));
    } else if (inputValue === '') {
      setDisplayValue('');
    }
  };

  return (
    <div className={styles.inputContainer}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={`${styles.inputWrapper} ${error ? styles.error : ''} ${disabled ? styles.disabled : ''}`}>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={styles.input}
          dir="ltr"
          style={{ textAlign: 'left' }}
        />
        <span className={styles.currency}>جنيه</span>
      </div>
      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
}

