package com.boreksan.exception;

// Bu bizim kendi özel hatamız.
// RuntimeException'dan miras alıyor ki Java bunu hata olarak tanısın.
public class ProductNotFoundException extends RuntimeException {
    public ProductNotFoundException(String message) {
        super(message);
    }
}