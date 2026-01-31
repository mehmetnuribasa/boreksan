package com.boreksan.entity.enums;

public enum OrderStatus {
    WAITING,    // Onay Bekliyor
    PREPARING,  // Hazırlanıyor
    ON_WAY,     // Yolda
    DELIVERED,  // Teslim Edildi
    CANCELLED   // İptal
}