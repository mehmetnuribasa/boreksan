package com.boreksan.exception;

public class OrderTimeLimitException extends RuntimeException {
    public OrderTimeLimitException(String message) {
        super(message);
    }
}