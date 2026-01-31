package com.boreksan.dto;

import lombok.Data;

@Data
public class OrderItemResponse {
    private String productName;  // Ürünün sadece adı yeterli
    private Integer quantity;    // Kaç tepsi?
    private Double unitPrice;    // Birim fiyatı
    private Double subTotal;     // Ara toplam (Adet * Fiyat)
}