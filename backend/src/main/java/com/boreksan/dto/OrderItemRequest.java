package com.boreksan.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class OrderItemRequest {
    
    @NotNull(message = "Ürün ID'si gereklidir.")
    private Long productId;
    
    @NotNull(message = "Miktar gereklidir.")
    @Min(value = 1, message = "En az 1 tepsi sipariş vermelisiniz.")
    private Integer quantity; // Kaç Tepsi?
}