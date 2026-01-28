package com.boreksan.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // 1. ÖZEL DURUM: Sadece ürün bulunamadığında burası çalışır (404)
    @ExceptionHandler(ProductNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleProductNotFound(ProductNotFoundException e) {
        Map<String, String> response = new HashMap<>();
        response.put("message", e.getMessage());
        response.put("error_code", "PRODUCT_NOT_FOUND");
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    // 2. GENEL DURUM: Diğer tüm patlamalar (NullPointer vs) buraya düşer (500)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneralException(Exception e) {
        Map<String, String> response = new HashMap<>();
        response.put("message", "An unexpected error occurred.");
        response.put("details", e.getMessage());
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 2.1. LOGIN HATALARI: Yanlış username / şifre (401)
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, String>> handleBadCredentials(BadCredentialsException e) {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Invalid username or password");
        response.put("error_code", "BAD_CREDENTIALS");
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    // 3. VALIDATION HATALARI: @Valid patladığında burası devreye girer (400)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();

        // Hatanın içindeki tüm alanları gez (name, price vs.)
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField(); // Hata veren alan (örn: name)
            String errorMessage = error.getDefaultMessage(); // Bizim yazdığımız mesaj (örn: Boş olamaz)
            errors.put(fieldName, errorMessage);
        });

        return new ResponseEntity<>(errors, HttpStatus.BAD_REQUEST);
    }

    // 4. INVALID TOKEN: Token geçersiz veya süresi dolmuş (401)
    @ExceptionHandler(InvalidTokenException.class)
    public ResponseEntity<Map<String, String>> handleInvalidTokenException(InvalidTokenException e) {
        Map<String, String> response = new HashMap<>();
        response.put("message", e.getMessage());
        response.put("error_code", "INVALID_TOKEN");
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    // 5. USERNAME ALREADY EXISTS: Aynı username ile tekrar kayıt (409)
    @ExceptionHandler(UsernameAlreadyExistsException.class)
    public ResponseEntity<Map<String, String>> handleUsernameAlreadyExists(UsernameAlreadyExistsException e) {
        Map<String, String> response = new HashMap<>();
        response.put("message", e.getMessage());
        response.put("error_code", "USERNAME_TAKEN");
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    // 6. DB CONSTRAINT: Beklenmeyen unique violation vb. (409) - fallback
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDataIntegrityViolation(DataIntegrityViolationException e) {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Data integrity violation.");
        response.put("error_code", "DATA_INTEGRITY_VIOLATION");
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }
}